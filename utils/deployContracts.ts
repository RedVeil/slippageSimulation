import { parseEther } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Network } from "hardhat/types";
import { ComponentMap } from "./HYSIBatchInteractionAdapter";
import CurveMetapoolAbi from "../Curve/CurveMetapoolAbi.json";
import BasicIssuanceModuleAbi from "../SetToken/vendor/set-protocol/artifacts/BasicIssuanceModule.json";
import SetTokenAbi from "../SetToken/vendor/set-protocol/artifacts/SetToken.json";
import { BasicIssuanceModule } from "../SetToken/vendor/set-protocol/types/BasicIssuanceModule";
import { SetToken } from "../SetToken/vendor/set-protocol/types/SetToken";
import {
  CurveMetapool,
  ERC20,
  Faucet,
  HysiBatchInteraction,
  MockERC20,
  MockYearnV2Vault,
} from "../typechain";

export interface Contracts {
  mockPop: MockERC20;
  threeCrv: ERC20;
  crvDUSD: ERC20;
  crvFRAX: ERC20;
  crvUSDN: ERC20;
  crvUST: ERC20;
  threePool: CurveMetapool;
  dusdMetapool: CurveMetapool;
  fraxMetapool: CurveMetapool;
  usdnMetapool: CurveMetapool;
  ustMetapool: CurveMetapool;
  yDUSD: MockYearnV2Vault;
  yFRAX: MockYearnV2Vault;
  yUSDN: MockYearnV2Vault;
  yUST: MockYearnV2Vault;
  hysi: SetToken;
  setToken: SetToken; // alias for hysi
  basicIssuanceModule: BasicIssuanceModule;
  hysiBatchInteraction: HysiBatchInteraction;
  faucet: Faucet;
}

const HYSI_TOKEN_ADDRESS = "0x8d1621a27bb8c84e59ca339cf9b21e15b907e408";

const SET_BASIC_ISSUANCE_MODULE_ADDRESS =
  "0xd8EF3cACe8b4907117a45B0b125c68560532F94D";

const THREE_CRV_TOKEN_ADDRESS = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";

const THREEPOOL_ADDRESS = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
const CRV_DUSD_TOKEN_ADDRESS = "0x3a664Ab939FD8482048609f652f9a0B0677337B9";
const CRV_FRAX_TOKEN_ADDRESS = "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B";
const CRV_USDN_TOKEN_ADDRESS = "0x4f3E8F405CF5aFC05D68142F3783bDfE13811522";
const CRV_UST_TOKEN_ADDRESS = "0x94e131324b6054c0D789b190b2dAC504e4361b53";

const DUSD_METAPOOL_ADDRESS = "0x8038C01A0390a8c547446a0b2c18fc9aEFEcc10c";
const FRAX_METAPOOL_ADDRESS = "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B";
const USDN_METAPOOL_ADDRESS = "0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1";
const UST_METAPOOL_ADDRESS = "0x890f4e345B1dAED0367A877a1612f86A1f86985f";

const YDUSD_TOKEN_ADDRESS = "0x30fcf7c6cdfc46ec237783d94fc78553e79d4e9c";
const YFRAX_TOKEN_ADDRESS = "0xb4ada607b9d6b2c9ee07a275e9616b84ac560139";
const YUSDN_TOKEN_ADDRESS = "0x3b96d491f067912d18563d56858ba7d6ec67a6fa";
const YUST_TOKEN_ADDRESS = "0x1c6a9783f812b3af3abbf7de64c3cd7cc7d1af44";

const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const CURVE_ADDRESS_PROVIDER_ADDRESS =
  "0x0000000022D53366457F9d5E68Ec105046FC4383";
const CURVE_FACTORY_METAPOOL_DEPOSIT_ZAP_ADDRESS =
  "0xA79828DF1850E8a3A3064576f380D90aECDD3359";

const componentMap: ComponentMap = {
  [YDUSD_TOKEN_ADDRESS]: {
    name: "yDUSD",
    metaPool: undefined,
    yPool: undefined,
  },
  [YFRAX_TOKEN_ADDRESS]: {
    name: "yFRAX",
    metaPool: undefined,
    yPool: undefined,
  },
  [YUSDN_TOKEN_ADDRESS]: {
    name: "yUSDN",
    metaPool: undefined,
    yPool: undefined,
  },
  [YUST_TOKEN_ADDRESS]: {
    name: "yUST",
    metaPool: undefined,
    yPool: undefined,
  },
};

