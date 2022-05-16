import BasicIssuanceModuleAbi from "@setprotocol/set-protocol-v2/artifacts/contracts/protocol/modules/BasicIssuanceModule.sol/BasicIssuanceModule.json";
import SetToken from "@setprotocol/set-protocol-v2/artifacts/contracts/protocol/SetToken.sol/SetToken.json";
import SetTokenCreator from "@setprotocol/set-protocol-v2/artifacts/contracts/protocol/SetTokenCreator.sol/SetTokenCreator.json";
import {
  FourXBatchProcessing,
  ERC20,
  BasicIssuanceModule,
  ISynthetix,
  Faucet
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "ethers/lib/utils";
import { utils } from "ethers";
import { FormatInputPathObject } from "path";

interface Token {
  yEUR: ERC20;
  yGBP: ERC20;
  yCHF: ERC20;
  yJPY: ERC20;
  sUSD: ERC20;
  dai: ERC20;
  pop: ERC20;
  setToken: ERC20;
}

export interface Contracts {
  token: Token;
  basicIssuanceModule: BasicIssuanceModule;
  butterBatch: FourXBatchProcessing;
  synthetix: ISynthetix;
  faucet:Faucet;
}

const ADDRESS_ZER0 = "0x0000000000000000000000000000000000000000";

const SET_TOKEN_CREATOR_ADDRESS = "0xeF72D3278dC3Eba6Dc2614965308d1435FFd748a";
const SET_BASIC_ISSUANCE_MODULE_ADDRESS =
  "0xd8EF3cACe8b4907117a45B0b125c68560532F94D";

const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const CURVE_ADDRESS_PROVIDER_ADDRESS =
  "0x0000000022D53366457F9d5E68Ec105046FC4383";
const CURVE_FACTORY_METAPOOL_DEPOSIT_ZAP_ADDRESS =
  "0xA79828DF1850E8a3A3064576f380D90aECDD3359";

const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

const IB_AMM_ADDRESS = "0x0a0B06322825cb979678C722BA9932E0e4B5fd90";

const SYNTHETIX_ADDRESS = "0x639032d3900875a4cf4960aD6b9ee441657aA93C";

const Y_CRV_IB_EUR_ADDRESS = "0x67e019bfbd5a67207755D04467D6A70c0B75bF60";
const Y_CRV_IB_GBP_ADDRESS = "0x595a68a8c9D5C230001848B69b1947ee2A607164";
const Y_CRV_IB_CHF_ADDRESS = "0x490bD0886F221A5F79713D3E84404355A9293C50";
const Y_CRV_IB_JPY_ADDRESS = "0x59518884EeBFb03e90a18ADBAAAB770d4666471e";

const IB_EUR_ADDRESS = "0x96e61422b6a9ba0e068b6c5add4ffabc6a4aae27";
const IB_GBP_ADDRESS = "0x69681f8fde45345c3870bcd5eaf4a05a60e7d227";
const IB_CHF_ADDRESS = "0x1CC481cE2BD2EC7Bf67d1Be64d4878b16078F309";
const IB_JPY_ADDRESS = "0x5555f75e3d5278082200fb451d1b6ba946d8e13b";

const S_EUR_ADDRESS = "0xd71ecff9342a5ced620049e616c5035f1db98620";
const S_GBP_ADDRESS = "0x97fe22e7341a0cd8db6f6c021a24dc8f4dad855f";
const S_CHF_ADDRESS = "0x0F83287FF768D1c1e17a42F44d644D7F22e8ee1d";
const S_JPY_ADDRESS = "0xf6b1c627e95bfc3c1b4c9b825a032ff0fbf3e07d";
const S_USD_ADDRESS = "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51";

const EUR_METAPOOL_ADDRESS = "0x19b080FE1ffA0553469D20Ca36219F17Fcf03859";
const GBP_METAPOOL_ADDRESS = "0xD6Ac1CB9019137a896343Da59dDE6d097F710538";
const CHF_METAPOOL_ADDRESS = "0x9c2C8910F113181783c249d8F6Aa41b51Cde0f0c";
const JPY_METAPOOL_ADDRESS = "0x8818a9bb44fbf33502be7c15c500d0c783b73067";

export async function deployToken(
  ethers,
  owner: SignerWithAddress
): Promise<Token> {
  const setTokenCreator = await ethers.getContractAt(
    SetTokenCreator.abi,
    SET_TOKEN_CREATOR_ADDRESS
  );
  const setTokenAddress = await setTokenCreator.callStatic.create(
    [
      Y_CRV_IB_EUR_ADDRESS,
      Y_CRV_IB_GBP_ADDRESS,
      Y_CRV_IB_CHF_ADDRESS,
      Y_CRV_IB_JPY_ADDRESS,
    ],
    [parseEther("25"), parseEther("25"), parseEther("25"), parseEther("25")],
    [SET_BASIC_ISSUANCE_MODULE_ADDRESS],
    owner.address,
    "FourX",
    "4X"
  );

  await setTokenCreator.create(
    [
      Y_CRV_IB_EUR_ADDRESS,
      Y_CRV_IB_GBP_ADDRESS,
      Y_CRV_IB_CHF_ADDRESS,
      Y_CRV_IB_JPY_ADDRESS,
    ],
    [parseEther("25"), parseEther("25"), parseEther("25"), parseEther("25")],
    [SET_BASIC_ISSUANCE_MODULE_ADDRESS],
    owner.address,
    "FourX",
    "4X"
  );

  const setToken = (await ethers.getContractAt(
    SetToken.abi,
    setTokenAddress
  )) as ERC20;

  const yEUR = (await ethers.getContractAt(
    "ERC20",
    Y_CRV_IB_EUR_ADDRESS
  )) as ERC20;
  const yGBP = (await ethers.getContractAt(
    "ERC20",
    Y_CRV_IB_GBP_ADDRESS
  )) as ERC20;
  const yCHF = (await ethers.getContractAt(
    "ERC20",
    Y_CRV_IB_CHF_ADDRESS
  )) as ERC20;
  const yJPY = (await ethers.getContractAt(
    "ERC20",
    Y_CRV_IB_JPY_ADDRESS
  )) as ERC20;
  const sUSD = (await ethers.getContractAt("ERC20", S_USD_ADDRESS)) as ERC20;
  const dai = (await ethers.getContractAt("ERC20", DAI_ADDRESS)) as ERC20;

  const MockERC20 = await ethers.getContractFactory("MockERC20");

  const pop = await (await MockERC20.deploy("POP", "POP", 18)).deployed();

  return {
    yEUR,
    yGBP,
    yCHF,
    yJPY,
    sUSD,
    dai,
    pop,
    setToken,
  };
}

export default async function deployContracts(
  ethers,
  network,
  owner: SignerWithAddress
): Promise<Contracts> {
  const token = await deployToken(ethers, owner);

  const Faucet = await ethers.getContractFactory("Faucet");
  const faucet = await (
    await Faucet.deploy(
      UNISWAP_ROUTER_ADDRESS,
      CURVE_ADDRESS_PROVIDER_ADDRESS,
      CURVE_FACTORY_METAPOOL_DEPOSIT_ZAP_ADDRESS
    )
  ).deployed();


  const basicIssuanceModule = await ethers.getContractAt(
    BasicIssuanceModuleAbi.abi,
    SET_BASIC_ISSUANCE_MODULE_ADDRESS
  );

  await basicIssuanceModule
    .connect(owner)
    .initialize(token.setToken.address, ADDRESS_ZER0);

  const aclRegistry = await (
    await (await ethers.getContractFactory("ACLRegistry")).deploy()
  ).deployed();

  const contractRegistry = await (
    await (
      await ethers.getContractFactory("ContractRegistry")
    ).deploy(aclRegistry.address)
  ).deployed();

  const keeperIncentive = await (
    await (
      await ethers.getContractFactory("KeeperIncentive")
    ).deploy(contractRegistry.address, 0, 0)
  ).deployed();

  const popStaking = await (
    await (
      await ethers.getContractFactory("PopLocker")
    ).deploy(token.pop.address, token.pop.address)
  ).deployed();

  const rewardsEscrow = await (
    await (
      await ethers.getContractFactory("RewardsEscrow")
    ).deploy(token.pop.address)
  ).deployed();

  const staking = await (
    await (
      await ethers.getContractFactory("Staking")
    ).deploy(token.pop.address, token.setToken.address, rewardsEscrow.address)
  ).deployed();

  const ibAMM = await ethers.getContractAt("IibAMM", IB_AMM_ADDRESS);
  const synthetix = await ethers.getContractAt("ISynthetix", SYNTHETIX_ADDRESS);

  const butterBatch = await (
    await (
      await ethers.getContractFactory("FourXBatchProcessing")
    ).deploy(
      contractRegistry.address,
      staking.address,
      token.setToken.address,
      { input: DAI_ADDRESS, output: S_USD_ADDRESS },
      {
        ibAMM: ibAMM.address,
        synthetix: synthetix.address,
        setBasicIssuanceModule: SET_BASIC_ISSUANCE_MODULE_ADDRESS,
      },
      [
        Y_CRV_IB_EUR_ADDRESS,
        Y_CRV_IB_GBP_ADDRESS,
        Y_CRV_IB_CHF_ADDRESS,
        Y_CRV_IB_JPY_ADDRESS,
      ],
      [
        {
          curveMetaPool: EUR_METAPOOL_ADDRESS,
          ibToken: IB_EUR_ADDRESS,
          sToken: S_EUR_ADDRESS,
          sId: ethers.utils.formatBytes32String("sEUR"),
        },
        {
          curveMetaPool: GBP_METAPOOL_ADDRESS,
          ibToken: IB_GBP_ADDRESS,
          sToken: S_GBP_ADDRESS,
          sId: ethers.utils.formatBytes32String("sGBP"),
        },
        {
          curveMetaPool: CHF_METAPOOL_ADDRESS,
          ibToken: IB_CHF_ADDRESS,
          sToken: S_CHF_ADDRESS,
          sId: ethers.utils.formatBytes32String("sCHF"),
        },
        {
          curveMetaPool: JPY_METAPOOL_ADDRESS,
          ibToken: IB_JPY_ADDRESS,
          sToken: S_JPY_ADDRESS,
          sId: ethers.utils.formatBytes32String("sJPY"),
        },
      ],
      {
        batchCooldown: 0,
        mintThreshold: parseEther("1"),
        redeemThreshold: parseEther("1"),
      }
    )
  ).deployed();

  await aclRegistry.grantRole(ethers.utils.id("DAO"), owner.address);
  await aclRegistry.grantRole(ethers.utils.id("Keeper"), owner.address);

  await butterBatch.setApprovals();

  await contractRegistry
    .connect(owner)
    .addContract(
      ethers.utils.id("POP"),
      token.pop.address,
      ethers.utils.id("1")
    );
  await contractRegistry
    .connect(owner)
    .addContract(
      ethers.utils.id("KeeperIncentive"),
      keeperIncentive.address,
      ethers.utils.id("1")
    );
  await contractRegistry
    .connect(owner)
    .addContract(
      ethers.utils.id("PopLocker"),
      popStaking.address,
      ethers.utils.id("1")
    );

  await keeperIncentive
    .connect(owner)
    .createIncentive(
      utils.formatBytes32String("FourXBatchProcessing"),
      0,
      true,
      false
    );

  await keeperIncentive
    .connect(owner)
    .createIncentive(
      utils.formatBytes32String("FourXBatchProcessing"),
      0,
      true,
      false
    );

  await keeperIncentive
    .connect(owner)
    .addControllerContract(
      utils.formatBytes32String("FourXBatchProcessing"),
      butterBatch.address
    );

  await butterBatch.setSlippage(10000, 10000);

  return {
    token,
    basicIssuanceModule,
    butterBatch,
    synthetix,
    faucet
  };
}
