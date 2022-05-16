// SPDX-License-Identifier: GPL-3.0
// Docgen-SOLC: 0.8.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

interface Uniswap {
  function swapExactETHForTokens(
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external payable returns (uint256[] memory amounts);

  function WETH() external pure returns (address);
}

interface CurveDepositZap {
  function add_liquidity(
    address pool,
    uint256[4] calldata amounts,
    uint256 min_mint_amounts,
    address receiver
  ) external returns (uint256);
}

interface TriPool {
  function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amounts) external;
}

interface CurveAddressProvider {
  function get_registry() external view returns (address);
}

interface CurveRegistry {
  function get_pool_from_lp_token(address lp_token) external view returns (address);
}

contract Faucet {
  Uniswap public uniswap;
  CurveDepositZap public curveDepositZap;
  CurveAddressProvider public curveAddressProvider;
  CurveRegistry public curveRegistry;
  address public triPool = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
  IERC20 public dai = IERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F);
  IERC20 public threeCrv = IERC20(0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490);

  constructor(
    address uniswap_,
    address curveAddressProvider_,
    address curveDepositZap_
  ) {
    uniswap = Uniswap(uniswap_);
    curveDepositZap = CurveDepositZap(curveDepositZap_);
    curveAddressProvider = CurveAddressProvider(curveAddressProvider_);
    curveRegistry = CurveRegistry(curveAddressProvider.get_registry());
    dai.approve(address(curveDepositZap), type(uint256).max);
    dai.approve(address(triPool), type(uint256).max);
  }

  function sendTokens(
    address token,
    uint256 amount,
    address recipient
  ) public {
    address[] memory path = new address[](2);
    path[0] = uniswap.WETH();
    console.log(IERC20(path[0]).balanceOf(msg.sender));
    path[1] = token;
    uniswap.swapExactETHForTokens{value: amount * 1 ether}(0, path, recipient, block.timestamp);
  }

  function sendCurveLPTokens(
    address lpToken,
    uint256 amount,
    address recipient
  ) public {
    address[] memory path = new address[](2);
    path[0] = uniswap.WETH();
    path[1] = address(dai);
    uint256 daiAmount = uniswap.swapExactETHForTokens{value: amount * 1 ether}(0, path, address(this), block.timestamp)[
      1
    ];
    address curvePool = curveRegistry.get_pool_from_lp_token(lpToken);
    curveDepositZap.add_liquidity(curvePool, [0, daiAmount, 0, 0], 0, recipient);
  }

  function sendThreeCrv(uint256 amount, address recipient) public {
    address[] memory path = new address[](2);
    path[0] = uniswap.WETH();
    path[1] = address(dai);
    uint256 daiAmount = uniswap.swapExactETHForTokens{value: amount * 1 ether}(0, path, address(this), block.timestamp)[
      1
    ];
    TriPool(triPool).add_liquidity([daiAmount, 0, 0], 0);
    threeCrv.transfer(recipient, threeCrv.balanceOf(address(this)));
  }
}