export default async function deployContracts(
  ethers,
  network: Network,
  owner: SignerWithAddress
): Promise<Contracts> {
  //Deploy helper Faucet
  const Faucet = await ethers.getContractFactory("Faucet");
  const faucet = await (
    await Faucet.deploy(
      UNISWAP_ROUTER_ADDRESS,
      CURVE_ADDRESS_PROVIDER_ADDRESS,
      CURVE_FACTORY_METAPOOL_DEPOSIT_ZAP_ADDRESS
    )
  ).deployed();
  await network.provider.send("hardhat_setBalance", [
    faucet.address,
    "0x69e10de76676d0800000", // 500k ETH
  ]);

  const mockPop = await (
    await (
      await ethers.getContractFactory("MockERC20")
    ).deploy("POP", "POP", 18)
  ).deployed();

  //Deploy Curve Token
  const threeCrv = (await ethers.getContractAt(
    "ERC20",
    THREE_CRV_TOKEN_ADDRESS
  )) as ERC20;

  const crvDUSD = (await ethers.getContractAt(
    "ERC20",
    CRV_DUSD_TOKEN_ADDRESS
  )) as ERC20;

  const crvFRAX = (await ethers.getContractAt(
    "ERC20",
    CRV_FRAX_TOKEN_ADDRESS
  )) as ERC20;

  const crvUSDN = (await ethers.getContractAt(
    "ERC20",
    CRV_USDN_TOKEN_ADDRESS
  )) as ERC20;

  const crvUST = (await ethers.getContractAt(
    "ERC20",
    CRV_UST_TOKEN_ADDRESS
  )) as ERC20;

  const threePool = (await ethers.getContractAt(
    CurveMetapoolAbi,
    THREEPOOL_ADDRESS
  )) as CurveMetapool;

  //Deploy Curve Metapool
  const dusdMetapool = (await ethers.getContractAt(
    CurveMetapoolAbi,
    DUSD_METAPOOL_ADDRESS
  )) as CurveMetapool;

  const fraxMetapool = (await ethers.getContractAt(
    CurveMetapoolAbi,
    FRAX_METAPOOL_ADDRESS
  )) as CurveMetapool;

  const usdnMetapool = (await ethers.getContractAt(
    CurveMetapoolAbi,
    USDN_METAPOOL_ADDRESS
  )) as CurveMetapool;

  const ustMetapool = (await ethers.getContractAt(
    CurveMetapoolAbi,
    UST_METAPOOL_ADDRESS
  )) as CurveMetapool;

  //Deploy Yearn Vaults
  const yDUSD = (await ethers.getContractAt(
    "MockYearnV2Vault",
    YDUSD_TOKEN_ADDRESS
  )) as MockYearnV2Vault;

  const yFRAX = (await ethers.getContractAt(
    "MockYearnV2Vault",
    YFRAX_TOKEN_ADDRESS
  )) as MockYearnV2Vault;

  const yUSDN = (await ethers.getContractAt(
    "MockYearnV2Vault",
    YUSDN_TOKEN_ADDRESS
  )) as MockYearnV2Vault;

  const yUST = (await ethers.getContractAt(
    "MockYearnV2Vault",
    YUST_TOKEN_ADDRESS
  )) as MockYearnV2Vault;

  componentMap[YDUSD_TOKEN_ADDRESS].metaPool = dusdMetapool;
  componentMap[YDUSD_TOKEN_ADDRESS].yPool = yDUSD;
  componentMap[YFRAX_TOKEN_ADDRESS].metaPool = fraxMetapool;
  componentMap[YFRAX_TOKEN_ADDRESS].yPool = yFRAX;
  componentMap[YUSDN_TOKEN_ADDRESS].metaPool = usdnMetapool;
  componentMap[YUSDN_TOKEN_ADDRESS].yPool = yUSDN;
  componentMap[YUST_TOKEN_ADDRESS].metaPool = ustMetapool;
  componentMap[YUST_TOKEN_ADDRESS].yPool = yUST;

  //Deploy Set Procotol
  const hysi = (await ethers.getContractAt(
    SetTokenAbi.abi,
    HYSI_TOKEN_ADDRESS
  )) as unknown as SetToken;

  const basicIssuanceModule = (await ethers.getContractAt(
    BasicIssuanceModuleAbi.abi,
    SET_BASIC_ISSUANCE_MODULE_ADDRESS
  )) as unknown as BasicIssuanceModule;

  //Deploy HysiBatchInteraction
  const HysiBatchInteraction = await ethers.getContractFactory(
    "HysiBatchInteraction"
  );
  const hysiBatchInteraction = await (
    await HysiBatchInteraction.deploy(
      THREE_CRV_TOKEN_ADDRESS,
      HYSI_TOKEN_ADDRESS,
      SET_BASIC_ISSUANCE_MODULE_ADDRESS,
      [
        YDUSD_TOKEN_ADDRESS,
        YFRAX_TOKEN_ADDRESS,
        YUSDN_TOKEN_ADDRESS,
        YUST_TOKEN_ADDRESS,
      ],
      [
        {
          curveMetaPool: DUSD_METAPOOL_ADDRESS,
          crvLPToken: CRV_DUSD_TOKEN_ADDRESS,
        },
        {
          curveMetaPool: FRAX_METAPOOL_ADDRESS,
          crvLPToken: CRV_FRAX_TOKEN_ADDRESS,
        },
        {
          curveMetaPool: USDN_METAPOOL_ADDRESS,
          crvLPToken: CRV_USDN_TOKEN_ADDRESS,
        },
        {
          curveMetaPool: UST_METAPOOL_ADDRESS,
          crvLPToken: CRV_UST_TOKEN_ADDRESS,
        },
      ],
      0,
      parseEther("1"),
      parseEther("1"),
      owner.address,
      mockPop.address
    )
  ).deployed();

  return {
    mockPop,
    threeCrv,
    crvDUSD,
    crvFRAX,
    crvUSDN,
    crvUST,
    threePool,
    dusdMetapool,
    fraxMetapool,
    usdnMetapool,
    ustMetapool,
    yDUSD,
    yFRAX,
    yUSDN,
    yUST,
    hysi,
    setToken: hysi,
    basicIssuanceModule,
    hysiBatchInteraction,
    faucet,
  };
}
