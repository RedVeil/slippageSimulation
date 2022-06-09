// SPDX-License-Identifier: GPL-3.0
// Docgen-SOLC: 0.8.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IFourXBatchProcessing } from "../../interfaces/IFourXBatchProcessing.sol";
import { BatchType, IAbstractBatchStorage } from "../../interfaces/IBatchStorage.sol";
import "../../../externals/interfaces/Curve3Pool.sol";
import "../../interfaces/IContractRegistry.sol";

/*
 * This Contract allows user to use and receive stablecoins directly when interacting with ButterBatchProcessing.
 * This contract mainly takes stablecoins swaps them into 3CRV and deposits them or the other way around.
 */
contract FourXZapper {
  using SafeERC20 for IERC20;

  /* ========== STATE VARIABLES ========== */

  IContractRegistry private contractRegistry;
  Curve3Pool private threePool;
  IERC20[3] public token; // [dai,usdc,usdt]

  /* ========== EVENTS ========== */

  event ZappedIntoBatch(uint256 outputAmount, address account);
  event ZappedOutOfBatch(
    bytes32 batchId,
    int128 stableCoinIndex,
    uint256 inputAmount,
    uint256 outputAmount,
    address account
  );
  event ClaimedIntoStable(
    bytes32 batchId,
    int128 stableCoinIndex,
    uint256 inputAmount,
    uint256 outputAmount,
    address account
  );

  /* ========== CONSTRUCTOR ========== */

  constructor(
    IContractRegistry _contractRegistry,
    Curve3Pool _threePool,
    IERC20[3] memory _token
  ) {
    contractRegistry = _contractRegistry;
    threePool = _threePool;
    token = _token;

    _setApprovals();
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  /**
   * @notice zapIntoBatch allows a user to deposit into a mintBatch directly with sUSD,USDC or USDT
   * @param _amount Input Amount
   * @param _i Index of inputToken
   * @param _j Index of outputToken
   * @param _min_amount The min amount of DAI which should be minted by the sUSD-Pool (slippage control)
   * @dev The amounts in _amounts must align with their index in the sUSD-Pool
   */
  function zapIntoBatch(
    uint256 _amount,
    int128 _i,
    int128 _j,
    uint256 _min_amount // todo add instamint/redeem bool arg which calls batchMint()
  ) external {
    IFourXBatchProcessing butterBatchProcessing = IFourXBatchProcessing(
      contractRegistry.getContract(keccak256("FourXBatchProcessing"))
    );

    token[uint256(uint128(_i))].safeTransferFrom(msg.sender, address(this), _amount);

    uint256 stableBalance = _swapStables(_i, _j, _amount);

    require(stableBalance >= _min_amount, "slippage too high");

    // Deposit Dai in current mint batch
    butterBatchProcessing.depositForMint(stableBalance, msg.sender);
    emit ZappedIntoBatch(stableBalance, msg.sender);
  }

  /**
   * @notice zapOutOfBatch allows a user to retrieve their not yet processed Dai and directly receive stablecoins
   * @param _batchId Defines which batch gets withdrawn from
   * @param _amountToWithdraw Dai amount that shall be withdrawn
   * @param _i Index of inputToken
   * @param _j Index of outputToken
   * @param _min_amount The min amount of stables which should be returned by the sUSD-Pool (slippage control)
   * @dev The _stableCoinIndex must align with the index in the curve sUSD-Pool
   */
  function zapOutOfBatch(
    bytes32 _batchId,
    uint256 _amountToWithdraw,
    int128 _i,
    int128 _j,
    uint256 _min_amount
  ) external {
    IFourXBatchProcessing butterBatchProcessing = IFourXBatchProcessing(
      contractRegistry.getContract(keccak256("FourXBatchProcessing"))
    );

    IAbstractBatchStorage batchStorage = butterBatchProcessing.batchStorage();

    require(batchStorage.getBatchType(_batchId) == BatchType.Mint, "!mint");

    uint256 withdrawnAmount = butterBatchProcessing.withdrawFromBatch(
      _batchId,
      _amountToWithdraw,
      msg.sender,
      address(this)
    );

    uint256 stableBalance = _swapStables(_i, _j, withdrawnAmount);

    require(stableBalance >= _min_amount, "slippage too high");

    token[uint256(uint128(_j))].safeTransfer(msg.sender, stableBalance);

    emit ZappedOutOfBatch(_batchId, _j, withdrawnAmount, stableBalance, msg.sender);
  }

  /**
   * @notice claimAndSwapToStable allows a user to claim their processed sUSD from a redeemBatch and directly receive stablecoins
   * @param _batchId Defines which batch gets withdrawn from
   * @param _i Index of inputToken
   * @param _j Index of outputToken
   * @param _min_amount The min amount of stables which should be returned by the sUSD-Pool (slippage control)
   * @dev The _stableCoinIndex must align with the index in the sUSD-Pool
   */
  function claimAndSwapToStable(
    bytes32 _batchId,
    int128 _i,
    int128 _j,
    uint256 _min_amount
  ) external {
    IFourXBatchProcessing butterBatchProcessing = IFourXBatchProcessing(
      contractRegistry.getContract(keccak256("FourXBatchProcessing"))
    );
    IAbstractBatchStorage batchStorage = butterBatchProcessing.batchStorage();

    require(batchStorage.getBatchType(_batchId) == BatchType.Redeem, "!redeem");

    uint256 inputAmount = butterBatchProcessing.claim(_batchId, msg.sender);
    uint256 stableBalance = _swapStables(_i, _j, inputAmount);

    require(stableBalance >= _min_amount, "slippage too high");

    token[uint256(uint128(_j))].safeTransfer(msg.sender, stableBalance);

    emit ClaimedIntoStable(_batchId, _j, inputAmount, stableBalance, msg.sender);
  }

  function _swapStables(
    int128 _fromIndex,
    int128 _toIndex,
    uint256 _inputAmount
  ) internal returns (uint256) {
    threePool.exchange(_fromIndex, _toIndex, _inputAmount, 0);
    return token[uint256(uint128(_toIndex))].balanceOf(address(this));
  }

  /**
   * @notice set idempotent approvals for 3pool and butter batch processing
   */
  function _setApprovals() internal {
    for (uint256 i; i < token.length; i++) {
      token[i].safeApprove(address(threePool), type(uint256).max);
      token[i].safeApprove(contractRegistry.getContract(keccak256("FourXBatchProcessing")), type(uint256).max);
    }
  }
}
