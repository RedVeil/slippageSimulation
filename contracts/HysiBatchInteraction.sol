// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "./lib/Owned.sol";
import "./Interfaces/Integrations/YearnVault.sol";
import "./Interfaces/Integrations/BasicIssuanceModule.sol";
import "./Interfaces/Integrations/ISetToken.sol";
import "./Interfaces/Integrations/CurveContracts.sol";
import "./KeeperIncentive.sol";

/*
This Contract allows smaller depositors to mint and redeem HYSI without needing to through all the steps necessary on their own...
...which not only takes long but mainly costs enormous amounts of gas.
The HYSI is created from 4 different yToken which in turn need each a deposit of a crvLPToken.
This means 12 approvals and 9 deposits are necessary to mint one HYSI.
We Batch this process and allow users to pool their funds. Than we pay keeper to Mint or Redeem HYSI regularly.
*/
contract HysiBatchInteraction is Owned, KeeperIncentive {
  using SafeMath for uint256;
  using SafeERC20 for YearnVault;
  using SafeERC20 for ISetToken;
  using SafeERC20 for IERC20;

  /**
   * @notice Defines if the Batch will mint or redeem HYSI
   */
  enum BatchType {
    Mint,
    Redeem
  }

  /**
   * @notice Defines if the Batch will mint or redeem HYSI
   * @param curveMetaPool A CurveMetaPool for trading an exotic stablecoin against 3CRV
   * @param crvLPToken The LP-Token of the CurveMetapool
   */
  struct CurvePoolTokenPair {
    CurveMetapool curveMetaPool;
    IERC20 crvLPToken;
  }

  /**
   * @notice The Batch structure is used both for Batches of Minting and Redeeming
   * @param batchType Determines if this Batch is for Minting or Redeeming HYSI
   * @param batchId bytes32 id of the batch
   * @param claimable Shows if a batch has been processed and is ready to be claimed, the suppliedToken cant be withdrawn if a batch is claimable
   * @param unclaimedShares The total amount of unclaimed shares in this batch
   * @param suppliedTokenBalance The total amount of deposited token (either 3CRV or HYSI)
   * @param claimableTokenBalance The total amount of claimable token (either 3CRV or HYSI)
   * @param tokenAddress The address of the the token to be claimed
   * @param shareBalance The individual share balance per user that has deposited token
   */
  struct Batch {
    BatchType batchType;
    bytes32 batchId;
    bool claimable;
    uint256 unclaimedShares;
    uint256 suppliedTokenBalance;
    uint256 claimableTokenBalance;
    address suppliedTokenAddress;
    address claimableTokenAddress;
  }

  /* ========== STATE VARIABLES ========== */

  IERC20 public threeCrv;
  BasicIssuanceModule public setBasicIssuanceModule;
  ISetToken public setToken;
  address public zapper;
  mapping(address => CurvePoolTokenPair) public curvePoolTokenPairs;

  /**
   * @notice This maps batch ids to addresses with share balances
   */
  mapping(bytes32 => mapping(address => uint256)) public accountBalances;
  mapping(address => bytes32[]) public accountBatches;
  mapping(bytes32 => Batch) public batches;
  bytes32[] public batchIds;

  uint256 public lastMintedAt;
  uint256 public lastRedeemedAt;
  bytes32 public currentMintBatchId;
  bytes32 public currentRedeemBatchId;
  uint256 public batchCooldown;
  uint256 public mintThreshold;
  uint256 public redeemThreshold;

  /* ========== EVENTS ========== */

  event Deposit(address indexed from, uint256 deposit);
  event Withdrawal(address indexed to, uint256 amount);
  event BatchMinted(
    bytes32 indexed batchId,
    uint256 suppliedTokenAmount,
    uint256 hysiAmount
  );
  event BatchRedeemed(
    bytes32 indexed batchId,
    uint256 suppliedTokenAmount,
    uint256 threeCrvAmount
  );
  event Claimed(
    address indexed account,
    BatchType batchType,
    uint256 shares,
    uint256 claimedToken
  );
  event TokenSetAdded(ISetToken setToken);
  event WithdrawnFromBatch(bytes32 batchId, uint256 amount, address to);
  event MovedUnclaimedDepositsIntoCurrentBatch(
    uint256 amount,
    BatchType batchType,
    address account
  );

  /* ========== CONSTRUCTOR ========== */

  constructor(
    IERC20 threeCrv_,
    ISetToken setToken_,
    BasicIssuanceModule basicIssuanceModule_,
    address[] memory yTokenAddresses_,
    CurvePoolTokenPair[] memory curvePoolTokenPairs_,
    uint256 batchCooldown_,
    uint256 mintThreshold_,
    uint256 redeemThreshold_,
    address governance_,
    IERC20 pop_
  ) Owned(msg.sender) KeeperIncentive(governance_, pop_) {
    require(address(threeCrv_) != address(0));
    require(address(setToken_) != address(0));
    require(address(basicIssuanceModule_) != address(0));
    threeCrv = threeCrv_;
    setToken = setToken_;
    setBasicIssuanceModule = basicIssuanceModule_;

    _setCurvePoolTokenPairs(yTokenAddresses_, curvePoolTokenPairs_);

    batchCooldown = batchCooldown_;
    mintThreshold = mintThreshold_;
    redeemThreshold = redeemThreshold_;
    lastMintedAt = block.timestamp;
    lastRedeemedAt = block.timestamp;

    _generateNextBatch(bytes32("mint"), BatchType.Mint);
    _generateNextBatch(bytes32("redeem"), BatchType.Redeem);
  }

  /* ========== VIEWS ========== */
  /**
   * @notice Get ids for all batches that a user has interacted with
   * @param account The address for whom we want to retrieve batches
   */
  function getAccountBatches(address account)
    external
    view
    returns (bytes32[] memory)
  {
    return accountBatches[account];
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  /**
   * @notice Deposits funds in the current mint batch
   * @param amount_ Amount of 3cr3CRV to use for minting
   * @param depositFor_ User that gets the shares attributed to (for use in zapper contract)
   * @dev Should this be secured we nonReentrant?
   */
  function depositForMint(uint256 amount_, address depositFor_) external {
    require(
      msg.sender == zapper || msg.sender == depositFor_,
      "you cant transfer other funds"
    );
    require(threeCrv.balanceOf(msg.sender) >= amount_, "insufficent balance");
    threeCrv.transferFrom(msg.sender, address(this), amount_);
    _deposit(amount_, currentMintBatchId, depositFor_);
  }

  /**
   * @notice deposits funds in the current redeem batch
   * @param amount_ amount of HYSI to be redeemed
   * @dev Should this be secured we nonReentrant?
   */
  function depositForRedeem(uint256 amount_) external {
    require(setToken.balanceOf(msg.sender) >= amount_, "insufficient balance");
    setToken.transferFrom(msg.sender, address(this), amount_);
    _deposit(amount_, currentRedeemBatchId, msg.sender);
  }

  /**
   * @notice This function allows a user to withdraw their funds from a batch before that batch has been processed
   * @param batchId_ From which batch should funds be withdrawn from
   * @param amountToWithdraw_ Amount of HYSI or 3CRV to be withdrawn from the queue (depending on mintBatch / redeemBatch)
   * @param withdrawFor_ User that gets the shares attributed to (for use in zapper contract)
   */
  function withdrawFromBatch(
    bytes32 batchId_,
    uint256 amountToWithdraw_,
    address withdrawFor_
  ) external {
    address recipient = _getRecipient(withdrawFor_);

    Batch storage batch = batches[batchId_];
    uint256 accountBalance = accountBalances[batchId_][withdrawFor_];
    require(batch.claimable == false, "already processed");
    require(
      accountBalance >= amountToWithdraw_,
      "account has insufficient funds"
    );

    //At this point the share balance is equal to the supplied token and can be used interchangeably
    accountBalances[batchId_][withdrawFor_] = accountBalance.sub(
      amountToWithdraw_
    );
    batch.suppliedTokenBalance = batch.suppliedTokenBalance.sub(
      amountToWithdraw_
    );
    batch.unclaimedShares = batch.unclaimedShares.sub(amountToWithdraw_);

    if (batch.batchType == BatchType.Mint) {
      threeCrv.safeTransfer(recipient, amountToWithdraw_);
    } else {
      setToken.safeTransfer(recipient, amountToWithdraw_);
    }
    emit WithdrawnFromBatch(batchId_, amountToWithdraw_, withdrawFor_);
  }

  /**
   * @notice Claims funds after the batch has been processed (get HYSI from a mint batch and 3CRV from a redeem batch)
   * @param batchId_ Id of batch to claim from
   * @param claimFor_ User that gets the shares attributed to (for use in zapper contract)
   */
  function claim(bytes32 batchId_, address claimFor_)
    external
    returns (uint256)
  {
    Batch storage batch = batches[batchId_];
    require(batch.claimable, "not yet claimable");

    address recipient = _getRecipient(claimFor_);
    uint256 accountBalance = accountBalances[batchId_][claimFor_];
    require(
      accountBalance <= batch.unclaimedShares,
      "claiming too many shares"
    );

    //Calculate how many token will be claimed
    uint256 tokenAmountToClaim = batch
      .claimableTokenBalance
      .mul(accountBalance)
      .div(batch.unclaimedShares);

    //Subtract the claimed token from the batch
    batch.claimableTokenBalance = batch.claimableTokenBalance.sub(
      tokenAmountToClaim
    );
    batch.unclaimedShares = batch.unclaimedShares.sub(accountBalance);
    accountBalances[batchId_][claimFor_] = 0;

    //Transfer token
    if (batch.batchType == BatchType.Mint) {
      setToken.safeTransfer(recipient, tokenAmountToClaim);
    } else {
      threeCrv.safeTransfer(recipient, tokenAmountToClaim);
    }

    emit Claimed(
      claimFor_,
      batch.batchType,
      accountBalance,
      tokenAmountToClaim
    );

    return tokenAmountToClaim;
  }

  /**
   * @notice Moves unclaimed token (3crv or Hysi) from their respective Batches into a new redeemBatch / mintBatch without needing to claim them first. This will typically be used when hysi has already been minted and a user has never claimed / transfered the token to their address and they would like to convert it to stablecoin.
   * @param batchIds the ids of each batch where hysi should be moved from
   * @param shares how many shares should redeemed in each of the batches
   * @param batchType the batchType where funds should be taken from (Mint -> Take Hysi and redeem then, Redeem -> Take 3Crv and Mint HYSI)
   * @dev the indices of batchIds must match the amountsInHysi to work properly (This will be done by the frontend)
   */
  function moveUnclaimedDepositsIntoCurrentBatch(
    bytes32[] calldata batchIds,
    uint256[] calldata shares,
    BatchType batchType
  ) external {
    require(batchIds.length == shares.length, "array lengths must match");

    uint256 totalAmount;

    for (uint256 i; i < batchIds.length; i++) {
      Batch storage batch = batches[batchIds[i]];
      uint256 accountBalance = accountBalances[batch.batchId][msg.sender];
      //Check that the user has enough funds and that the batch was already minted
      //Only the current redeemBatch is claimable == false so this check allows us to not adjust batch.suppliedTokenBalance
      //Additionally it makes no sense to move funds from the current redeemBatch to the current redeemBatch
      require(batch.claimable == true, "has not yet been processed");
      require(batch.batchType == batchType, "incorrect batchType");
      require(accountBalance >= shares[i], "account has insufficient funds");

      uint256 tokenAmountToClaim = batch
        .claimableTokenBalance
        .mul(shares[i])
        .div(batch.unclaimedShares);
      batch.claimableTokenBalance = batch.claimableTokenBalance.sub(
        tokenAmountToClaim
      );
      batch.unclaimedShares = batch.unclaimedShares.sub(shares[i]);
      accountBalances[batch.batchId][msg.sender] = accountBalance.sub(
        shares[i]
      );

      totalAmount = totalAmount.add(tokenAmountToClaim);
    }
    require(totalAmount > 0, "totalAmount must be larger 0");

    if (BatchType.Mint == batchType) {
      _deposit(totalAmount, currentRedeemBatchId, msg.sender);
    }

    if (BatchType.Redeem == batchType) {
      _deposit(totalAmount, currentMintBatchId, msg.sender);
    }

    emit MovedUnclaimedDepositsIntoCurrentBatch(
      totalAmount,
      batchType,
      msg.sender
    );
  }

  /**
   * @notice Mint HYSI token with deposited 3CRV. This function goes through all the steps necessary to mint an optimal amount of HYSI
   * @param minAmountToMint_ The expected min amount of hysi to mint. If hysiAmount is lower than minAmountToMint_ the transaction will revert.
   * @dev This function deposits 3CRV in the underlying Metapool and deposits these LP token to get yToken which in turn are used to mint HYSI
   * @dev This process leaves some leftovers which are partially used in the next mint batches.
   * @dev In order to get 3CRV we can implement a zap to move stables into the curve tri-pool
   * @dev keeperIncentive(0) checks if the msg.sender is a permissioned keeper and pays them a reward for calling this function (see KeeperIncentive.sol)
   */
  function batchMint(uint256 minAmountToMint_) external keeperIncentive(0) {
    Batch storage batch = batches[currentMintBatchId];

    //Check if there was enough time between the last batch minting and this attempt...
    //...or if enough 3CRV was deposited to make the minting worthwhile
    //This is to prevent excessive gas consumption and costs as we will pay keeper to call this function
    require(
      (block.timestamp.sub(lastMintedAt) >= batchCooldown) ||
        (batch.suppliedTokenBalance >= mintThreshold),
      "can not execute batch action yet"
    );

    //Check if the Batch got already processed -- should technically not be possible
    require(batch.claimable == false, "already minted");

    //Check if this contract has enough 3CRV -- should technically not be necessary
    require(
      threeCrv.balanceOf(address(this)) >= batch.suppliedTokenBalance,
      "account has insufficient balance of token to mint"
    );

    //Get the quantity of yToken for one HYSI
    (
      address[] memory tokenAddresses,
      uint256[] memory quantities
    ) = setBasicIssuanceModule.getRequiredComponentUnitsForIssue(
        setToken,
        1e18
      );

    //Total value of leftover yToken valued in 3CRV
    uint256 totalLeftoverIn3Crv;

    //Individual yToken leftovers valued in 3CRV
    uint256[] memory leftoversIn3Crv = new uint256[](quantities.length);

    for (uint256 i; i < tokenAddresses.length; i++) {
      //Check how many crvLPToken are needed to mint one yToken
      uint256 yTokenInCrvToken = YearnVault(tokenAddresses[i]).pricePerShare();

      //Check how many 3CRV are needed to mint one crvLPToken
      uint256 crvLPTokenIn3Crv = uint256(2e18).sub(
        curvePoolTokenPairs[tokenAddresses[i]]
          .curveMetaPool
          .calc_withdraw_one_coin(1e18, 1)
      );

      //Calculate how many 3CRV are needed to mint one yToken
      uint256 yTokenIn3Crv = yTokenInCrvToken.mul(crvLPTokenIn3Crv).div(1e18);

      //Calculate how much the yToken leftover are worth in 3CRV
      uint256 leftoverIn3Crv = YearnVault(tokenAddresses[i])
        .balanceOf(address(this))
        .mul(yTokenIn3Crv)
        .div(1e18);

      //Add the leftover value to the array of leftovers for later use
      leftoversIn3Crv[i] = leftoverIn3Crv;

      //Add the leftover value to the total leftover value
      totalLeftoverIn3Crv = totalLeftoverIn3Crv.add(leftoverIn3Crv);
    }

    //Calculate the total value of supplied token + leftovers in 3CRV
    uint256 suppliedTokenBalancePlusLeftovers = batch.suppliedTokenBalance.add(
      totalLeftoverIn3Crv
    );

    for (uint256 i; i < tokenAddresses.length; i++) {
      //Calculate the pool allocation by dividing the suppliedTokenBalance by 4 and take leftovers into account
      uint256 poolAllocation = suppliedTokenBalancePlusLeftovers.div(4).sub(
        leftoversIn3Crv[i]
      );

      //Pool 3CRV to get crvLPToken
      _sendToCurve(
        poolAllocation,
        curvePoolTokenPairs[tokenAddresses[i]].curveMetaPool
      );

      //Deposit crvLPToken to get yToken
      _sendToYearn(
        curvePoolTokenPairs[tokenAddresses[i]].crvLPToken.balanceOf(
          address(this)
        ),
        curvePoolTokenPairs[tokenAddresses[i]].crvLPToken,
        YearnVault(tokenAddresses[i])
      );

      //Approve yToken for minting
      YearnVault(tokenAddresses[i]).safeIncreaseAllowance(
        address(setBasicIssuanceModule),
        YearnVault(tokenAddresses[i]).balanceOf(address(this))
      );
    }

    //Get the minimum amount of hysi that we can mint with our balances of yToken
    uint256 hysiAmount = YearnVault(tokenAddresses[0])
      .balanceOf(address(this))
      .mul(1e18)
      .div(quantities[0]);

    for (uint256 i = 1; i < tokenAddresses.length; i++) {
      hysiAmount = Math.min(
        hysiAmount,
        YearnVault(tokenAddresses[i]).balanceOf(address(this)).mul(1e18).div(
          quantities[i]
        )
      );
    }

    require(hysiAmount >= minAmountToMint_, "slippage too high");

    //Mint HYSI
    setBasicIssuanceModule.issue(setToken, hysiAmount, address(this));

    //Save the minted amount HYSI as claimable token for the batch
    batch.claimableTokenBalance = hysiAmount;

    //Set claimable to true so users can claim their HYSI
    batch.claimable = true;

    //Update lastMintedAt for cooldown calculations
    lastMintedAt = block.timestamp;

    emit BatchMinted(
      currentMintBatchId,
      batch.suppliedTokenBalance,
      hysiAmount
    );

    //Create the next mint batch
    _generateNextBatch(currentMintBatchId, BatchType.Mint);
  }

  /**
   * @notice Redeems HYSI for 3CRV. This function goes through all the steps necessary to get 3CRV
   * @param min3crvToReceive_ sets minimum amount of 3crv to redeem HYSI for, otherwise the transaction will revert
   * @dev This function reedeems HYSI for the underlying yToken and deposits these yToken in curve Metapools for 3CRV
   * @dev In order to get stablecoins from 3CRV we can use a zap to redeem 3CRV for stables in the curve tri-pool
   * @dev keeperIncentive(0) checks if the msg.sender is a permissioned keeper and pays them a reward for calling this function (see KeeperIncentive.sol)
   */
  function batchRedeem(uint256 min3crvToReceive_) external keeperIncentive(0) {
    Batch storage batch = batches[currentRedeemBatchId];

    //Check if there was enough time between the last batch redemption and this attempt...
    //...or if enough HYSI was deposited to make the redemption worthwhile
    //This is to prevent excessive gas consumption and costs as we will pay keeper to call this function
    require(
      (block.timestamp.sub(lastRedeemedAt) >= batchCooldown) ||
        (batch.suppliedTokenBalance >= redeemThreshold),
      "can not execute batch action yet"
    );
    //Check if the Batch got already processed -- should technically not be possible
    require(batch.claimable == false, "already redeemed");

    //Check if this contract has enough HYSI -- should technically not be necessary
    require(
      setToken.balanceOf(address(this)) >= batch.suppliedTokenBalance,
      "contract has insufficient balance of token to redeem"
    );

    //Get tokenAddresses for mapping of underlying
    (
      address[] memory tokenAddresses,
      uint256[] memory quantities
    ) = setBasicIssuanceModule.getRequiredComponentUnitsForIssue(
        setToken,
        1e18
      );

    //Allow setBasicIssuanceModule to use HYSI
    setToken.safeIncreaseAllowance(
      address(setBasicIssuanceModule),
      batch.suppliedTokenBalance
    );

    //Redeem HYSI for yToken
    setBasicIssuanceModule.redeem(
      setToken,
      batch.suppliedTokenBalance,
      address(this)
    );

    //Check our balance of 3CRV since we could have some still around from previous batches
    uint256 oldBalance = threeCrv.balanceOf(address(this));

    for (uint256 i; i < tokenAddresses.length; i++) {
      //Deposit yToken to receive crvLPToken
      _withdrawFromYearn(
        YearnVault(tokenAddresses[i]).balanceOf(address(this)),
        YearnVault(tokenAddresses[i])
      );

      uint256 crvLPTokenBalance = curvePoolTokenPairs[tokenAddresses[i]]
        .crvLPToken
        .balanceOf(address(this));

      //Deposit crvLPToken to receive 3CRV
      _withdrawFromCurve(
        crvLPTokenBalance,
        curvePoolTokenPairs[tokenAddresses[i]].crvLPToken,
        curvePoolTokenPairs[tokenAddresses[i]].curveMetaPool
      );
    }

    //Save the redeemed amount of 3CRV as claimable token for the batch
    batch.claimableTokenBalance = threeCrv.balanceOf(address(this)).sub(
      oldBalance
    );

    require(
      batch.claimableTokenBalance >= min3crvToReceive_,
      "slippage too high"
    );

    emit BatchRedeemed(
      currentRedeemBatchId,
      batch.suppliedTokenBalance,
      batch.claimableTokenBalance
    );

    //Set claimable to true so users can claim their HYSI
    batch.claimable = true;

    //Update lastRedeemedAt for cooldown calculations
    lastRedeemedAt = block.timestamp;

    //Create the next redeem batch id
    _generateNextBatch(currentRedeemBatchId, BatchType.Redeem);
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  /**
   * @notice makes sure only zapper or user can withdraw from accout_ and returns the recipient of the withdrawn token
   * @param account_ is the address which gets withdrawn from
   * @dev returns recipient of the withdrawn funds
   * @dev By default a user should set account_ to their address
   * @dev If zapper is used to withdraw and swap for a user the msg.sender will be zapper and account_ is the user which we withdraw from. The zapper than sends the swapped funds afterwards to the user
   */
  function _getRecipient(address account_) internal returns (address) {
    //Make sure that only zapper can withdraw from someone else
    require(
      msg.sender == zapper || msg.sender == account_,
      "you cant transfer other funds"
    );

    //Set recipient per default to account_
    address recipient = account_;

    //set the recipient to zapper if its called by the zapper
    if (msg.sender == zapper) {
      recipient = msg.sender;
    }
    return recipient;
  }

  /**
   * @notice Generates the next batch id for new deposits
   * @param _currentBatchId takes the current mint or redeem batch id
   * @param _batchType BatchType of the newly created id
   */
  function _generateNextBatch(bytes32 _currentBatchId, BatchType _batchType)
    internal
    returns (bytes32)
  {
    bytes32 id = _generateNextBatchId(_currentBatchId);
    batchIds.push(id);
    Batch storage batch = batches[id];
    batch.batchType = _batchType;
    batch.batchId = id;

    if (BatchType.Mint == _batchType) {
      currentMintBatchId = id;
      batch.suppliedTokenAddress = address(threeCrv);
      batch.claimableTokenAddress = address(setToken);
    }
    if (BatchType.Redeem == _batchType) {
      currentRedeemBatchId = id;
      batch.suppliedTokenAddress = address(setToken);
      batch.claimableTokenAddress = address(threeCrv);
    }
    return id;
  }

  /**
   * @notice Deposit either HYSI or 3CRV in their respective batches
   * @param amount_ The amount of 3CRV or HYSI a user is depositing
   * @param currentBatchId_ The current reedem or mint batch id to place the funds in the next batch to be processed
   * @param depositFor_ User that gets the shares attributed to (for use in zapper contract)
   * @dev This function will be called by depositForMint or depositForRedeem and simply reduces code duplication
   */
  function _deposit(
    uint256 amount_,
    bytes32 currentBatchId_,
    address depositFor_
  ) internal {
    Batch storage batch = batches[currentBatchId_];

    //Add the new funds to the batch
    batch.suppliedTokenBalance = batch.suppliedTokenBalance.add(amount_);
    batch.unclaimedShares = batch.unclaimedShares.add(amount_);
    accountBalances[currentBatchId_][depositFor_] = accountBalances[
      currentBatchId_
    ][depositFor_].add(amount_);

    //Save the batchId for the user so they can be retrieved to claim the batch
    accountBatches[depositFor_].push(currentBatchId_);

    emit Deposit(depositFor_, amount_);
  }

  /**
   * @notice Deposit 3CRV in a curve metapool for its LP-Token
   * @param amount_ The amount of 3CRV that gets deposited
   * @param curveMetapool_ The metapool where we want to provide liquidity
   */
  function _sendToCurve(uint256 amount_, CurveMetapool curveMetapool_)
    internal
    returns (uint256)
  {
    uint256 allowanceAmount = threeCrv.allowance(
      address(this),
      address(curveMetapool_)
    );
    threeCrv.safeDecreaseAllowance(address(curveMetapool_), allowanceAmount);
    threeCrv.safeIncreaseAllowance(address(curveMetapool_), uint256(-1));

    //Takes 3CRV and sends lpToken to this contract
    //Metapools take an array of amounts with the exoctic stablecoin at the first spot and 3CRV at the second.
    //The second variable determines the min amount of LP-Token we want to receive (slippage control)
    curveMetapool_.add_liquidity([0, amount_], 0);
  }

  /**
   * @notice Withdraws 3CRV for deposited crvLPToken
   * @param amount_ The amount of crvLPToken that get deposited
   * @param lpToken_ Which crvLPToken we deposit
   * @param curveMetapool_ The metapool where we want to provide liquidity
   */
  function _withdrawFromCurve(
    uint256 amount_,
    IERC20 lpToken_,
    CurveMetapool curveMetapool_
  ) internal returns (uint256) {
    uint256 allowanceAmount = lpToken_.allowance(
      address(this),
      address(curveMetapool_)
    );
    lpToken_.safeDecreaseAllowance(address(curveMetapool_), allowanceAmount);
    lpToken_.safeIncreaseAllowance(address(curveMetapool_), uint256(-1));

    //Takes lp Token and sends 3CRV to this contract
    //The second variable is the index for the token we want to receive (0 = exotic stablecoin, 1 = 3CRV)
    //The third variable determines min amount of token we want to receive (slippage control)
    curveMetapool_.remove_liquidity_one_coin(amount_, 1, 0);
  }

  /**
   * @notice Deposits crvLPToken for yToken
   * @param amount_ The amount of crvLPToken that get deposited
   * @param crvLPToken_ The crvLPToken which we deposit
   * @param yearnVault_ The yearn Vault in which we deposit
   */
  function _sendToYearn(
    uint256 amount_,
    IERC20 crvLPToken_,
    YearnVault yearnVault_
  ) internal {
    uint256 allowanceAmount = crvLPToken_.allowance(
      address(this),
      address(yearnVault_)
    );
    crvLPToken_.safeDecreaseAllowance(address(yearnVault_), allowanceAmount);
    crvLPToken_.safeIncreaseAllowance(address(yearnVault_), uint256(-1));

    //Mints yToken and sends them to msg.sender (this contract)
    yearnVault_.deposit(amount_);
  }

  /**
   * @notice Withdraw crvLPToken from yearn
   * @param amount_ The amount of crvLPToken which we deposit
   * @param yearnVault_ The yearn Vault in which we deposit
   */
  function _withdrawFromYearn(uint256 amount_, YearnVault yearnVault_)
    internal
  {
    uint256 allowanceAmount = yearnVault_.allowance(
      address(this),
      address(yearnVault_)
    );
    yearnVault_.safeDecreaseAllowance(address(yearnVault_), allowanceAmount);
    yearnVault_.safeIncreaseAllowance(address(yearnVault_), uint256(-1));

    //Takes yToken and sends crvLPToken to this contract
    yearnVault_.withdraw(amount_);
  }

  /**
   * @notice Generates the next batch id for new deposits
   * @param currentBatchId_ takes the current mint or redeem batch id
   */
  function _generateNextBatchId(bytes32 currentBatchId_)
    internal
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(block.timestamp, currentBatchId_));
  }

  /* ========== SETTER ========== */

  /**
   * @notice This function allows the owner to change the composition of underlying token of the HYSI
   * @param yTokenAddresses_ An array of addresses for the yToken needed to mint HYSI
   * @param curvePoolTokenPairs_ An array structs describing underlying yToken, crvToken and curve metapool
   */
  function setCurvePoolTokenPairs(
    address[] memory yTokenAddresses_,
    CurvePoolTokenPair[] calldata curvePoolTokenPairs_
  ) public onlyOwner {
    _setCurvePoolTokenPairs(yTokenAddresses_, curvePoolTokenPairs_);
  }

  /**
   * @notice This function defines which underlying token and pools are needed to mint a hysi token
   * @param yTokenAddresses_ An array of addresses for the yToken needed to mint HYSI
   * @param curvePoolTokenPairs_ An array structs describing underlying yToken, crvToken and curve metapool
   * @dev since our calculations for minting just iterate through the index and match it with the quantities given by Set
   * @dev we must make sure to align them correctly by index, otherwise our whole calculation breaks down
   */
  function _setCurvePoolTokenPairs(
    address[] memory yTokenAddresses_,
    CurvePoolTokenPair[] memory curvePoolTokenPairs_
  ) internal {
    for (uint256 i; i < yTokenAddresses_.length; i++) {
      curvePoolTokenPairs[yTokenAddresses_[i]] = curvePoolTokenPairs_[i];
    }
  }

  /**
   * @notice Changes the current batch cooldown
   * @param cooldown_ Cooldown in seconds
   * @dev The cooldown is the same for redeem and mint batches
   */
  function setBatchCooldown(uint256 cooldown_) external onlyOwner {
    batchCooldown = cooldown_;
  }

  /**
   * @notice Changes the Threshold of 3CRV which need to be deposited to be able to mint immediately
   * @param threshold_ Amount of 3CRV necessary to mint immediately
   */
  function setMintThreshold(uint256 threshold_) external onlyOwner {
    mintThreshold = threshold_;
  }

  /**
   * @notice Changes the Threshold of HYSI which need to be deposited to be able to redeem immediately
   * @param threshold_ Amount of HYSI necessary to mint immediately
   */
  function setRedeemThreshold(uint256 threshold_) external onlyOwner {
    redeemThreshold = threshold_;
  }

  /**
   * @notice Set the address of HysiBatchZapper to allow the zapper to deposit and claim for user
   * @param zapper_ Address of the HysiBatchZapper
   * @dev This should only be called once after deployment to mitigate the risk of changing this to a malicious contract
   */
  function setZapper(address zapper_) external onlyOwner {
    require(zapper == address(0), "zapper already set");
    zapper = zapper_;
  }
}
