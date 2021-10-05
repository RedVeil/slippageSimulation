import { StreamingFeeModule } from "./vendor/set-protocol/types/StreamingFeeModule";
import { Address } from "packages/utils/src/types";
import { Configuration } from "./Configuration";
import { StreamingFeeModuleFactory } from './vendor/set-protocol/types/StreamingFeeModuleFactory';

export default class StreamingFeeModuleManager {
  private contract: StreamingFeeModule;

  constructor(private configuration: Configuration) {
    this.contract =  StreamingFeeModuleFactory.connect(
      this.configuration.core.modules.StreamingFeeModule.address,
      this.configuration.manager
    );
  }

  async initialize(setToken: Address, settings?: Configuration['core']['modules']['StreamingFeeModule']['config']) {
    settings = settings || this.configuration.core.modules.StreamingFeeModule.config;
    console.log("initializing StreamingFeeModule", JSON.stringify(settings, null, 2));
    return this.contract.initialize(setToken, settings);
  }
}

export { StreamingFeeModuleManager };