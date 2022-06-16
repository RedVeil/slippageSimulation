import { bigNumberToNumber } from "./utils/formatBigNumber";
import { Network } from "hardhat/types";
import { ComponentMap } from "./utils/HYSIBatchInteractionAdapter";
import deployContracts, { Contracts } from "./utils/deployContracts";
import { CurveMetapool, MockYearnV2Vault } from "./typechain";
import { BigNumber } from "ethers";
import { parseEther } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
require("dotenv").config({ path: ".env" });

const fs = require("fs");

async function getHysiBalanceInUSD(
  hysiBalance: BigNumber,
  contracts: Contracts
): Promise<BigNumber> {
  const components =
    await contracts.basicIssuanceModule.getRequiredComponentUnitsForIssue(
      contracts.token.setToken.address,
      hysiBalance
    );
  const componentAddresses = components[0];
  const componentAmounts = components[1];

  return await contracts.fourXBatchProcessing.valueOfComponents(
    componentAddresses,
    componentAmounts
  );
}

export default async function simulateSlippage(hre): Promise<void> {
  const ethers = hre.ethers;
  const network = hre.network;
  const MAX_SLIPPAGE = 0.002;
  const INPUT_AMOUNT = BigNumber.from(100_000_000_000);
  let mintBlockNumber = 14385108;
  let i = 0;
  const ORGINAL_START_BLOCK_NUMBER = 14385108; // earliest possible block to run the simulation
  const END_BLOCK_NUMBER = 14932613;
  let signer:SignerWithAddress;
  let contracts:Contracts;

  while (mintBlockNumber < END_BLOCK_NUMBER) {
    console.log("start ",i);
    if(i % 2 === 0){
      console.log("reset");
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
      [signer] = await ethers.getSigners();
    
      contracts = await deployContracts(ethers, network, signer);
      mintBlockNumber += 10_000;
    }
    i += 1;
    await network.provider.send("hardhat_setBalance", [
      contracts.faucet.address,
      "0x152d02c7e14af6800000", // 100k ETH
    ]);
    await contracts.faucet.sendTokens(
      contracts.token.usdc.address,
      50000,
      signer.address
    );

    await contracts.token.usdc
      .connect(signer)
      .approve(contracts.fourXBatchProcessing.address, 0);
    await contracts.token.setToken
      .connect(signer)
      .approve(contracts.fourXBatchProcessing.address, 0);
    await contracts.token.usdc
      .connect(signer)
      .approve(
        contracts.fourXBatchProcessing.address,
        parseEther("1000000000")
      );
    await contracts.token.setToken
      .connect(signer)
      .approve(
        contracts.fourXBatchProcessing.address,
        parseEther("1000000000")
      );

    const inputAmountInUSD = INPUT_AMOUNT.mul(1e12);
    await contracts.fourXBatchProcessing
      .connect(signer)
      .depositForMint(INPUT_AMOUNT, signer.address);
    const mintBatchId =
      await contracts.fourXBatchProcessing.currentMintBatchId();
    await contracts.fourXBatchProcessing.connect(signer).batchMint();
    const mintingBlock = await ethers.provider.getBlock("latest");
    mintBlockNumber = mintingBlock.number;

    const mintBatch = await contracts.fourXBatchProcessing.getBatch(
      mintBatchId
    );
    const hysiBalance = mintBatch.targetTokenBalance;

    console.log(
      "crvSUSD",
      await (
        await contracts.token.crvSUSD.balanceOf(
          contracts.fourXBatchProcessing.address
        )
      ).toString()
    );
    console.log(
      "crv3E",
      await (
        await contracts.token.crv3Eur.balanceOf(
          contracts.fourXBatchProcessing.address
        )
      ).toString()
    );
    console.log(
      "ySUSD",
      await (
        await contracts.token.ySUSD.balanceOf(
          contracts.fourXBatchProcessing.address
        )
      ).toString()
    );
    console.log(
      "y3E",
      await (
        await contracts.token.y3Eur.balanceOf(
          contracts.fourXBatchProcessing.address
        )
      ).toString()
    );

    const hysiAmountInUSD = await getHysiBalanceInUSD(hysiBalance, contracts);
    const slippage =
      bigNumberToNumber(
        inputAmountInUSD.mul(parseEther("1")).div(hysiAmountInUSD)
      ) - 1;
    fs.appendFileSync(
      "slippageSUSD.csv",
      `\r\n${mintBlockNumber},${
        mintingBlock.timestamp
      },${INPUT_AMOUNT.toString()},${inputAmountInUSD.toString()},${hysiBalance.toString()},${hysiAmountInUSD.toString()},${slippage},${
        slippage <= MAX_SLIPPAGE
      }`
    );
    console.log(
      `At block: ${mintBlockNumber} - ${
        mintingBlock.timestamp
      }, inputAmount ${INPUT_AMOUNT.toString()} 3CRV => ${inputAmountInUSD.toString()} USD, outputAmount: ${hysiBalance.toString()} => ${hysiAmountInUSD.toString()} USD, slippage: ${slippage} is accepable ${
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
