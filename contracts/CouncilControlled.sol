pragma solidity >=0.7.0 <0.8.0;

import "./Interfaces/IRegion.sol";

// https://docs.synthetix.io/contracts/source/contracts/owned
contract CouncilControlled {
  /* ========== STATE VARIABLES ========== */

  IRegion internal region;
  mapping(bytes2 => address) public council;
  mapping(bytes2 => address) public nominatedCouncil;

  /* ========== EVENTS ========== */

  event CouncilNominated(bytes2 _region, address newCouncil);
  event CouncilChanged(bytes2 _region, address oldCouncil, address newCouncil);

  /* ========== CONSTRUCTOR ========== */

  constructor(address _council, IRegion _region) public {
    require(_council != address(0), "Council address cannot be 0");
    council[0x5757] = _council; //defaultRegion ("WW" in bytes)
    region = _region;
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  function nominateNewCouncil(address _council, bytes2 _region)
    external
    onlyCouncil(_region)
  {
    nominatedCouncil[_region] = _council;
    emit CouncilNominated(_region, _council);
  }

  function acceptCouncil(bytes2 _region) external {
    require(
      msg.sender == nominatedCouncil[_region],
      "You must be nominated before you can accept council"
    );
    emit CouncilChanged(_region, council[_region], nominatedCouncil[_region]);

    council[_region] = nominatedCouncil[_region];
    nominatedCouncil[_region] = address(0);
  }

  function nominateFirstCouncil(address _council, bytes2 _region)
    external
    onlyCouncil(region.defaultRegion())
  {
    require(region.regionExists(_region), "region doesnt exist");
    require(council[_region] == address(0), "region already has a council");
    nominatedCouncil[_region] = _council;
    emit CouncilNominated(_region, _council);
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  function _onlyCouncil(bytes2 _region) private view {
    require(
      msg.sender == council[_region],
      "Only the contract council may perform this action"
    );
  }

  function getCouncil(bytes2 _region) public view returns (address) {
    return council[_region];
  }

  /* ========== MODIFIER ========== */

  modifier onlyCouncil(bytes2 _region) {
    _onlyCouncil(_region);
    _;
  }
}
