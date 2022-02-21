import "../core/interfaces/IContractRegistry.sol";
import "../core/utils/ContractRegistryAccess.sol";
import "../core/utils/KeeperIncentivized.sol";

contract KeeperIncentivizedHelper is KeeperIncentivized, ContractRegistryAccess {
  bytes32 public immutable contractName = keccak256("KeeperIncentivizedHelper");

  constructor(IContractRegistry _contractRegistry) ContractRegistryAccess(_contractRegistry) {}

  function handleKeeperIncentiveModifierCall() public keeperIncentive(contractName, 0) {}

  function handleKeeperIncentiveDirectCall() public {
    _handleKeeperIncentive(contractName, 0, msg.sender);
  }

  function _getContract(bytes32 _name)
    internal
    view
    override(KeeperIncentivized, ContractRegistryAccess)
    returns (address)
  {
    return super._getContract(_name);
  }
}
