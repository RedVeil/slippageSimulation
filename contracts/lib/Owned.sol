pragma solidity >=0.7.0 <0.8.0;

// https://docs.synthetix.io/contracts/source/contracts/owned
contract Owned {
  /* ========== STATE VARIABLES ========== */

  address public owner;
  address public nominatedOwner;

  /* ========== EVENTS ========== */

  event OwnerNominated(address newOwner);
  event OwnerChanged(address oldOwner, address newOwner);

  /* ========== CONSTRUCTOR ========== */

  constructor(address _owner) public {
    require(_owner != address(0), "Owner address cannot be 0");
    owner = _owner;
    emit OwnerChanged(address(0), _owner);
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  function nominateNewOwner(address _owner) external onlyOwner {
    nominatedOwner = _owner;
    emit OwnerNominated(_owner);
  }

  function acceptOwnership() external {
    require(
      msg.sender == nominatedOwner,
      "You must be nominated before you can accept ownership"
    );
    emit OwnerChanged(owner, nominatedOwner);
    owner = nominatedOwner;
    nominatedOwner = address(0);
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  function _onlyOwner() private view {
    require(
      msg.sender == owner,
      "Only the contract owner may perform this action"
    );
  }

  /* ========== MODIFIER ========== */

  modifier onlyOwner() {
    _onlyOwner();
    _;
  }
}
