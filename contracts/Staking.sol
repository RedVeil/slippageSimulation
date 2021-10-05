// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./lib/Owned.sol";
import "./Interfaces/IStaking.sol";
import "./Interfaces/IRewardsManager.sol";
import "./Interfaces/IRewardsEscrow.sol";
import "./Defended.sol";

contract Staking is IStaking, Owned, ReentrancyGuard, Defended {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  /* ========== STATE VARIABLES ========== */

  struct LockedBalance {
    uint256 _balance;
    uint256 _end;
  }

  IERC20 public immutable POP;
  IRewardsManager public RewardsManager;
  IRewardsEscrow public RewardsEscrow;
  bool public initialised = false;
  uint256 public periodFinish = 0;
  uint256 public rewardRate = 0;
  uint256 public rewardsDuration = 7 days;
  uint256 public lastUpdateTime;
  uint256 public rewardPerTokenStored;
  uint256 public totalLocked;
  uint256 public totalVoiceCredits;
  mapping(address => uint256) public voiceCredits;
  mapping(address => uint256) public userRewardPerTokenPaid;
  mapping(address => uint256) public rewards;
  mapping(address => LockedBalance) public lockedBalances;

  /* ========== EVENTS ========== */

  event StakingDeposited(address _address, uint256 amount);
  event StakingWithdrawn(address _address, uint256 amount);
  event RewardPaid(address _address, uint256 reward);
  event RewardAdded(uint256 reward);
  event RewardsManagerChanged(IRewardsManager _rewardsManager);
  event RewardsEscrowChanged(IRewardsEscrow _rewardsEscrow);

  /* ========== CONSTRUCTOR ========== */

  constructor(IERC20 _pop, IRewardsEscrow _rewardsEscrow) Owned(msg.sender) {
    POP = _pop;
    RewardsEscrow = _rewardsEscrow;
  }

  /* ========== VIEWS ========== */

  /**
   * @notice this returns the current voice credit balance of an address. voice credits decays over time. the amount returned is up to date, whereas the amount stored in `public voiceCredits` is saved only during some checkpoints.
   * @dev todo - check if multiplier is needed for calculating square root of smaller balances
   * @param _address address to get voice credits for
   */
  function getVoiceCredits(address _address)
    public
    view
    override
    returns (uint256)
  {
    uint256 lockEndTime = lockedBalances[_address]._end;
    uint256 balance = lockedBalances[_address]._balance;
    uint256 currentTime = block.timestamp;

    if (lockEndTime == 0 || lockEndTime < currentTime || balance == 0) {
      return 0;
    }

    uint256 timeTillEnd = ((lockEndTime.sub(currentTime)).div(1 hours)).mul(
      1 hours
    );
    return balance.mul(timeTillEnd).div(4 * 365 days);
  }

  function getWithdrawableBalance(address _address)
    public
    view
    override
    returns (uint256)
  {
    uint256 _withdrawable = 0;
    uint256 _currentTime = block.timestamp;
    if (lockedBalances[_address]._end <= _currentTime) {
      _withdrawable = lockedBalances[_address]._balance;
    }
    return _withdrawable;
  }

  function balanceOf(address _address) external view returns (uint256) {
    return lockedBalances[_address]._balance;
  }

  function lastTimeRewardApplicable() public view returns (uint256) {
    return Math.min(block.timestamp, periodFinish);
  }

  function rewardPerToken() public view returns (uint256) {
    if (totalLocked == 0) {
      return rewardPerTokenStored;
    }
    return
      rewardPerTokenStored.add(
        lastTimeRewardApplicable()
          .sub(lastUpdateTime)
          .mul(rewardRate)
          .mul(1e18)
          .div(totalLocked)
      );
  }

  function earned(address account) public view returns (uint256) {
    return
      lockedBalances[account]
        ._balance
        .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
        .div(1e18)
        .add(rewards[account]);
  }

  function getRewardForDuration() external view returns (uint256) {
    return rewardRate.mul(rewardsDuration);
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  function stake(uint256 amount, uint256 lengthOfTime)
    external
    override
    nonReentrant
    defend
    isInitialised
    updateReward(msg.sender)
  {
    uint256 _currentTime = block.timestamp;
    require(amount > 0, "amount must be greater than 0");
    require(lengthOfTime >= 7 days, "must lock tokens for at least 1 week");
    require(
      lengthOfTime <= 365 * 4 days,
      "must lock tokens for less than/equal to  4 year"
    );
    require(POP.balanceOf(msg.sender) >= amount, "insufficient balance");
    require(lockedBalances[msg.sender]._balance == 0, "withdraw balance first");

    POP.safeTransferFrom(msg.sender, address(this), amount);

    totalLocked = totalLocked.add(amount);
    _lockTokens(amount, lengthOfTime);
    recalculateVoiceCredits(msg.sender);
    emit StakingDeposited(msg.sender, amount);
  }

  function increaseLock(uint256 lengthOfTime) external {
    uint256 _currentTime = block.timestamp;
    require(lengthOfTime >= 7 days, "must lock tokens for at least 1 week");
    require(
      lengthOfTime <= 365 * 4 days,
      "must lock tokens for less than/equal to  4 year"
    );
    require(lockedBalances[msg.sender]._balance > 0, "no lockedBalance exists");
    require(
      lockedBalances[msg.sender]._end > _currentTime,
      "withdraw balance first"
    );
    lockedBalances[msg.sender]._end = lockedBalances[msg.sender]._end.add(
      lengthOfTime
    );
    recalculateVoiceCredits(msg.sender);
  }

  function increaseStake(uint256 amount) external {
    uint256 _currentTime = block.timestamp;
    require(amount > 0, "amount must be greater than 0");
    require(POP.balanceOf(msg.sender) >= amount, "insufficient balance");
    require(lockedBalances[msg.sender]._balance > 0, "no lockedBalance exists");
    require(
      lockedBalances[msg.sender]._end > _currentTime,
      "withdraw balance first"
    );
    POP.safeTransferFrom(msg.sender, address(this), amount);
    totalLocked = totalLocked.add(amount);
    lockedBalances[msg.sender]._balance = lockedBalances[msg.sender]
      ._balance
      .add(amount);
    recalculateVoiceCredits(msg.sender);
  }

  function withdraw(uint256 amount)
    public
    override
    nonReentrant
    updateReward(msg.sender)
  {
    require(amount > 0, "amount must be greater than 0");
    require(lockedBalances[msg.sender]._balance > 0, "insufficient balance");
    require(amount <= getWithdrawableBalance(msg.sender));

    POP.safeTransfer(msg.sender, amount);

    totalLocked = totalLocked.sub(amount);
    _clearWithdrawnFromLocked(amount);
    recalculateVoiceCredits(msg.sender);
    emit StakingWithdrawn(msg.sender, amount);
  }

  function getReward() public nonReentrant updateReward(msg.sender) {
    uint256 reward = rewards[msg.sender];
    if (reward > 0) {
      rewards[msg.sender] = 0;
      //How to handle missing gwei?
      uint256 payout = reward.div(uint256(3));
      uint256 escrowed = payout.mul(uint256(2));

      POP.safeTransfer(msg.sender, payout);
      POP.safeIncreaseAllowance(address(RewardsEscrow), escrowed);
      RewardsEscrow.lock(msg.sender, escrowed);

      emit RewardPaid(msg.sender, payout);
    }
  }

  function exit() external {
    withdraw(getWithdrawableBalance(msg.sender));
    getReward();
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  function init(IRewardsManager _rewardsManager) external onlyOwner {
    RewardsManager = _rewardsManager;
    initialised = true;
  }

  // todo: multiply voice credits by 10000 to deal with exponent math- is it needed?
  function recalculateVoiceCredits(address _address) public {
    uint256 previousVoiceCredits = voiceCredits[_address];
    totalVoiceCredits = totalVoiceCredits.sub(previousVoiceCredits);
    voiceCredits[_address] = getVoiceCredits(_address);
    totalVoiceCredits = totalVoiceCredits.add(voiceCredits[_address]);
  }

  function _lockTokens(uint256 amount, uint256 lengthOfTime) internal {
    uint256 _currentTime = block.timestamp;
    if (_currentTime > lockedBalances[msg.sender]._end) {
      lockedBalances[msg.sender] = LockedBalance({
        _balance: lockedBalances[msg.sender]._balance.add(amount),
        _end: _currentTime.add(lengthOfTime)
      });
    } else {
      lockedBalances[msg.sender] = LockedBalance({
        _balance: lockedBalances[msg.sender]._balance.add(amount),
        _end: lockedBalances[msg.sender]._end.add(lengthOfTime)
      });
    }
  }

  function _clearWithdrawnFromLocked(uint256 _amount) internal {
    uint256 _currentTime = block.timestamp;
    if (lockedBalances[msg.sender]._end <= _currentTime) {
      if (_amount == lockedBalances[msg.sender]._balance) {
        delete lockedBalances[msg.sender];
      } else {
        lockedBalances[msg.sender]._balance = lockedBalances[msg.sender]
          ._balance
          .sub(_amount);
      }
    }
  }

  function setRewardsManager(IRewardsManager _rewardsManager)
    external
    onlyOwner
  {
    require(RewardsManager != _rewardsManager, "Same RewardsManager");
    RewardsManager = _rewardsManager;
    emit RewardsManagerChanged(_rewardsManager);
  }

  function setRewardsEscrow(IRewardsEscrow _rewardsEscrow) external onlyOwner {
    require(RewardsEscrow != _rewardsEscrow, "Same RewardsEscrow");
    RewardsEscrow = _rewardsEscrow;
    emit RewardsEscrowChanged(_rewardsEscrow);
  }

  function notifyRewardAmount(uint256 reward)
    external
    override
    updateReward(address(0))
    isInitialised
  {
    require(
      IRewardsManager(msg.sender) == RewardsManager || msg.sender == owner,
      "Not allowed"
    );
    if (block.timestamp >= periodFinish) {
      rewardRate = reward.div(rewardsDuration);
    } else {
      uint256 remaining = periodFinish.sub(block.timestamp);
      uint256 leftover = remaining.mul(rewardRate);
      rewardRate = reward.add(leftover).div(rewardsDuration);
    }

    // Ensure the provided reward amount is not more than the balance in the contract.
    // This keeps the reward rate in the right range, preventing overflows due to
    // very high values of rewardRate in the earned and rewardsPerToken functions;
    // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
    uint256 balance = POP.balanceOf(address(this));
    require(
      rewardRate <= balance.div(rewardsDuration),
      "Provided reward too high"
    );

    lastUpdateTime = block.timestamp;
    periodFinish = block.timestamp.add(rewardsDuration);
    emit RewardAdded(reward);
  }

  // End rewards emission earlier
  function updatePeriodFinish(uint256 timestamp)
    external
    onlyOwner
    updateReward(address(0))
  {
    require(timestamp > block.timestamp, "timestamp cant be in the past");
    periodFinish = timestamp;
  }

  /* ========== MODIFIERS ========== */

  modifier updateReward(address account) {
    rewardPerTokenStored = rewardPerToken();
    lastUpdateTime = lastTimeRewardApplicable();
    if (account != address(0)) {
      rewards[account] = earned(account);
      userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }
    _;
  }

  modifier isInitialised() {
    require(initialised == true, "must initialise contract");
    _;
  }
}
