// SPDX-License-Identifier: GPL-3.0
// Docgen-SOLC: 0.8.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../../utils/ContractRegistryAccess.sol";
import "../../utils/ACLAuth.sol";
import "../../../externals/interfaces/YearnVault.sol";
import "../../../externals/interfaces/BasicIssuanceModule.sol";
import "../../../externals/interfaces/ISetToken.sol";
import "../../../externals/interfaces/CurveContracts.sol";
import "../../../externals/interfaces/Curve3Pool.sol";

/*
 * @notice This contract allows users to mint and redeem Butter for using 3CRV, DAI, USDC, USDT
 * The Butter is created from several different yTokens which in turn need each a deposit of a crvLPToken.
 */
contract ButterWhaleProcessing is Pausable, ReentrancyGuard, ACLAuth, ContractRegistryAccess {
  using SafeERC20 for YearnVault;
  using SafeERC20 for ISetToken;
  using SafeERC20 for IERC20;

  /**
   * @param curveMetaPool A CurveMetaPool for trading an exotic stablecoin against 3CRV
   * @param crvLPToken The LP-Token of the CurveMetapool
   */
  struct CurvePoolTokenPair {
    CurveMetapool curveMetaPool;
    IERC20 crvLPToken;
  }

  /* ========== STATE VARIABLES ========== */

  bytes32 public immutable contractName = "ButterWhaleProcessing";

  ISetToken public setToken;
  IERC20 public threeCrv;
  Curve3Pool private curve3Pool;
  BasicIssuanceModule public setBasicIssuanceModule;
  mapping(address => CurvePoolTokenPair) public curvePoolTokenPairs;

  /* ========== EVENTS ========== */
  event Minted(address account, uint256 amount);
  event Redeemed(address account, uint256 amount);
  event ZapMinted(address account, uint256 mintAmount);
  event ZapRedeemed(address account, uint256 redeemAmount);

  event CurveTokenPairsUpdated(address[] yTokenAddresses, CurvePoolTokenPair[] curveTokenPairs);

  /* ========== CONSTRUCTOR ========== */

  constructor(
    IContractRegistry _contractRegistry,
    ISetToken _setToken,
    IERC20 _threeCrv,
    Curve3Pool _curve3Pool,
    BasicIssuanceModule _basicIssuanceModule,
    address[] memory _yTokenAddresses,
    CurvePoolTokenPair[] memory _curvePoolTokenPairs
  ) ContractRegistryAccess(_contractRegistry) {
    setToken = _setToken;
    threeCrv = _threeCrv;
    curve3Pool = _curve3Pool;
    setBasicIssuanceModule = _basicIssuanceModule;

    _setCurvePoolTokenPairs(_yTokenAddresses, _curvePoolTokenPairs);
  }

  /* ========== VIEW FUNCTIONS ========== */


  /* ========== MUTATIVE FUNCTIONS ========== */

  /**
   * @notice Mint Butter token with deposited 3CRV. This function goes through all the steps necessary to mint an optimal amount of Butter
   * @param _amount Amount of 3cr3CRV to use for minting
   * @param _minAmountToMint The expected min amount of hysi to mint. If hysiAmount is lower than minAmountToMint_ the transaction will revert.
   * @dev This function deposits 3CRV in the underlying Metapool and deposits these LP token to get yToken which in turn are used to mint Butter
   */
  function mint(uint256 _amount, uint256 _minAmountToMint) external whenNotPaused {
    require(threeCrv.balanceOf(msg.sender) >= _amount, "insufficent balance");
    threeCrv.transferFrom(msg.sender, address(this), _amount);
    _mint(_amount, _minAmountToMint);
    emit Minted(msg.sender, _amount);
  }

  /**
   * @notice Redeems Butter for 3CRV. This function goes through all the steps necessary to get 3CRV
   * @param _amount amount of Butter to be redeemed
   * @param _min3crvToReceive sets minimum amount of 3crv to redeem Butter for, otherwise the transaction will revert
   * @dev This function reedeems Butter for the underlying yToken and deposits these yToken in curve Metapools for 3CRV
   */
  function redeem(uint256 _amount, uint256 _min3crvToReceive) external whenNotPaused {
    uint256 claimableTokenBalance = _redeem(_amount, _min3crvToReceive);
    threeCrv.safeTransfer(msg.sender, claimableTokenBalance);
    emit Redeemed(msg.sender, _amount);
  }

  /**
   * @notice zapMint allows a user to mint Butter directly with stablecoins
   * @param _amounts An array of amounts in stablecoins the user wants to deposit
   * @param _min_3crv_amount The min amount of 3CRV which should be minted by the curve three-pool (slippage control)
   * @param _minAmountToMint The expected min amount of hysi to mint. If hysiAmount is lower than minAmountToMint_ the transaction will revert.
   * @dev The amounts in _amounts must align with their index in the curve three-pool
   */
  function zapMint(
    uint256[3] memory _amounts,
    uint256 _min_3crv_amount,
    uint256 _minAmountToMint
  ) external whenNotPaused {
    for (uint8 i; i < _amounts.length; i++) {
      if (_amounts[i] > 0) {
        //Deposit Stables
        IERC20(curve3Pool.coins(i)).safeTransferFrom(msg.sender, address(this), _amounts[i]);
      }
    }
    //Deposit stables to receive 3CRV
    curve3Pool.add_liquidity(_amounts, _min_3crv_amount);

    //Check the amount of returned 3CRV
    /*
    While curves metapools return the amount of minted 3CRV this is not possible with the three-pool which is why we simply have to check our balance after depositing our stables.
    If a user sends 3CRV to this contract by accident (Which cant be retrieved anyway) they will be used aswell.
    */
    uint256 threeCrvAmount = threeCrv.balanceOf(address(this));
    _mint(threeCrvAmount, _minAmountToMint);
    emit ZapMinted(msg.sender, threeCrvAmount);
  }

  /**
   * @notice zapRedeem allows a user to claim their processed 3CRV from a redeemBatch and directly receive stablecoins
   * @param _amount amount of Butter to be redeemed
   * @param _stableCoinIndex Defines which stablecoin the user wants to receive
   * @param _min_stable_amount The min amount of stables which should be returned by the curve three-pool (slippage control)
   * @param _min3crvToReceive sets minimum amount of 3crv to redeem Butter for, otherwise the transaction will revert
   * @dev The _stableCoinIndex must align with the index in the curve three-pool
   */
  function zapRedeem(
    uint256 _amount,
    uint128 _stableCoinIndex,
    uint256 _min_stable_amount,
    uint256 _min3crvToReceive
  ) external whenNotPaused {
    uint256 claimableTokenBalance = _redeem(_amount, _min3crvToReceive);
    _swapAndTransfer3Crv(claimableTokenBalance, _stableCoinIndex, _min_stable_amount);
    emit ZapRedeemed(msg.sender, _amount);
  }

  /**
   * @notice sets approval for contracts that require access to assets held by this contract
   */
  function setApprovals() external {
    (address[] memory tokenAddresses, ) = setBasicIssuanceModule.getRequiredComponentUnitsForIssue(setToken, 1e18);

    for (uint256 i; i < tokenAddresses.length; i++) {
      IERC20 curveLpToken = curvePoolTokenPairs[tokenAddresses[i]].crvLPToken;
      CurveMetapool curveMetapool = curvePoolTokenPairs[tokenAddresses[i]].curveMetaPool;
      YearnVault yearnVault = YearnVault(tokenAddresses[i]);

      threeCrv.safeApprove(address(curveMetapool), 0);
      threeCrv.safeApprove(address(curveMetapool), type(uint256).max);

      curveLpToken.safeApprove(address(yearnVault), 0);
      curveLpToken.safeApprove(address(yearnVault), type(uint256).max);

      curveLpToken.safeApprove(address(curveMetapool), 0);
      curveLpToken.safeApprove(address(curveMetapool), type(uint256).max);

      IERC20(curve3Pool.coins(0)).safeApprove(address(curve3Pool), 0);
      IERC20(curve3Pool.coins(0)).safeApprove(address(curve3Pool), type(uint256).max);

      IERC20(curve3Pool.coins(1)).safeApprove(address(curve3Pool), 0);
      IERC20(curve3Pool.coins(1)).safeApprove(address(curve3Pool), type(uint256).max);

      IERC20(curve3Pool.coins(2)).safeApprove(address(curve3Pool), 0);
      IERC20(curve3Pool.coins(2)).safeApprove(address(curve3Pool), type(uint256).max);

      threeCrv.safeApprove(address(curve3Pool), 0);
      threeCrv.safeApprove(address(curve3Pool), type(uint256).max);
    }
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  function _mint(uint256 _amount, uint256 _minAmountToMint) internal {
    //Get the quantity of yToken for one Butter
    (address[] memory tokenAddresses, uint256[] memory quantities) = setBasicIssuanceModule
      .getRequiredComponentUnitsForIssue(setToken, 1e18);

    uint256[] memory quantitiesInVirtualPrice = new uint256[](quantities.length);

    uint256 virtualPrice = curve3Pool.get_virtual_price();

    uint256 butterInVirtualPrice;

    for (uint256 i; i < tokenAddresses.length; i++) {
      //Calculate the virtual price of one yToken
      uint256 yTokenInVirtualPrice = (YearnVault(tokenAddresses[i]).pricePerShare() * curvePoolTokenPairs[tokenAddresses[i]].curveMetaPool.get_virtual_price()) / 1e18;

      uint256 quantityInVirtualPrice = (quantities[i] * yTokenInVirtualPrice) / 1e18;
      butterInVirtualPrice += quantityInVirtualPrice;
      quantitiesInVirtualPrice[i] = quantityInVirtualPrice;
    }

    for (uint256 i; i < tokenAddresses.length; i++) {
      //Calculate the pool allocation by dividing the suppliedTokenBalance by number of token addresses and take leftovers into account
      uint256 ratio = (butterInVirtualPrice * 1e18) / quantitiesInVirtualPrice[i];

      uint256 poolAllocation = (((_amount * 1e18) / ratio) * 1e18) / virtualPrice;

      //Pool 3CRV to get crvLPToken
      _sendToCurve(poolAllocation, curvePoolTokenPairs[tokenAddresses[i]].curveMetaPool);

      //Deposit crvLPToken to get yToken
      _sendToYearn(
        curvePoolTokenPairs[tokenAddresses[i]].crvLPToken.balanceOf(address(this)),
        YearnVault(tokenAddresses[i])
      );

      //Approve yToken for minting
      YearnVault(tokenAddresses[i]).safeIncreaseAllowance(
        address(setBasicIssuanceModule),
        YearnVault(tokenAddresses[i]).balanceOf(address(this))
      );
    }

    //Get the minimum amount of hysi that we can mint with our balances of yToken
    uint256 hysiAmount = (YearnVault(tokenAddresses[0]).balanceOf(address(this)) * 1e18) / quantities[0];

    for (uint256 i = 1; i < tokenAddresses.length; i++) {
      hysiAmount = Math.min(
        hysiAmount,
        (YearnVault(tokenAddresses[i]).balanceOf(address(this)) * 1e18) / quantities[i]
      );
    }

    require(hysiAmount >= _minAmountToMint, "slippage too high");

    //Mint Butter
    setBasicIssuanceModule.issue(setToken, hysiAmount, msg.sender);
  }

  function _redeem(uint256 _amount, uint256 _min3crvToReceive) internal returns (uint256) {
    require(setToken.balanceOf(msg.sender) >= _amount, "insufficient balance");
    setToken.transferFrom(msg.sender, address(this), _amount);

    //Get tokenAddresses for mapping of underlying
    (address[] memory tokenAddresses, ) = setBasicIssuanceModule.getRequiredComponentUnitsForIssue(setToken, 1e18);

    //Allow setBasicIssuanceModule to use Butter
    _setBasicIssuanceModuleAllowance(_amount);
    //Redeem Butter for yToken
    setBasicIssuanceModule.redeem(setToken, _amount, address(this));

    //Check our balance of 3CRV since we could have some still around from previous batches
    uint256 oldBalance = threeCrv.balanceOf(address(this));

    for (uint256 i; i < tokenAddresses.length; i++) {
      //Deposit yToken to receive crvLPToken
      _withdrawFromYearn(YearnVault(tokenAddresses[i]).balanceOf(address(this)), YearnVault(tokenAddresses[i]));

      uint256 crvLPTokenBalance = curvePoolTokenPairs[tokenAddresses[i]].crvLPToken.balanceOf(address(this));

      //Deposit crvLPToken to receive 3CRV
      _withdrawFromCurve(crvLPTokenBalance, curvePoolTokenPairs[tokenAddresses[i]].curveMetaPool);
    }

    //Save the redeemed amount of 3CRV as claimable token for the batch
    uint256 claimableTokenBalance = threeCrv.balanceOf(address(this)) - oldBalance;

    require(claimableTokenBalance >= _min3crvToReceive, "slippage too high");
    return claimableTokenBalance;
  }

  /**
   * @notice _swapAndTransfer3Crv burns 3CRV and sends the returned stables to the user
   * @param _threeCurveAmount How many 3CRV shall be burned
   * @param _stableCoinIndex Defines which stablecoin the user wants to receive
   * @param _min_amount The min amount of stables which should be returned by the curve three-pool (slippage control)
   * @dev The stableCoinIndex_ must align with the index in the curve three-pool
   */
  function _swapAndTransfer3Crv(
    uint256 _threeCurveAmount,
    uint128 _stableCoinIndex,
    uint256 _min_amount
  ) internal {
    //Burn 3CRV to receive stables
    curve3Pool.remove_liquidity_one_coin(_threeCurveAmount, int128(_stableCoinIndex), _min_amount);

    //Check the amount of returned stables
    /*
    If a user sends Stables to this contract by accident (Which cant be retrieved anyway) they will be used aswell.
    */
    uint256 stableBalance = IERC20(curve3Pool.coins(_stableCoinIndex)).balanceOf(address(this));

    //Transfer stables to user
    IERC20(curve3Pool.coins(_stableCoinIndex)).safeTransfer(msg.sender, stableBalance);
  }

  /**
   * @notice sets allowance for basic issuance module
   * @param _amount amount to approve
   */
  function _setBasicIssuanceModuleAllowance(uint256 _amount) internal {
    setToken.safeApprove(address(setBasicIssuanceModule), 0);
    setToken.safeApprove(address(setBasicIssuanceModule), _amount);
  }

  /**
   * @notice Deposit 3CRV in a curve metapool for its LP-Token
   * @param _amount The amount of 3CRV that gets deposited
   * @param _curveMetapool The metapool where we want to provide liquidity
   */
  function _sendToCurve(uint256 _amount, CurveMetapool _curveMetapool) internal {
    //Takes 3CRV and sends lpToken to this contract
    //Metapools take an array of amounts with the exoctic stablecoin at the first spot and 3CRV at the second.
    //The second variable determines the min amount of LP-Token we want to receive (slippage control)
    _curveMetapool.add_liquidity([0, _amount], 0);
  }

  /**
   * @notice Withdraws 3CRV for deposited crvLPToken
   * @param _amount The amount of crvLPToken that get deposited
   * @param _curveMetapool The metapool where we want to provide liquidity
   */
  function _withdrawFromCurve(uint256 _amount, CurveMetapool _curveMetapool) internal {
    //Takes lp Token and sends 3CRV to this contract
    //The second variable is the index for the token we want to receive (0 = exotic stablecoin, 1 = 3CRV)
    //The third variable determines min amount of token we want to receive (slippage control)
    _curveMetapool.remove_liquidity_one_coin(_amount, 1, 0);
  }

  /**
   * @notice Deposits crvLPToken for yToken
   * @param _amount The amount of crvLPToken that get deposited
   * @param _yearnVault The yearn Vault in which we deposit
   */
  function _sendToYearn(uint256 _amount, YearnVault _yearnVault) internal {
    //Mints yToken and sends them to msg.sender (this contract)
    _yearnVault.deposit(_amount);
  }

  /**
   * @notice Withdraw crvLPToken from yearn
   * @param _amount The amount of crvLPToken which we deposit
   * @param _yearnVault The yearn Vault in which we deposit
   */
  function _withdrawFromYearn(uint256 _amount, YearnVault _yearnVault) internal {
    //Takes yToken and sends crvLPToken to this contract
    _yearnVault.withdraw(_amount);
  }

  /* ========== ADMIN ========== */

  /**
   * @notice This function allows the owner to change the composition of underlying token of the Butter
   * @param _yTokenAddresses An array of addresses for the yToken needed to mint Butter
   * @param _curvePoolTokenPairs An array structs describing underlying yToken, crvToken and curve metapool
   */
  function setCurvePoolTokenPairs(address[] memory _yTokenAddresses, CurvePoolTokenPair[] calldata _curvePoolTokenPairs)
    public
    onlyRole(DAO_ROLE)
  {
    _setCurvePoolTokenPairs(_yTokenAddresses, _curvePoolTokenPairs);
  }

  /**
   * @notice This function defines which underlying token and pools are needed to mint a hysi token
   * @param _yTokenAddresses An array of addresses for the yToken needed to mint Butter
   * @param _curvePoolTokenPairs An array structs describing underlying yToken, crvToken and curve metapool
   * @dev since our calculations for minting just iterate through the index and match it with the quantities given by Set
   * @dev we must make sure to align them correctly by index, otherwise our whole calculation breaks down
   */
  function _setCurvePoolTokenPairs(address[] memory _yTokenAddresses, CurvePoolTokenPair[] memory _curvePoolTokenPairs)
    internal
  {
    emit CurveTokenPairsUpdated(_yTokenAddresses, _curvePoolTokenPairs);
    for (uint256 i; i < _yTokenAddresses.length; i++) {
      curvePoolTokenPairs[_yTokenAddresses[i]] = _curvePoolTokenPairs[i];
    }
    emit CurveTokenPairsUpdated(_yTokenAddresses, _curvePoolTokenPairs);
  }

  /**
   * @notice Pauses the contract.
   * @dev All function with the modifer `whenNotPaused` cant be called anymore. Namly deposits and mint/redeem
   */
  function pause() external onlyRole(DAO_ROLE) {
    _pause();
  }

  function _getContract(bytes32 _name) internal view override(ACLAuth, ContractRegistryAccess) returns (address) {
    return super._getContract(_name);
  }
}
