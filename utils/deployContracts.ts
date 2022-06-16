import BasicIssuanceModuleAbi from "@setprotocol/set-protocol-v2/artifacts/contracts/protocol/modules/BasicIssuanceModule.sol/BasicIssuanceModule.json";
import SetToken from "@setprotocol/set-protocol-v2/artifacts/contracts/protocol/SetToken.sol/SetToken.json";
import SetTokenCreator from "@setprotocol/set-protocol-v2/artifacts/contracts/protocol/SetTokenCreator.sol/SetTokenCreator.json";
import FactoryMetapoolAbi from "../Curve/FactoryMetapoolAbi.json";
import {
  ERC20,
  CurveMetapool,
  BasicIssuanceModule,
  Faucet,
  FourXBatchProcessing,
  MockYearnV2Vault,
} from "../typechain";
import { utils } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

interface Token {
  ySUSD: ERC20;
  y3Eur: ERC20;
  crvSUSD: ERC20;
  crv3Eur: ERC20;
  usdc: ERC20;
  pop: ERC20;
  setToken: ERC20;
}

interface Metapools {
  frax: CurveMetapool;
  rai: CurveMetapool;
  musd: CurveMetapool;
  alusd: CurveMetapool;
}

interface Vaults {
  frax: MockYearnV2Vault;
  rai: MockYearnV2Vault;
  musd: MockYearnV2Vault;
  alusd: MockYearnV2Vault;
}
export interface Contracts {
  token: Token;
  faucet: Faucet;
  basicIssuanceModule: BasicIssuanceModule;
  fourXBatchProcessing: FourXBatchProcessing;
  threePool: CurveMetapool;
}

const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const CURVE_ADDRESS_PROVIDER_ADDRESS =
  "0x0000000022D53366457F9d5E68Ec105046FC4383";
const CURVE_FACTORY_METAPOOL_DEPOSIT_ZAP_ADDRESS =
  "0xA79828DF1850E8a3A3064576f380D90aECDD3359";

const SET_TOKEN_CREATOR_ADDRESS = "0xeF72D3278dC3Eba6Dc2614965308d1435FFd748a";
const SET_BASIC_ISSUANCE_MODULE_ADDRESS =
  "0xd8EF3cACe8b4907117a45B0b125c68560532F94D";
const THREE_POOL_ADDRESS = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const USDC_WHALE_ADDRESS = "0xcffad3200574698b78f32232aa9d63eabd290703";

const Y_SUSD_ADDRESS = "0x5a770DbD3Ee6bAF2802D29a901Ef11501C44797A";
const Y_3EUR_ADDRESS = "0x5AB64C599FcC59f0f2726A300b03166A395578Da";

const SUSD_WITHDRAWAL_POOL_ADDRESS = "0xFCBa3E75865d2d561BE8D220616520c171F12851";
const CRV_SUSD_ADDRESS = "0xC25a3A3b969415c80451098fa907EC722572917F";
const SUSD_METAPOOL_ADDRESS = "0xA5407eAE9Ba41422680e2e00537571bcC53efBfD";
const THREE_EUR_METAPOOL_ADDRESS = "0xb9446c4Ef5EBE66268dA6700D26f96273DE3d571";
const EURS_METAPOOL_ADDRESS = "0x98a7F18d4E56Cfe84E3D081B40001B3d5bD3eB8B";

const ANGLE_ROUTER_ADDRESS = "0xBB755240596530be0c1DE5DFD77ec6398471561d";
const AG_EUR_ADDRESS = "0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8";


export async function deployToken(
  ethers,
  owner: SignerWithAddress
): Promise<Token> {
  const setTokenCreator = await ethers.getContractAt(
    SetTokenCreator.abi,
    SET_TOKEN_CREATOR_ADDRESS
  );


  const setTokenAddress = await setTokenCreator.callStatic.create(
    [Y_SUSD_ADDRESS, Y_3EUR_ADDRESS],
    [parseEther("50"), parseEther("50")],
    [SET_BASIC_ISSUANCE_MODULE_ADDRESS],
    owner.address,
    "3X",
    "3X"
  );
  await setTokenCreator.create(
    [Y_SUSD_ADDRESS, Y_3EUR_ADDRESS],
    [parseEther("50"), parseEther("50")],
    [SET_BASIC_ISSUANCE_MODULE_ADDRESS],
    owner.address,
    "3X",
    "3X"
  );

  const setToken = (await ethers.getContractAt(
    SetToken.abi,
    setTokenAddress
  )) as ERC20;

  const usdc = (await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
    USDC_ADDRESS
  )) as ERC20;

  const ySUSD = (await ethers.getContractAt("ERC20", Y_SUSD_ADDRESS)) as ERC20;
  const y3Eur = (await ethers.getContractAt("ERC20", Y_3EUR_ADDRESS)) as ERC20;

  const crvSUSD = (await ethers.getContractAt(
    "ERC20",
    CRV_SUSD_ADDRESS
  )) as ERC20;
  const crv3Eur = (await ethers.getContractAt(
    "ERC20",
    THREE_EUR_METAPOOL_ADDRESS
  )) as ERC20;

  const MockERC20 = await ethers.getContractFactory("MockERC20");

  const pop = await (await MockERC20.deploy("POP", "POP", 18)).deployed();

  return {
    ySUSD,
    y3Eur,
    crvSUSD,
    crv3Eur,
    usdc,
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

  const threePool = (await ethers.getContractAt(
    FactoryMetapoolAbi,
    THREE_POOL_ADDRESS
  )) as CurveMetapool;

  const basicIssuanceModule = await ethers.getContractAt(
    BasicIssuanceModuleAbi.abi,
    SET_BASIC_ISSUANCE_MODULE_ADDRESS
  );

  await basicIssuanceModule
    .connect(owner)
    .initialize(
      token.setToken.address,
      "0x0000000000000000000000000000000000000000"
    );

    const fourXBatchProcessing = await (
      await (
        await ethers.getContractFactory("FourXBatchProcessing")
      ).deploy(
        contractRegistry.address,
        staking.address,
        { sourceToken: token.usdc.address, targetToken: token.setToken.address }, // mint batch
        { sourceToken: token.setToken.address, targetToken: token.usdc.address }, // redeem batch
        SET_BASIC_ISSUANCE_MODULE_ADDRESS,
        [Y_SUSD_ADDRESS, Y_3EUR_ADDRESS],
        [
          {
            lpToken: CRV_SUSD_ADDRESS,
            utilityPool: SUSD_WITHDRAWAL_POOL_ADDRESS,
            curveMetaPool: SUSD_METAPOOL_ADDRESS,
            angleRouter: ethers.constants.AddressZero,
          },
          {
            lpToken: THREE_EUR_METAPOOL_ADDRESS,
            utilityPool: EURS_METAPOOL_ADDRESS,
            curveMetaPool: THREE_EUR_METAPOOL_ADDRESS,
            angleRouter: ANGLE_ROUTER_ADDRESS,
          },
        ],
        AG_EUR_ADDRESS,
        {
          batchCooldown: 0,
          mintThreshold: parseEther("0"),
          redeemThreshold: parseEther("0"),
        }
      )
    ).deployed();

  await aclRegistry.grantRole(ethers.utils.id("DAO"), owner.address);
  await aclRegistry.grantRole(ethers.utils.id("Keeper"), owner.address);

  await fourXBatchProcessing.connect(owner).setSlippage(1000, 1000);

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
      fourXBatchProcessing.address
    );

  return {
    token,
    faucet,
    basicIssuanceModule,
    fourXBatchProcessing,
    threePool,
  };
}
