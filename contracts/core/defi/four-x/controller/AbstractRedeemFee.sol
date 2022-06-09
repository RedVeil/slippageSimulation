// SPDX-License-Identifier: GPL-3.0
// Docgen-SOLC: 0.8.0

pragma solidity ^0.8.0;

import { IERC20, SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../../utils/ACLAuth.sol";

abstract contract AbstractRedeemFee is ACLAuth {
  using SafeERC20 for IERC20;

  struct RedemptionFee {
    uint256 accumulated;
    uint256 rate;
    address recipient;
    IERC20 token;
  }
  RedemptionFee public redemptionFee;

  event RedemptionFeeUpdated(uint256 newRedemptionFee, address newFeeRecipient);

  /**
   * @notice Changes the redemption fee rate and the fee recipient
   * @param _feeRate Redemption fee rate in basis points
   * @param _recipient The recipient which receives these fees (Should be DAO treasury)
   * @dev Per default both of these values are not set. Therefore a fee has to be explicitly be set with this function
   */
  function setRedemptionFee(uint256 _feeRate, address _recipient) external onlyRole(DAO_ROLE) {
    require(_feeRate <= 100, "dont be greedy");
    redemptionFee.rate = _feeRate;
    redemptionFee.recipient = _recipient;
    emit RedemptionFeeUpdated(_feeRate, _recipient);
  }

  /**
   * @notice Claims all accumulated redemption fees in DAI
   */
  function claimRedemptionFee() external {
    redemptionFee.token.safeTransfer(redemptionFee.recipient, redemptionFee.accumulated);
    redemptionFee.accumulated = 0;
  }
}
