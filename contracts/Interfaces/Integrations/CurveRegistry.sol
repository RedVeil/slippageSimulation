pragma solidity >=0.6.0 <0.8.0;

interface CurveRegistry {
  function get_pool_from_lp_token(address lp_token)
    external
    view
    returns (address);

  function get_lp_token(address pool) external view returns (address);

  function get_coins(address pool) external view returns (address[8] memory);

  function get_underlying_coins(address pool)
    external
    view
    returns (address[8] memory);
}
