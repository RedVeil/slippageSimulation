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
import { HardhatRuntimeEnvironment } from "hardhat/types";
require("dotenv").config({ path: ".env" });

task("simulate:slippage", "simulates hysi batch slippage").setAction(
  async (args, hre:HardhatRuntimeEnvironment) => {
    await simulateSlippage(hre);
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

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.1",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
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
        version: "0.6.0",
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
  networks: {
    mainnet: {
      timeout: 60000,
      chainId: 1,
      url:
        process.env.RPC_URL ||
        `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    },
    hardhat: {
      initialBaseFeePerGas: 0,
      chainId: 1337,
      forking: Boolean(parseInt(process.env.FORKING || "0"))
        ? {
            url: process.env.RPC_URL,
          }
        : undefined,
    },
    localhost: {
      chainId: 1337,
      url: "http://localhost:8545",
    },
    rinkeby: {
      timeout: 60000,
      url:
        process.env.RPC_URL ||
        `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      tags: ["rinkeby"],
    },
    kovan: {
      url:
        process.env.RPC_URL ||
        `https://kovan.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      tags: ["LBP"],
    },
    gorli: {
      url:
        process.env.RPC_URL ||
        `https://gorli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    },
    polygon: {
      chainId: 137,
      gasPrice: 50,
      timeout: 60000,
      url:
        process.env.RPC_URL ||
        `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    },
    polygontest: {
      url:
        process.env.RPC_URL ||
        `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    },
    mumbai: {
      url:
        process.env.RPC_URL ||
        `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    },
    arbitrum: {
      url:
        process.env.RPC_URL ||
        `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    },
    bsc: {
      url: process.env.RPC_URL || "https://undefined",
    },
    rinkarby: {
      url: process.env.RPC_URL || "https://rinkeby.arbitrum.io/rpc",
      // `https://arbitrum-rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    },
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 100,
    enabled: false,
  },
  mocha: {
    timeout: 120000,
  },
  /*contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },*/
};
