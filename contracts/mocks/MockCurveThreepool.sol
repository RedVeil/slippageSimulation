// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import "./MockERC20.sol";

contract MockCurveThreepool {
  MockERC20 lpToken;
  MockERC20 dai;
  MockERC20 usdc;
  MockERC20 usdt;

  uint256 virtualPrice = 1e18;

  uint256 withdrawalSlippageBps = 10;

  uint256 BPS_DENOMINATOR = 10000;
  MockERC20[] tokens;

  event LiquidityAdded(uint256 lpToken, address account);
  event EchoValues(uint256 amount);

  constructor(
    address lpToken_,
    address dai_,
    address usdc_,
    address usdt_
  ) {
    lpToken = MockERC20(lpToken_);
    dai = MockERC20(dai_);
    usdc = MockERC20(usdc_);
    usdt = MockERC20(usdt_);
    tokens = [dai, usdc, usdt];
  }

  function coins(uint256 i) external view returns (address) {
    return address(tokens[i]);
  }

  function get_virtual_price() external view returns (uint256) {
    return virtualPrice;
  }

  function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amounts)
    external
    returns (uint256)
  {
    require(amounts[0] > 0, "dai must be larger 0");
    require(min_mint_amounts == 0, "min_mint_amounts must be 0");
    uint256 lpTokens;
    for (uint8 i = 0; i < tokens.length; i++) {
      tokens[i].transferFrom(msg.sender, address(this), amounts[i]);
      lpToken.mint(msg.sender, amounts[i]);
      lpTokens += amounts[i];
    }
    emit LiquidityAdded(lpTokens, msg.sender);
    return lpTokens;
  }

  function remove_liquidity_one_coin(
    uint256 _token_amount,
    int128 i,
    uint256 min_amount
  ) external {
    lpToken.transferFrom(msg.sender, address(this), _token_amount);

    uint256 slippage = (_token_amount * withdrawalSlippageBps) / 10000;
    uint256 transferOut = _token_amount - slippage;

    uint256 idx = uint256(i);
    tokens[idx].approve(address(this), transferOut);
    tokens[idx].mint(address(this), transferOut);
    tokens[idx].transferFrom(address(this), msg.sender, transferOut);
  }

  // Test helpers

  function setVirtualPrice(uint256 virtualPrice_) external {
    virtualPrice = virtualPrice_;
  }

  function setWithdrawalSlippage(uint256 withdrawalSlippageBps_) external {
    withdrawalSlippageBps = withdrawalSlippageBps_;
  }
}
