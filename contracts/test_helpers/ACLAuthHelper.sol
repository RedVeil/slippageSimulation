// SPDX-License-Identifier: GPL-3.0
// Docgen-SOLC: 0.8.0

pragma solidity ^0.8.0;

import "../core/interfaces/IContractRegistry.sol";
import "../core/utils/ContractRegistryAccess.sol";
import "../core/utils/ACLAuth.sol";

contract ACLAuthHelper is ACLAuth, ContractRegistryAccess {
  OtherContract public otherContract;
  bytes32 internal constant TEST_PERMISSION = keccak256("Test Permission");

  constructor(IContractRegistry _contractRegistry) ContractRegistryAccess(_contractRegistry) {
    otherContract = new OtherContract(_contractRegistry);
  }

  function onlyKeeperModifier() public onlyRole(KEEPER_ROLE) {}

  function onlyDaoModifier() public onlyRole(DAO_ROLE) {}

  function hasKeeperRole() public view returns (bool) {
    return _hasRole(KEEPER_ROLE, msg.sender);
  }

  function onlyKeeperRequireRole() public view {
    _requireRole(KEEPER_ROLE);
  }

  function onlyDaoRequireRole() public view {
    _requireRole(DAO_ROLE);
  }

  function requireKeeperRoleWithAddress(address account) public view {
    _requireRole(KEEPER_ROLE, account);
  }

  function hasTestPermission() public view returns (bool) {
    return _hasPermission(TEST_PERMISSION, msg.sender);
  }

  function onlyTestPermissionModifier() public onlyPermission(TEST_PERMISSION) {}

  function onlyTestPermissionRequirePermission() public view {
    _requirePermission(TEST_PERMISSION);
  }

  function requirePermissionWithAddress(address account) public view {
    _requirePermission(TEST_PERMISSION, account);
  }

  function callOtherContractWithIsApprovedContractOrEOAModifier() public {
    otherContract.testApprovedContractOrEOAModifier();
  }

  function callOtherContractWithRequireApprovedContractOrEOA() public view {
    otherContract.testApprovedContractOrEOARequire();
  }

  function callOtherContractWithRequireApprovedContractOrEOAWithAddress(address account) public view {
    otherContract.testApprovedContractOrEOARequireWithAddress(account);
  }

  function _getContract(bytes32 _name) internal view override(ACLAuth, ContractRegistryAccess) returns (address) {
    return super._getContract(_name);
  }
}

contract OtherContract is ACLAuth, ContractRegistryAccess {
  constructor(IContractRegistry _contractRegistry) ContractRegistryAccess(_contractRegistry) {}

  function testApprovedContractOrEOAModifier() public onlyApprovedContractOrEOA {}

  function testApprovedContractOrEOARequire() public view {
    _requireApprovedContractOrEOA();
  }

  function testApprovedContractOrEOARequireWithAddress(address account) public view {
    _requireApprovedContractOrEOA(account);
  }

  function _getContract(bytes32 _name) internal view override(ACLAuth, ContractRegistryAccess) returns (address) {
    return super._getContract(_name);
  }
}
