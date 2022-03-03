import { bigNumberToNumber } from "./utils/formatBigNumber";
import { Network } from "hardhat/types";
import deployContracts, { Contracts } from "./utils/deployContracts";
import { CurveMetapool, MockYearnV2Vault } from "./typechain";
import { BigNumber } from "ethers";
import { formatEther, parseEther } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {ERC20} from "./typechain"
import { Signer } from "ethers/lib/ethers";

require("dotenv").config({ path: ".env" });

const fs = require("fs");

const SUSD_WHALE_ADDRESS ="0xC8C2b727d864CC75199f5118F0943d2087fB543b"

const impersonateSigner = async (address,network,ethers): Promise<Signer> => {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return ethers.getSigner(address);
};

const sendEth = async (to: string, amount: string,ethers) => {
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
  const MAX_SLIPPAGE = 0.002;
  const INPUT_AMOUNT = parseEther("10000");
  let mintBlockNumber = 14221601;

  const ORGINAL_START_BLOCK_NUMBER = 13976427; // earliest possible block to run the simulation
  const END_BLOCK_NUMBER = 14244857;

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
  const [signer]: SignerWithAddress[] = await ethers.getSigners();

  console.log("reset");

  while (mintBlockNumber < END_BLOCK_NUMBER) {
    const contracts = await deployContracts(ethers, network, signer);

    const sUSDWhale = await impersonateSigner(SUSD_WHALE_ADDRESS,network,ethers);
    console.log(formatEther(await contracts.token.sUSD.balanceOf(SUSD_WHALE_ADDRESS)))
    await sendEth(SUSD_WHALE_ADDRESS, "10",ethers);
    await sendERC20(
      contracts.token.sUSD,
      sUSDWhale,
      signer.address,
      parseEther("20000")
    );
    await contracts.token.sUSD
      .connect(signer)
      .approve(
        contracts.butterBatch.address,
        parseEther("100000000")
      );
    
    await contracts.token.sUSD
      .connect(signer)
      .approve(contracts.butterBatch.address, parseEther("1000000000"));

    const inputAmountInUSD = INPUT_AMOUNT;

    await contracts.butterBatch
      .connect(signer)
      .depositForMint(INPUT_AMOUNT, signer.address);
    const mintBatchId = await contracts.butterBatch.currentMintBatchId();
    await contracts.butterBatch.connect(signer).batchMint();
    const mintingBlock = await ethers.provider.getBlock("latest");
    mintBlockNumber = mintingBlock.number;

    const hysiBalance = await (
      await contracts.butterBatch.batches(mintBatchId)
    ).claimableTokenBalance;

    const [tokenAddresses, quantities] = await contracts
    .basicIssuanceModule
    .getRequiredComponentUnitsForIssue(contracts.token.setToken.address, 1e18);

    const hysiValue= await contracts.butterBatch.valueOfComponents(tokenAddresses, quantities)
    const hysiAmountInUSD = hysiValue.mul(hysiBalance)
    const slippage =
      bigNumberToNumber(
        inputAmountInUSD.mul(parseEther("1")).div(hysiAmountInUSD)
      ) - 1;
    fs.appendFileSync(
      "slippage.csv",
      `\r\n${mintBlockNumber},${
        mintingBlock.timestamp
      },${INPUT_AMOUNT.toString()},${inputAmountInUSD.toString()},${hysiBalance.toString()},${hysiAmountInUSD.toString()},${slippage},${
        slippage <= MAX_SLIPPAGE
      }`
    );
    console.log(
      `At block: ${mintBlockNumber} - ${
        mintingBlock.timestamp
      }, inputAmount ${INPUT_AMOUNT.toString()} sUSD => ${inputAmountInUSD.toString()} USD, outputAmount: ${hysiBalance.toString()} => ${hysiAmountInUSD.toString()} USD, slippage: ${slippage} is accepable ${
        slippage <= MAX_SLIPPAGE
      }`
    );
    console.log(
      "-----------------------------------------------------------------------------"
    );
    Array(240)
      .fill(0)
      .forEach(async (x) => await ethers.provider.send("evm_mine", []));
    //mintBlockNumber = mintBlockNumber + 30;

    // await contracts.hysiBatchInteraction
    //   .connect(signer)
    //   .moveUnclaimedDepositsIntoCurrentBatch(
    //     [mintBatchId],
    //     [INPUT_AMOUNT],
    //     BatchType.Mint
    //   );
    // const redeemId =
    //   await contracts.hysiBatchInteraction.currentRedeemBatchId();
    // await contracts.hysiBatchInteraction.connect(signer).batchRedeem(0);
    // await contracts.hysiBatchInteraction
    //   .connect(signer)
    //   .claim(redeemId, signer.address);
    // Array(35)
    //   .fill(0)
    //   .forEach((x) => ethers.provider.send("evm_mine", []));
  }
}
