import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import BasicIssuanceModuleAbi from "@setprotocol/set-protocol-v2/artifacts/contracts/protocol/modules/BasicIssuanceModule.sol/BasicIssuanceModule.json";
import SetTokenAbi from "@setprotocol/set-protocol-v2/artifacts/contracts/protocol/SetToken.sol/SetToken.json";
import {
  BasicIssuanceModule,
  SetToken,
} from "@setprotocol/set-protocol-v2/dist/typechain";
import bluebird from "bluebird";
import { expect } from "chai";
import { ethers, network, waffle } from "hardhat";
import deployContracts, { Contracts } from "../utils/deployContracts";


const provider = waffle.provider;

let contracts: Contracts
let owner:SignerWithAddress

describe("Simulation", function () {
  before(async function () {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.RPC_URL,
            blockNumber: 13942085,
          },
        },
      ],
    });
  });

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    contracts = await deployContracts(ethers,network,owner.address);
    return contracts.faucet.sendThreeCrv(10000, owner.address);
  });

  it("does things",async ()=>{
    console.log("blub")
  })
})
