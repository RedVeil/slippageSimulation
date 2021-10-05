pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./lib/Owned.sol";
import "./Interfaces/IStaking.sol";
import "./Interfaces/IRewardsEscrow.sol";

contract RewardsEscrow is IRewardsEscrow, Owned, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  /* ========== STATE VARIABLES ========== */
  struct Escrow {
    uint256 start;
    uint256 end;
    uint256 balance;
    bool claimed;
  }

  IERC20 public immutable POP;
  IStaking public staking;
  mapping(bytes32 => Escrow) public escrows;
  mapping(address => bytes32[]) public escrowIds;
  uint256 public escrowDuration = 90 days;
  uint256 public vestingCliff = 90 days;

  /* ========== EVENTS ========== */
  event Locked(address account, uint256 amount);
  event RewardsClaimed(address account_, uint256 amount);
  event StakingChanged(IStaking _staking);
  event EscrowDurationChanged(uint256 _escrowDuration);
  event VestingCliffChanged(uint256 _vestingCliff);

  /* ========== CONSTRUCTOR ========== */

  constructor(IERC20 _pop) Owned(msg.sender) {
    POP = _pop;
  }

  /* ========== VIEWS ========== */

  /**
   * @notice Returns the escrow status
   * @param escrowId_ Bytes32
   */
  function isClaimable(bytes32 escrowId_) external view returns (bool) {
    return
      escrows[escrowId_].start <= block.timestamp &&
      escrows[escrowId_].start != 0 &&
      escrows[escrowId_].claimed == false;
  }

  /**
   * @notice Returns all escrowIds which an account has/had claims in
   * @param account address
   */
  function getEscrowsByUser(address account)
    external
    view
    returns (bytes32[] memory)
  {
    return escrowIds[account];
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  /**
   * @notice Locks funds for escrow
   * @dev This creates a seperate escrow structure which can later be iterated upon to unlock the escrowed funds
   */
  function lock(address account_, uint256 amount_)
    external
    override
    nonReentrant
  {
    require(msg.sender == address(staking), "you cant call this function");
    require(amount_ > 0, "amount must be greater than 0");
    require(POP.balanceOf(msg.sender) >= amount_, "insufficient balance");

    uint256 _now = block.timestamp;
    uint256 _start = _now.add(vestingCliff);
    uint256 _end = _start.add(escrowDuration);
    bytes32 id = keccak256(abi.encodePacked(account_, amount_, _now));

    escrows[id] = Escrow({
      start: _start,
      end: _end,
      balance: amount_,
      claimed: false
    });
    escrowIds[account_].push(id);

    POP.safeTransferFrom(msg.sender, address(this), amount_);

    emit Locked(account_, amount_);
  }

  /**
   * @notice Claim vested funds in escrow
   * @dev Uses the escrowId at the specified index of escrowIds.
   * @dev This function is used when a user only wants to claim a specific escrowVault or if they decide the gas cost of claimRewards are to high for now.
   * @dev (lower cost but also lower reward)
   */
  function claimReward(bytes32 escrowId_) external nonReentrant {
    uint256 reward = _claimReward(msg.sender, escrowId_);
    require(reward > 0, "no rewards");

    POP.safeTransfer(msg.sender, reward);

    emit RewardsClaimed(msg.sender, reward);
  }

  /**
   * @notice Claim rewards of a a number of escrows
   * @dev Uses the vaultIds at the specified indices of escrowIds.
   * @dev This function is used when a user only wants to claim multiple escrowVaults at once (probably most of the time)
   * @dev The array of indices is limited to 20 as we want to prevent gas overflow of looping through too many vaults
   * TODO the upper bound of indices that can be used should be calculated with a simulation
   */
  function claimRewards(bytes32[] calldata escrowIds_) external nonReentrant {
    require(escrowIds_.length <= 20, "claiming too many escrows");
    uint256 total;

    for (uint256 i = 0; i < escrowIds_.length; i++) {
      total = total.add(_claimReward(msg.sender, escrowIds_[i]));
    }
    require(total > 0, "no rewards");

    POP.safeTransfer(msg.sender, total);

    emit RewardsClaimed(msg.sender, total);
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  /**
   * @notice Underlying function to calculate the rewards that a user gets
   * @dev We dont want it to error when a vault is empty for the user as this would terminate the entire loop when used in claimRewards()
   * @dev It marks the escrow as claimed when the whole balance was claimed
   */
  function _claimReward(address account_, bytes32 escrowId_)
    internal
    returns (uint256)
  {
    Escrow storage escrow = escrows[escrowId_];
    if (escrow.start <= block.timestamp) {
      uint256 claimable = _getClaimableAmount(escrow);
      if (claimable == escrow.balance) {
        escrow.claimed = true;
      }
      return claimable;
    }
    return 0;
  }

  function _getClaimableAmount(Escrow memory escrow)
    internal
    returns (uint256)
  {
    if (escrow.start == 0 || escrow.end == 0) {
      return 0;
    }
    return
      Math.min(
        (escrow.balance.mul(block.timestamp.sub(escrow.start))).div(
          escrow.end.sub(escrow.start)
        ),
        escrow.balance
      );
  }

  function updateEscrowDuration(uint256 _escrowDuration) external onlyOwner {
    escrowDuration = _escrowDuration;
    emit EscrowDurationChanged(_escrowDuration);
  }

  function updateCliff(uint256 _vestingCliff) external onlyOwner {
    vestingCliff = _vestingCliff;
    emit VestingCliffChanged(_vestingCliff);
  }

  function setStaking(IStaking _staking) external onlyOwner {
    require(staking != _staking, "Same Staking");
    staking = _staking;
    emit StakingChanged(_staking);
  }
}
