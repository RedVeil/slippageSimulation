pragma solidity >=0.6.0 <0.8.0;

// https://docs.synthetix.io/contracts/source/contracts/owned
contract Governed {
  /* ========== STATE VARIABLES ========== */

  address public governance;
  address public nominatedGovernance;

  /* ========== EVENTS ========== */

  event GovernanceNominated(address newGovernance);
  event GovernanceChanged(address oldGovernance, address newGovernance);

  /* ========== CONSTRUCTOR ========== */

  constructor(address _governance) public {
    require(_governance != address(0), "Governance address cannot be 0");
    governance = _governance;
    emit GovernanceChanged(address(0), _governance);
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  function nominateNewGovernance(address _governance) external onlyGovernance {
    nominatedGovernance = _governance;
    emit GovernanceNominated(_governance);
  }

  function acceptGovernance() external {
    require(
      msg.sender == nominatedGovernance,
      "You must be nominated before you can accept governance"
    );
    emit GovernanceChanged(governance, nominatedGovernance);
    governance = nominatedGovernance;
    nominatedGovernance = address(0);
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  function _onlyGovernance() private view {
    require(
      msg.sender == governance,
      "Only the contract governance may perform this action"
    );
  }

  /* ========== MODIFIER ========== */

  modifier onlyGovernance() {
    _onlyGovernance();
    _;
  }
}
