pragma solidity >=0.6.0 <0.8.0;

import "./Governed.sol";

contract Defended is Governed {
  /* ========== STATE VARIABLES ========== */

  mapping(address => bool) public approved;

  /* ========== EVENTS ========== */

  event AccountApproved(address account);
  event AccountRevoked(address account);

  /* ========== CONSTRUCTOR ========== */

  constructor() public Governed(msg.sender) {}

  /* ========== MUTATIVE FUNCTIONS ========== */

  function approveContractAccess(address account) external onlyGovernance {
    approved[account] = true;
    emit AccountApproved(account);
  }

  function revokeContractAccess(address account) external onlyGovernance {
    approved[account] = false;
    emit AccountRevoked(account);
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  function _defend() internal view {
    require(
      approved[msg.sender] || msg.sender == tx.origin,
      "Access denied for caller"
    );
  }

  /* ========== MODIFIER ========== */

  modifier defend() {
    _defend();
    _;
  }
}
