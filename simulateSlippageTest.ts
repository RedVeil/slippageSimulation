import { bigNumberToNumber } from "./utils/formatBigNumber";
import { Network } from "hardhat/types";
import deployContracts, { Contracts } from "./utils/deployContracts";
import { CurveMetapool, MockYearnV2Vault, ISynthetix } from "./typechain";
import { BigNumber, constants } from "ethers";
import { formatEther, parseEther } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ERC20 } from "./typechain";
import { Signer } from "ethers/lib/ethers";

require("dotenv").config({ path: ".env" });

const fs = require("fs");

const SUSD_WHALE_ADDRESS = "0xC8C2b727d864CC75199f5118F0943d2087fB543b";

const ADDRESS_ZER0 = "0x0000000000000000000000000000000000000000";

const SET_TOKEN_CREATOR_ADDRESS = "0xeF72D3278dC3Eba6Dc2614965308d1435FFd748a";
const SET_BASIC_ISSUANCE_MODULE_ADDRESS =
  "0xd8EF3cACe8b4907117a45B0b125c68560532F94D";

const IB_AMM_ADDRESS = "0x8338Aa899fB3168598D871Edc1FE2B4F0Ca6BBEF";

const SYNTHETIX_ADDRESS = "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F";

const Y_CRV_IB_EUR_ADDRESS = "0x67e019bfbd5a67207755D04467D6A70c0B75bF60";
const Y_CRV_IB_GBP_ADDRESS = "0x595a68a8c9D5C230001848B69b1947ee2A607164";
const Y_CRV_IB_AUD_ADDRESS = "0x1b905331F7dE2748F4D6a0678e1521E20347643F";
const Y_CRV_IB_JPY_ADDRESS = "0x59518884EeBFb03e90a18ADBAAAB770d4666471e";

const IB_EUR_ADDRESS = "0x96e61422b6a9ba0e068b6c5add4ffabc6a4aae27";
const IB_GBP_ADDRESS = "0x69681f8fde45345c3870bcd5eaf4a05a60e7d227";
const IB_AUD_ADDRESS = "0xfafdf0c4c1cb09d430bf88c75d88bb46dae09967";
const IB_JPY_ADDRESS = "0x5555f75e3d5278082200fb451d1b6ba946d8e13b";

const S_EUR_ADDRESS = "0xd71ecff9342a5ced620049e616c5035f1db98620";
const S_GBP_ADDRESS = "0x97fe22e7341a0cd8db6f6c021a24dc8f4dad855f";
const S_AUD_ADDRESS = "0xf48e200eaf9906362bb1442fca31e0835773b8b4";
const S_JPY_ADDRESS = "0xf6b1c627e95bfc3c1b4c9b825a032ff0fbf3e07d";
const S_USD_ADDRESS = "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51";

const EUR_METAPOOL_ADDRESS = "0x19b080FE1ffA0553469D20Ca36219F17Fcf03859";
const GBP_METAPOOL_ADDRESS = "0xD6Ac1CB9019137a896343Da59dDE6d097F710538";
const AUD_METAPOOL_ADDRESS = "0x3F1B0278A9ee595635B61817630cC19DE792f506";
const JPY_METAPOOL_ADDRESS = "0x8818a9bb44fbf33502be7c15c500d0c783b73067";

const impersonateSigner = async (address, network, ethers): Promise<Signer> => {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return ethers.getSigner(address);
};

const sendEth = async (to: string, amount: string, ethers) => {
  const [owner] = await ethers.getSigners();
  return owner.sendTransaction({
    to: to,
    value: ethers.utils.parseEther(amount),
  });
};

async function sendERC20(
  erc20: ERC20,
  whale: Signer,
  recipient: string,
  amount: BigNumber
): Promise<void> {
  await erc20.connect(whale).transfer(recipient, amount);
}

export default async function simulateSlippage(hre): Promise<void> {
  const ethers = hre.ethers;
  const network = hre.network;
  const MAX_SLIPPAGE = 0.02;
  const INPUT_AMOUNT = parseEther("1000");
  let mintBlockNumber = 14277072;

  const ORGINAL_START_BLOCK_NUMBER = 13976427; // earliest possible block to run the simulation
  const END_BLOCK_NUMBER = 14320258;

  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: process.env.FORKING_RPC_URL,
          blockNumber: mintBlockNumber,
        },
      },
    ],
  });
  const [signer, test]: SignerWithAddress[] = await ethers.getSigners();

  console.log("reset test");

  while (mintBlockNumber < END_BLOCK_NUMBER) {
    const sUSD = (await ethers.getContractAt("ERC20", S_USD_ADDRESS)) as ERC20;

    const sEUR = (await ethers.getContractAt("ERC20", S_EUR_ADDRESS)) as ERC20;

    const synthetix = (await ethers.getContractAt(
      "ISynthetix",
      "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F"
    )) as ISynthetix;

    const curvemetapool = (await ethers.getContractAt(
      "CurveMetapool",
      EUR_METAPOOL_ADDRESS
    )) as CurveMetapool;

    const sUSDWhale = await impersonateSigner(
      SUSD_WHALE_ADDRESS,
      network,
      ethers
    );
    console.log(formatEther(await sUSD.balanceOf(SUSD_WHALE_ADDRESS)));
    await sendEth(SUSD_WHALE_ADDRESS, "10", ethers);
    await sendERC20(sUSD, sUSDWhale, signer.address, parseEther("20000"));

    await sUSD.approve(synthetix.address, constants.MaxUint256);

    console.log(formatEther(await sUSD.balanceOf(signer.address)));

    await synthetix
      .connect(signer)
      ["exchangeAtomically(bytes32,uint256,bytes32,bytes32)"](
        ethers.utils.formatBytes32String("sUSD"),
        parseEther("10"),
        ethers.utils.formatBytes32String("sJPY"),
        ethers.utils.formatBytes32String("")
      );

    // await sEUR.approve(curvemetapool.address, constants.MaxUint256);

    // await curvemetapool.add_liquidity([0, parseEther("5")], parseEther("1"));
    // console.log((await curvemetapool.balanceOf(signer.address)).toString());
  }
}
