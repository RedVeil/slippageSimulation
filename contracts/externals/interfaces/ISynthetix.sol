// SPDX-License-Identifier: GPL-3.0
// Docgen-SOLC: 0.8.0

pragma solidity ^0.8.0;

interface ISynthetix {
  function exchange(
    bytes32 src,
    uint256 fromAmount,
    bytes32 dest
  ) external;

  function settle(address sender, bytes32 currencyKey) external;

  function settle(bytes32 currencyKey) external;

  function exchangeAtomically(
    address from,
    bytes32 src,
    uint256 fromAmount,
    bytes32 dest,
    address to,
    bytes32 trackingCode
  ) external returns (uint256);

  function exchangeAtomically(
    bytes32 src,
    uint256 fromAmount,
    bytes32 dest,
    bytes32 trackingCode
  ) external returns (uint256);
}
