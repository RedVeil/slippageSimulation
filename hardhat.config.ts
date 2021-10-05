import "@float-capital/solidity-coverage";
import "@nomiclabs/hardhat-waffle";
import { addGasToAbiMethods } from "./utils/addGasToAbiMethods";
import { setupNativeSolc } from "./utils/setupNativeSolc";
import "@typechain/hardhat";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import {
  TASK_COMPILE_SOLIDITY_COMPILE,
  TASK_COMPILE_SOLIDITY_GET_ARTIFACT_FROM_COMPILATION_OUTPUT,
} from "hardhat/builtin-tasks/task-names";
import { internalTask, subtask, task } from "hardhat/config";
import simulateSlippage from "./simulateSlippage";
require("dotenv").config({ path: ".env" });

task("simulate:slippage", "simulates hysi batch slippage").setAction(
  async (args, hre) => {
    await simulateSlippage(hre.ethers, hre.network);
  }
);

// Injects network block limit (minus 1 million) in the abi so
// ethers uses it instead of running gas estimation.
subtask(TASK_COMPILE_SOLIDITY_GET_ARTIFACT_FROM_COMPILATION_OUTPUT).setAction(
  async (_, { network }, runSuper) => {
    const artifact = await runSuper();

    // These changes should be skipped when publishing to npm.
    // They override ethers' gas estimation
    artifact.abi = addGasToAbiMethods(network.config, artifact.abi);

    return artifact;
  }
);

// Use native solc if available locally at config specified version
internalTask(TASK_COMPILE_SOLIDITY_COMPILE).setAction(setupNativeSolc);

export {};

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.7.3",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  },
};
