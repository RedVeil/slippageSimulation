// SPDX-License-Identifier: GPL-3.0
// Docgen-SOLC: 0.8.0

pragma solidity ^0.8.0;

interface ISynthetix {
  function exchange(
    bytes32 src,
    uint256 fromAmount,
    bytes32 dest
  ) external;
}
