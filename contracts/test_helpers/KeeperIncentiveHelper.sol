// SPDX-License-Identifier: GPL-3.0
// Docgen-SOLC: 0.8.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../core/utils/KeeperIncentive.sol";

contract KeeperIncentiveHelper {
  using SafeERC20 for IERC20;

  KeeperIncentive public keeperIncentive;
  bytes32 public immutable contractName = "KeeperIncentiveHelper";

  event FunctionCalled(address account);

  constructor(KeeperIncentive keeperIncentive_) {
    keeperIncentive = keeperIncentive_;
  }

  function incentivisedFunction() public {
    keeperIncentive.handleKeeperIncentive(contractName, 0, msg.sender);
    emit FunctionCalled(msg.sender);
  }
}
