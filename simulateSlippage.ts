import { bigNumberToNumber } from "./utils/formatBigNumber";
import { Network } from "hardhat/types";
import deployContracts, { Contracts } from "./utils/deployContracts";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { formatEther, parseEther } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, constants, Signer } from "ethers";
import { ERC20 } from "typechain";

require("dotenv").config({ path: ".env" });

const fs = require("fs");

const DAI_WHALE_ADDRESS = "0x4967ec98748efb98490663a65b16698069a1eb35";

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

export default async function simulateSlippage(
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const ethers = hre.ethers;
  const network = hre.network;
  const MAX_SLIPPAGE = 0.02;
  const INPUT_AMOUNT = parseEther("100000");
  let mintBlockNumber = 14409200;

  const ORGINAL_START_BLOCK_NUMBER = 14409165; // earliest possible block to run the simulation
  const END_BLOCK_NUMBER = 14785800;

  while (mintBlockNumber < END_BLOCK_NUMBER) {
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
    const [signer, test]: SignerWithAddress[] = await ethers.getSigners();
    const contracts = await deployContracts(ethers, network, signer);

    /* await network.provider.send("hardhat_setBalance", [
      contracts.faucet.address,
      "0x152d02c7e14af6800000", // 100k ETH
    ]);

    await contracts.faucet.sendTokens(
      contracts.token.dai.address,
      parseEther("100"),
      signer.address
    ); */
    const daiWhale = await impersonateSigner(
      DAI_WHALE_ADDRESS,
      network,
      ethers
    );
    console.log(
      formatEther(await contracts.token.dai.balanceOf(DAI_WHALE_ADDRESS))
    );
    await sendEth(DAI_WHALE_ADDRESS, "10", ethers);
    await sendERC20(
      contracts.token.dai,
      daiWhale,
      signer.address,
      INPUT_AMOUNT
    );

    const inputAmountInUSD = INPUT_AMOUNT;

    await contracts.token.dai.approve(
      contracts.butterBatch.address,
      constants.MaxUint256
    );
    await contracts.butterBatch
      .connect(signer)
      .depositForMint(INPUT_AMOUNT, signer.address);

    const mintBatchId = await contracts.butterBatch.currentMintBatchId();
    await contracts.butterBatch.connect(signer).batchMint();
    console.log("minted");
    const mintingBlock = await ethers.provider.getBlock("latest");
    mintBlockNumber = mintingBlock.number;

    const hysiBalance = await (
      await contracts.butterBatch.batches(mintBatchId)
    ).claimableTokenBalance;
    console.log("hysiBalance");

    const [tokenAddresses, quantities] =
      await contracts.basicIssuanceModule.getRequiredComponentUnitsForIssue(
        contracts.token.setToken.address,
        parseEther("1")
      );
      console.log("quantities");

    const hysiValue = await contracts.butterBatch.valueOfComponents(
      tokenAddresses,
      quantities
    );
    console.log("hysiValue");

    const hysiAmountInUSD = hysiValue.mul(hysiBalance);
    console.log("hysiAmountInUSD");

    const slippage =
      bigNumberToNumber(
        inputAmountInUSD.mul(parseEther("1")).div(hysiAmountInUSD)
      ) - 1;
      console.log("slippage");

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
    mintBlockNumber = mintBlockNumber + 500;

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
