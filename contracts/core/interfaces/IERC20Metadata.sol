// SPDX-License-Identifier: GPL-3.0
// Docgen-SOLC: 0.8.0

pragma solidity >=0.6.12;

import "openzeppelin-v3/token/ERC20/IERC20.sol";

interface IERC20Metadata is IERC20 {
  function name() external view returns (string memory);

  function symbol() external view returns (string memory);

  function decimals() external view returns (uint8);
}
