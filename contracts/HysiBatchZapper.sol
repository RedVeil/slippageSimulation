// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {BatchType, Batch, IHysiBatchInteraction} from "./Interfaces/IHysiBatchInteraction.sol";
import "./Interfaces/Integrations/Curve3Pool.sol";

/*
This Contract allows user to use and receive stablecoins directly when interacting with HysiBatchInteraction.
This contract mainly takes stablecoins swaps them into 3CRV and deposits them or the other way around.
 */
contract HysiBatchZapper {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  /* ========== STATE VARIABLES ========== */

  IHysiBatchInteraction private hysiBatchInteraction;
  Curve3Pool private curve3Pool;
  IERC20 private threeCrv;

  /* ========== EVENTS ========== */

  event ZappedIntoBatch(uint256 threeCurveAmount, address account);
  event ZappedOutOfBatch(
    bytes32 batchId,
    uint8 stableCoinIndex,
    uint256 threeCurveAmount,
    uint256 stableCoinAmount,
    address account
  );
  event ClaimedIntoStable(
    bytes32 batchId,
    uint8 stableCoinIndex,
    uint256 threeCurveAmount,
    uint256 stableCoinAmount,
    address account
  );

  /* ========== CONSTRUCTOR ========== */

  constructor(
    IHysiBatchInteraction hysiBatchInteraction_,
    Curve3Pool curve3Pool_,
    IERC20 threeCrv_
  ) {
    hysiBatchInteraction = hysiBatchInteraction_;
    curve3Pool = curve3Pool_;
    threeCrv = threeCrv_;
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  /**
   * @notice zapIntoBatch allows a user to deposit into a mintBatch directly with stablecoins
   * @param amounts_ An array of amounts in stablecoins the user wants to deposit
   * @param min_mint_amounts_ The min amount of 3CRV which should be minted by the curve three-pool (slippage control)
   * @dev The amounts in amounts_ must align with their index in the curve three-pool
   */
  function zapIntoBatch(uint256[3] memory amounts_, uint256 min_mint_amounts_)
    external
  {
    for (uint8 i; i < amounts_.length; i++) {
      if (amounts_[i] > 0) {
        //Deposit Stables
        IERC20(curve3Pool.coins(i)).safeTransferFrom(
          msg.sender,
          address(this),
          amounts_[0]
        );
        //Allow Stables for user in curve three-pool
        IERC20(curve3Pool.coins(i)).safeIncreaseAllowance(
          address(curve3Pool),
          amounts_[0]
        );
      }
    }
    //Deposit stables to receive 3CRV
    curve3Pool.add_liquidity(amounts_, min_mint_amounts_);

    //Check the amount of returned 3CRV
    /*
    While curves metapools return the amount of minted 3CRV this is not possible with the three-pool which is why we simply have to check our balance after depositing our stables.
    If a user sends 3CRV to this contract by accident (Which cant be retrieved anyway) they will be used aswell.
    */
    uint256 threeCrvAmount = threeCrv.balanceOf(address(this));

    //Allow hysiBatchInteraction to use 3CRV
    threeCrv.safeIncreaseAllowance(
      address(hysiBatchInteraction),
      threeCrvAmount
    );

    //Deposit 3CRV in current mint batch
    hysiBatchInteraction.depositForMint(threeCrvAmount, msg.sender);
    emit ZappedIntoBatch(threeCrvAmount, msg.sender);
  }

  /**
   * @notice zapOutOfBatch allows a user to retrieve their not yet processed 3CRV and directly receive stablecoins
   * @param batchId_ Defines which batch gets withdrawn from
   * @param amountToWithdraw_ 3CRV amount that shall be withdrawn
   * @param stableCoinIndex_ Defines which stablecoin the user wants to receive
   * @param min_amount_ The min amount of stables which should be returned by the curve three-pool (slippage control)
   * @dev The stableCoinIndex_ must align with the index in the curve three-pool
   */
  function zapOutOfBatch(
    bytes32 batchId_,
    uint256 amountToWithdraw_,
    uint8 stableCoinIndex_,
    uint256 min_amount_
  ) external {
    // Allows the zapepr to withdraw 3CRV from batch for the user
    hysiBatchInteraction.withdrawFromBatch(
      batchId_,
      amountToWithdraw_,
      msg.sender
    );

    //Burns 3CRV for stables and sends them to the user
    //stableBalance is only returned for the event
    uint256 stableBalance = _swapAndTransfer3Crv(
      amountToWithdraw_,
      stableCoinIndex_,
      min_amount_
    );

    emit ZappedOutOfBatch(
      batchId_,
      stableCoinIndex_,
      amountToWithdraw_,
      stableBalance,
      msg.sender
    );
  }

  /**
   * @notice claimAndSwapToStable allows a user to claim their processed 3CRV from a redeemBatch and directly receive stablecoins
   * @param batchId_ Defines which batch gets withdrawn from
   * @param stableCoinIndex_ Defines which stablecoin the user wants to receive
   * @param min_amount_ The min amount of stables which should be returned by the curve three-pool (slippage control)
   * @dev The stableCoinIndex_ must align with the index in the curve three-pool
   */
  function claimAndSwapToStable(
    bytes32 batchId_,
    uint8 stableCoinIndex_,
    uint256 min_amount_
  ) external {
    //We can only deposit 3CRV which come from mintBatches otherwise this could claim HYSI which we cant process here
    require(
      hysiBatchInteraction.batches(batchId_).batchType == BatchType.Redeem,
      "needs to return 3crv"
    );

    //Zapper claims 3CRV for the user
    uint256 threeCurveAmount = hysiBatchInteraction.claim(batchId_, msg.sender);

    //Burns 3CRV for stables and sends them to the user
    //stableBalance is only returned for the event
    uint256 stableBalance = _swapAndTransfer3Crv(
      threeCurveAmount,
      stableCoinIndex_,
      min_amount_
    );

    emit ClaimedIntoStable(
      batchId_,
      stableCoinIndex_,
      threeCurveAmount,
      stableBalance,
      msg.sender
    );
  }

  /**
   * @notice _swapAndTransfer3Crv burns 3CRV and sends the returned stables to the user
   * @param threeCurveAmount_ How many 3CRV shall be burned
   * @param stableCoinIndex_ Defines which stablecoin the user wants to receive
   * @param min_amount_ The min amount of stables which should be returned by the curve three-pool (slippage control)
   * @dev The stableCoinIndex_ must align with the index in the curve three-pool
   */
  function _swapAndTransfer3Crv(
    uint256 threeCurveAmount_,
    uint8 stableCoinIndex_,
    uint256 min_amount_
  ) internal returns (uint256) {
    //Allow curve three-pool to use 3CRV
    threeCrv.safeIncreaseAllowance(address(curve3Pool), threeCurveAmount_);

    //Burn 3CRV to receive stables
    curve3Pool.remove_liquidity_one_coin(
      threeCurveAmount_,
      stableCoinIndex_,
      min_amount_
    );

    //Check the amount of returned stables
    /*
    If a user sends Stables to this contract by accident (Which cant be retrieved anyway) they will be used aswell.
    */
    uint256 stableBalance = IERC20(curve3Pool.coins(stableCoinIndex_))
      .balanceOf(address(this));

    //Transfer stables to user
    IERC20(curve3Pool.coins(stableCoinIndex_)).safeTransfer(
      msg.sender,
      stableBalance
    );

    //Return stablebalance for event
    return stableBalance;
  }
}
