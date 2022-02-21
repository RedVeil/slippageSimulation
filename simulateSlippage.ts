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
  componentMap: ComponentMap,
  contracts: Contracts
): Promise<BigNumber> {
  const components =
    await contracts.basicIssuanceModule.getRequiredComponentUnitsForIssue(
      contracts.token.setToken.address,
      hysiBalance
    );
  const componentAddresses = components[0];
  const componentAmounts = components[1];

  const componentVirtualPrices = await Promise.all(
    componentAddresses.map(async (component) => {
      const metapool = componentMap[component.toLowerCase()]
        .metaPool as CurveMetapool;
      const yPool = componentMap[component.toLowerCase()]
        .yPool as MockYearnV2Vault;
      const yPoolPricePerShare = await yPool.pricePerShare();
      const metapoolPrice = await metapool.get_virtual_price();
      return yPoolPricePerShare.mul(metapoolPrice).div(parseEther("1"));
    })
  );

  const componentValuesInUSD = componentVirtualPrices.reduce(
    (sum: BigNumber, componentPrice, i) => {
      return sum.add(
        (componentPrice as BigNumber)
          .mul(componentAmounts[i])
          .div(parseEther("1"))
      );
    },
    parseEther("0")
  );
  return componentValuesInUSD as unknown as BigNumber;
}

export default async function simulateSlippage(hre): Promise<void> {
  const ethers = hre.ethers;
  const network = hre.network;
  const MAX_SLIPPAGE = 0.002;
  const INPUT_AMOUNT = parseEther("1000000");
  let mintBlockNumber = 14221601;

  const ORGINAL_START_BLOCK_NUMBER = 13956000; // earliest possible block to run the simulation
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

  const contracts = await deployContracts(ethers, network, signer);
  console.log("reset");

  while (mintBlockNumber < END_BLOCK_NUMBER) {
    await network.provider.send("hardhat_setBalance", [
      contracts.faucet.address,
      "0x152d02c7e14af6800000", // 100k ETH
    ]);
    await contracts.faucet.sendThreeCrv(50000, signer.address);

    await contracts.token.threeCrv
      .connect(signer)
      .approve(contracts.butterBatch.address, 0);
    await contracts.token.setToken
      .connect(signer)
      .approve(contracts.butterBatch.address, 0);
    await contracts.token.threeCrv
      .connect(signer)
      .approve(contracts.butterBatch.address, parseEther("1000000000"));
    await contracts.token.setToken
      .connect(signer)
      .approve(contracts.butterBatch.address, parseEther("1000000000"));

    const threeCrvPrice = await contracts.threePool.get_virtual_price();
    const inputAmountInUSD = INPUT_AMOUNT.mul(threeCrvPrice).div(
      parseEther("1")
    );
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

    const componentMap: ComponentMap = {
      [contracts.token.yRai.address.toLowerCase()]: {
        name: "yRAI",
        metaPool: contracts.metapools.rai,
        yPool: contracts.vaults.rai,
      },
      [contracts.token.yFrax.address.toLowerCase()]: {
        name: "yFRAX",
        metaPool: contracts.metapools.frax,
        yPool: contracts.vaults.frax,
      },
      [contracts.token.yOusd.address.toLowerCase()]: {
        name: "yOUSD",
        metaPool: contracts.metapools.ousd,
        yPool: contracts.vaults.ousd,
      },
    };

    const hysiAmountInUSD = await getHysiBalanceInUSD(
      hysiBalance,
      componentMap,
      contracts
    );
    const slippage =
      bigNumberToNumber(
        inputAmountInUSD.mul(parseEther("1")).div(hysiAmountInUSD)
      ) - 1;
    fs.appendFileSync(
      "slippage3.csv",
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
