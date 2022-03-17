import BasicIssuanceModuleAbi from "@setprotocol/set-protocol-v2/artifacts/contracts/protocol/modules/BasicIssuanceModule.sol/BasicIssuanceModule.json";
import SetToken from "@setprotocol/set-protocol-v2/artifacts/contracts/protocol/SetToken.sol/SetToken.json";
import SetTokenCreator from "@setprotocol/set-protocol-v2/artifacts/contracts/protocol/SetTokenCreator.sol/SetTokenCreator.json";
import FactoryMetapoolAbi from "../Curve/FactoryMetapoolAbi.json";
import {
  ButterBatchProcessing,
  ERC20,
  CurveMetapool,
  BasicIssuanceModule,
  Faucet,
  MockYearnV2Vault,
} from "../typechain";
import { utils } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

interface Token {
  yFrax: ERC20;
  yRai: ERC20;
  yMusd: ERC20;
  yAlusd:ERC20
  crvFrax: ERC20;
  crvRai: ERC20;
  crvMusd: ERC20;
  crvAlusd:ERC20;
  threeCrv: ERC20;
  pop: ERC20;
  setToken: ERC20;
}

interface Metapools {
  frax: CurveMetapool;
  rai: CurveMetapool;
  musd: CurveMetapool;
  alusd:CurveMetapool;
}

interface Vaults {
  frax: MockYearnV2Vault;
  rai: MockYearnV2Vault;
  musd: MockYearnV2Vault;
  alusd:MockYearnV2Vault;
}
export interface Contracts {
  token: Token;
  faucet: Faucet;
  basicIssuanceModule: BasicIssuanceModule;
  threePool: CurveMetapool;
  metapools: Metapools;
  vaults: Vaults;
  butterBatch: ButterBatchProcessing;
}

const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const CURVE_ADDRESS_PROVIDER_ADDRESS =
  "0x0000000022D53366457F9d5E68Ec105046FC4383";
const CURVE_FACTORY_METAPOOL_DEPOSIT_ZAP_ADDRESS =
  "0xA79828DF1850E8a3A3064576f380D90aECDD3359";

const SET_TOKEN_CREATOR_ADDRESS = "0xeF72D3278dC3Eba6Dc2614965308d1435FFd748a";
const SET_BASIC_ISSUANCE_MODULE_ADDRESS =
  "0xd8EF3cACe8b4907117a45B0b125c68560532F94D";

const THREE_CRV_ADDRESS = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
const THREE_POOL_ADDRESS = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";

const Y_CRV_FRAX_ADDRESS = "0xB4AdA607B9d6b2c9Ee07A275e9616B84AC560139";
const Y_CRV_RAI_ADDRESS = "0x2D5D4869381C4Fce34789BC1D38aCCe747E295AE";
const Y_CRV_MUSD_ADDRESS = "0x8cc94ccd0f3841a468184aCA3Cc478D2148E1757";
const Y_CRV_ALUSD_ADDRESS = "0xA74d4B67b3368E83797a35382AFB776bAAE4F5C8";

const CRV_FRAX_ADDRESS = "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B";
const CRV_RAI_ADDRESS = "0x6BA5b4e438FA0aAf7C1bD179285aF65d13bD3D90";
const CRV_MUSD_ADDRESS = "0x1AEf73d49Dedc4b1778d0706583995958Dc862e6";
const CRV_ALUSD_ADDRESS = "0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c";


const FRAX_METAPOOL_ADDRESS = "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B";
const RAI_METAPOOL_ADDRESS = "0x618788357D0EBd8A37e763ADab3bc575D54c2C7d";
const MUSD_METAPOOL_ADDRESS = "0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6";
const ALUSD_METAPOOL_ADDRESS = "0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c";
 
