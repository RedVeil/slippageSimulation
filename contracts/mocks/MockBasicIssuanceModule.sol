pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./MockERC20.sol";

contract MockBasicIssuanceModule {
  using SafeERC20 for MockERC20;
  using SafeMath for uint256;

  address[] public underlying;
  uint256[] public quantities;

  event SetIssued(address setToken, uint256 amount, address to);
  event SetRedeemed(address setToken, uint256 amount, address to);

  constructor(address[] memory underlying_, uint256[] memory quantities_) {
    underlying = underlying_;
    quantities = quantities_;
  }

  function issue(
    address _setToken,
    uint256 _quantity,
    address _to
  ) external {
    for (uint256 i; i < underlying.length; i++) {
      uint256 amount = _quantity.mul(quantities[i]);
      require(
        MockERC20(underlying[i]).balanceOf(msg.sender) >= amount,
        "not enough underlying token"
      );
      MockERC20(underlying[i]).transferFrom(msg.sender, address(this), amount);
    }
    MockERC20(_setToken).mint(_to, _quantity);
    emit SetIssued(_setToken, _quantity, _to);
  }

  function redeem(
    address _setToken,
    uint256 _quantity,
    address _to
  ) external {
    require(MockERC20(_setToken).balanceOf(msg.sender) >= _quantity);
    MockERC20(_setToken).transferFrom(msg.sender, address(this), _quantity);
    for (uint256 i; i < underlying.length; i++) {
      uint256 amount = _quantity.mul(quantities[i]);
      MockERC20(underlying[i]).approve(address(this), amount);
      MockERC20(underlying[i]).transfer(_to, amount);
    }
    emit SetRedeemed(_setToken, _quantity, msg.sender);
  }

  function getRequiredComponentUnitsForIssue(
    address _setToken,
    uint256 _quantity
  ) public view returns (address[] memory, uint256[] memory) {
    uint256[] memory notionalUnits = new uint256[](underlying.length);

    for (uint256 i = 0; i < underlying.length; i++) {
      notionalUnits[i] = _quantity.mul(quantities[i]);
    }

    return (underlying, notionalUnits);
  }
}
