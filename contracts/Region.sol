pragma solidity >=0.7.0 <0.8.0;

import "./Governed.sol";
import "./Interfaces/IRegion.sol";

contract Region is IRegion, Governed {
  bytes2 public immutable override defaultRegion = 0x5757; //"WW" in bytes2
  bytes2[] public regions;
  address[] public beneficiaryVaults;
  mapping(bytes2 => bool) public override regionExists;
  mapping(bytes2 => address) public override regionVaults;

  event RegionAdded(bytes2 region);

  constructor(address beneficiaryVault_) public Governed(msg.sender) {
    regions.push(0x5757);
    regionExists[0x5757] = true;
    beneficiaryVaults.push(beneficiaryVault_);
    regionVaults[0x5757] = beneficiaryVault_;
  }

  function getAllRegions() public view override returns (bytes2[] memory) {
    return regions;
  }

  function getAllVaults() public view override returns (address[] memory) {
    return beneficiaryVaults;
  }

  function addRegion(bytes2 region_, address beneficiaryVault_)
    external
    override
    onlyGovernance
  {
    require(regionExists[region_] == false, "region already exists");
    regions.push(region_);
    regionExists[region_] = true;
    beneficiaryVaults.push(beneficiaryVault_);
    regionVaults[region_] = beneficiaryVault_;
    emit RegionAdded(region_);
  }
}