export async function deployToken(
  ethers,
  owner: SignerWithAddress
): Promise<Token> {
  const setTokenCreator = await ethers.getContractAt(
    SetTokenCreator.abi,
    SET_TOKEN_CREATOR_ADDRESS
  );
  const setTokenAddress = await setTokenCreator.callStatic.create(
    [Y_CRV_RAI_ADDRESS, Y_CRV_FRAX_ADDRESS, Y_CRV_MUSD_ADDRESS,Y_CRV_ALUSD_ADDRESS],
    [parseEther("25"), parseEther("25"), parseEther("25"), parseEther("25")],
    [SET_BASIC_ISSUANCE_MODULE_ADDRESS],
    owner.address,
    "Butter2",
    "BTR2"
  );

  await setTokenCreator.create(
    [Y_CRV_RAI_ADDRESS, Y_CRV_FRAX_ADDRESS, Y_CRV_MUSD_ADDRESS, Y_CRV_ALUSD_ADDRESS],
    [parseEther("25"), parseEther("25"), parseEther("25"), parseEther("25")],
    [SET_BASIC_ISSUANCE_MODULE_ADDRESS],
    owner.address,
    "Butter2",
    "BTR2"
  );

  const setToken = (await ethers.getContractAt(
    SetToken.abi,
    setTokenAddress
  )) as ERC20;

  const yFrax = (await ethers.getContractAt(
    "ERC20",
    Y_CRV_FRAX_ADDRESS
  )) as ERC20;
  const yRai = (await ethers.getContractAt(
    "ERC20",
    Y_CRV_RAI_ADDRESS
  )) as ERC20;
  const yMusd = (await ethers.getContractAt(
    "ERC20",
    Y_CRV_MUSD_ADDRESS
  )) as ERC20;
  const yAlusd = (await ethers.getContractAt(
    "ERC20",
    Y_CRV_ALUSD_ADDRESS
  )) as ERC20;


  const crvFrax = (await ethers.getContractAt(
    "ERC20",
    CRV_FRAX_ADDRESS
  )) as ERC20;
  const crvRai = (await ethers.getContractAt(
    "ERC20",
    CRV_RAI_ADDRESS
  )) as ERC20;
  const crvMusd = (await ethers.getContractAt(
    "ERC20",
    CRV_MUSD_ADDRESS
  )) as ERC20;
  const crvAlusd = (await ethers.getContractAt(
    "ERC20",
    CRV_ALUSD_ADDRESS
  )) as ERC20;

  const threeCrv = (await ethers.getContractAt(
    "ERC20",
    THREE_CRV_ADDRESS
  )) as ERC20;

  const MockERC20 = await ethers.getContractFactory("MockERC20");

  const pop = await (await MockERC20.deploy("POP", "POP", 18)).deployed();

  return {
    yFrax,
    yRai,
    yMusd,
    yAlusd,
    crvFrax,
    crvRai,
    crvMusd,
    crvAlusd,
    threeCrv,
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

  const fraxMetapoolContract = (await ethers.getContractAt(
    FactoryMetapoolAbi,
    FRAX_METAPOOL_ADDRESS
  )) as CurveMetapool;

  const raiMetapoolContract = (await ethers.getContractAt(
    FactoryMetapoolAbi,
    RAI_METAPOOL_ADDRESS
  )) as CurveMetapool;

  const musdMetapoolContract = (await ethers.getContractAt(
    FactoryMetapoolAbi,
    MUSD_METAPOOL_ADDRESS
  )) as CurveMetapool;

  const alusdMetapoolContract = (await ethers.getContractAt(
    FactoryMetapoolAbi,
    ALUSD_METAPOOL_ADDRESS
  )) as CurveMetapool;

  const yFraxVault = (await ethers.getContractAt(
    "MockYearnV2Vault",
    Y_CRV_FRAX_ADDRESS
  )) as MockYearnV2Vault;

  const yRaiVault = (await ethers.getContractAt(
    "MockYearnV2Vault",
    Y_CRV_RAI_ADDRESS
  )) as MockYearnV2Vault;

  const yMusdVault = (await ethers.getContractAt(
    "MockYearnV2Vault",
    Y_CRV_MUSD_ADDRESS
  )) as MockYearnV2Vault;

  const yAlusdVault = (await ethers.getContractAt(
    "MockYearnV2Vault",
    Y_CRV_ALUSD_ADDRESS
  )) as MockYearnV2Vault;

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

  const YTOKEN_ADDRESSES = [
    token.yRai.address,
    token.yFrax.address,
    token.yMusd.address,
    token.yAlusd.address
  ];
  const CRV_DEPENDENCIES = [
    {
      curveMetaPool: raiMetapoolContract.address,
      crvLPToken: token.crvRai.address,
    },
    {
      curveMetaPool: fraxMetapoolContract.address,
      crvLPToken: token.crvFrax.address,
    },
    {
      curveMetaPool: musdMetapoolContract.address,
      crvLPToken: token.crvMusd.address,
    },
    {
      curveMetaPool: alusdMetapoolContract.address,
      crvLPToken: token.crvAlusd.address,
    },
  ];

  const ButterBatchProcessing = await ethers.getContractFactory(
    "ButterBatchProcessing"
  );
  const butterBatch = await (
    await ButterBatchProcessing.deploy(
      contractRegistry.address,
      staking.address,
      token.setToken.address,
      token.threeCrv.address,
      threePool.address,
      basicIssuanceModule.address,
      YTOKEN_ADDRESSES,
      CRV_DEPENDENCIES,
      0,
      parseEther("0"),
      parseEther("0")
    )
  ).deployed();

  await butterBatch.setApprovals();

  await aclRegistry.grantRole(ethers.utils.id("DAO"), owner.address);
  await aclRegistry.grantRole(ethers.utils.id("Keeper"), owner.address);

  await butterBatch.connect(owner).setMintSlippage(1000);
  await butterBatch.connect(owner).setRedeemSlippage(1000);

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
      utils.formatBytes32String("ButterBatchProcessing"),
      0,
      true,
      false
    );

  await keeperIncentive
    .connect(owner)
    .createIncentive(
      utils.formatBytes32String("ButterBatchProcessing"),
      0,
      true,
      false
    );

  await keeperIncentive
    .connect(owner)
    .addControllerContract(
      utils.formatBytes32String("ButterBatchProcessing"),
      butterBatch.address
    );

  return {
    token,
    faucet,
    basicIssuanceModule,
    threePool,
    metapools: {
      frax: fraxMetapoolContract,
      rai: raiMetapoolContract,
      musd: musdMetapoolContract,
      alusd:alusdMetapoolContract
    },
    vaults: {
      frax: yFraxVault,
      rai: yRaiVault,
      musd: yMusdVault,
      alusd:yAlusdVault
    },
    butterBatch,
  };
}
