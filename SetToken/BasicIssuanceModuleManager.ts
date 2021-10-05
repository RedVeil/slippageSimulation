import { BasicIssuanceModuleFactory } from "./vendor/set-protocol/types/BasicIssuanceModuleFactory";
import { BasicIssuanceModule } from "./vendor/set-protocol/types/BasicIssuanceModule";
import { Address } from "@popcorn/utils/src/types";
import { Configuration } from "./Configuration";
import { ADDRESS_ZERO } from "./utils/constants";

export default class BasicIssuanceModuleManager {
  private contract: BasicIssuanceModule;

  constructor(private configuration: Configuration) {
    this.contract =  BasicIssuanceModuleFactory.connect(
      this.configuration.core.modules.BasicIssuanceModule.address,
      this.configuration.manager
    );
  }

  async initialize(setToken: Address, preIssueHook = ADDRESS_ZERO) {
    console.log("initializing BasicIssuanceModule", {setToken, preIssueHook});
    return this.contract.initialize(setToken,  preIssueHook);
  }
}

export { BasicIssuanceModuleManager };