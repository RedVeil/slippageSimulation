// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <=0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Interfaces/IRegion.sol";
import "./Interfaces/IBeneficiaryRegistry.sol";
import "./CouncilControlled.sol";
import "./Governed.sol";

contract BeneficiaryRegistry is
  IBeneficiaryRegistry,
  Ownable,
  CouncilControlled
{
  struct Beneficiary {
    bytes applicationCid; // ipfs address of application
    bytes2 region;
    uint256 listPointer;
  }

  /* ========== STATE VARIABLES ========== */

  mapping(address => Beneficiary) private beneficiariesMap;
  address[] private beneficiariesList;

  /* ========== EVENTS ========== */

  event BeneficiaryAdded(
    address indexed _address,
    bytes indexed _applicationCid
  );
  event BeneficiaryRevoked(address indexed _address);

  /* ========== CONSTRUCTOR ========== */

  constructor(IRegion _region)
    Ownable()
    CouncilControlled(msg.sender, _region)
  {}

  /* ========== VIEW FUNCTIONS ========== */

  /**
   * @notice check if beneficiary exists in the registry
   */
  function beneficiaryExists(address _address)
    public
    view
    override
    returns (bool)
  {
    if (beneficiariesList.length == 0) return false;
    return
      beneficiariesList[beneficiariesMap[_address].listPointer] == _address;
  }

  /**
   * @notice get beneficiary's application cid from registry. this cid is the address to the beneficiary application that is included in the beneficiary nomination proposal.
   */
  function getBeneficiary(address _address) public view returns (bytes memory) {
    return beneficiariesMap[_address].applicationCid;
  }

  function getBeneficiaryList() public view returns (address[] memory) {
    return beneficiariesList;
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  /**
   * @notice add a beneficiary with their IPFS cid to the registry
   * TODO: allow only election contract to modify beneficiary
   */
  function addBeneficiary(
    address account,
    bytes2 region,
    bytes calldata applicationCid
  ) external override onlyOwner {
    require(account == address(account), "invalid address");
    require(applicationCid.length > 0, "!application");
    require(!beneficiaryExists(account), "exists");

    beneficiariesList.push(account);
    beneficiariesMap[account] = Beneficiary({
      applicationCid: applicationCid,
      region: region,
      listPointer: beneficiariesList.length - 1
    });

    emit BeneficiaryAdded(account, applicationCid);
  }

  /**
   * @notice remove a beneficiary from the registry. (callable only by council)
   */
  function revokeBeneficiary(address _address) external override {
    require(
      msg.sender == owner() ||
        msg.sender == getCouncil(beneficiariesMap[_address].region),
      "Only the owner or council may perform this action"
    );
    require(beneficiaryExists(_address), "exists");
    delete beneficiariesList[beneficiariesMap[_address].listPointer];
    delete beneficiariesMap[_address];
    emit BeneficiaryRevoked(_address);
  }

  /* ========== MODIFIER ========== */

  modifier validAddress(address _address) {
    require(_address == address(_address), "invalid address");
    _;
  }
}
