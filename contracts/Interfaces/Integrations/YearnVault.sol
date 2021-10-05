pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

interface YearnVault is IERC20 {
  function token() external view returns (address);

  function deposit(uint256 amount) external;

  function withdraw(uint256 amount) external;

  function pricePerShare() external view returns (uint256);
}
