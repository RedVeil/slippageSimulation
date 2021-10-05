import { Address } from "packages/utils/src/types";
import BasicIssuanceModuleManager from "./BasicIssuanceModuleManager";
import { Configuration } from "./Configuration";
import SetTokenCreator from "./SetTokenCreator";
import Bluebird from "bluebird";
import getCreatedSetTokenAddress from "./utils/getCreatedSetTokenAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import StreamingFeeModuleManager from "./StreamingFeeModuleManager";

export class SetTokenManager {
  constructor(
    private configuration: Configuration,
    private hre: HardhatRuntimeEnvironment
  ) {}

  async createSet({ args }: { args: any }): Promise<void> {
    console.log("creating set ... ");

    const creator = SetTokenCreator({
      hre: this.hre,
      debug: args.debug,
      configuration: this.configuration,
    });
    const receipt = await creator.create();

    console.log("getting newly created token set address ...");

    const tokenAddress = await getCreatedSetTokenAddress(
      receipt.transactionHash,
      this.hre.ethers.provider
    );
    console.log("token set address: ", tokenAddress);

    console.log("initializing modules ...");
    await this.initializeModules(tokenAddress);
    console.log("Done! Created token set:", tokenAddress);
  }

  async initializeModules(setToken: Address): Promise<void> {
    await Bluebird.map(
      Object.keys(this.configuration.core.modules),
      async (moduleName) => {
        switch (moduleName) {
          case "BasicIssuanceModule":
            await new BasicIssuanceModuleManager(this.configuration).initialize(
              setToken
            );
            break;
          case "StreamingFeeModule":
            await new StreamingFeeModuleManager(this.configuration).initialize(
              setToken
            );
            break;
        }
      },
      { concurrency: 1 }
    );
  }
}
export default SetTokenManager;
