pragma solidity >=0.6.0 <0.8.0;

interface CurveMetapool {
  function add_liquidity(uint256[2] calldata amounts, uint256 min_mint_amounts)
    external
    returns (uint256);

  function add_liquidity(
    uint256[2] calldata _amounts,
    uint256 _min_mint_amounts,
    address _receiver
  ) external returns (uint256);

  function remove_liquidity_one_coin(
    uint256 amount,
    int128 i,
    uint256 min_underlying_amount
  ) external returns (uint256);

  function calc_withdraw_one_coin(uint256 _token_amount, int128 i)
    external
    view
    returns (uint256);

  function get_virtual_price() external view returns (uint256);
}
