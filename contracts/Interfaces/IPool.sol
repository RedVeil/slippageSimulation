// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

interface IPool {
  function token() external view returns (address);

  function depositFor(uint256 amount, address recipient)
    external
    returns (uint256);

  function transferFrom(
    address sender,
    address recipient,
    uint256 amount
  ) external returns (bool);

  function withdraw(uint256 amount) external returns (uint256);
}