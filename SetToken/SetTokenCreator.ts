import { HardhatRuntimeEnvironment } from "hardhat/types";
import { formatEther, parseEther } from "ethers/lib/utils";
import { BigNumber, ContractReceipt } from "ethers";
import { Configuration, DefaultConfiguration } from "./Configuration";
import { getComponents } from "./utils/getComponents";
import { getModules } from "./utils/getModules";
import { SetTokenCreatorFactory } from "./vendor/set-protocol/types/SetTokenCreatorFactory";

interface SetTokenCreator {
  _calculateUnits(
    component: Configuration["components"][0]
  ): Promise<BigNumber>;
  create: () => Promise<ContractReceipt>;
}

interface Args {
  configuration?: Configuration;
  debug?: boolean;
  hre: HardhatRuntimeEnvironment;
}

export default function SetTokenCreator({
  configuration,
  debug,
  hre,
}: Args): SetTokenCreator {
  const { targetNAV } = configuration
    ? configuration
    : DefaultConfiguration;

  return {
    _calculateUnits: async function (
      component: Configuration["components"][0]
    ): Promise<BigNumber> {
      const yVault = await hre.ethers.getContractAt(
        "MockYearnV2Vault",
        component.address
      );

      const curveLP = await hre.ethers.getContractAt(
        "MockCurveMetapool",
        component.oracle
      );

      const targetComponentValue = targetNAV
        .mul(parseEther(component.ratio.toString()))
        .div(parseEther("100"));

      const pricePerShare = (await yVault.pricePerShare()) as BigNumber;
      const virtualPrice = (await curveLP.get_virtual_price()) as BigNumber;

      const targetCrvLPUnits = targetComponentValue
        .mul(parseEther("1"))
        .div(virtualPrice);

      const targetComponentUnits = targetCrvLPUnits
        .mul(parseEther("1"))
        .div(pricePerShare);

      if (debug) {
        console.log({
          targetNAV: formatEther(targetNAV),
          targetComponentValue: formatEther(targetComponentValue),
          pricePerShare: formatEther(pricePerShare),
          virtualPrice: formatEther(virtualPrice),
          targetCrvLPUnits: formatEther(targetCrvLPUnits),
          targetComponentUnits: formatEther(targetComponentUnits),
        });
      }

      return targetComponentUnits;
    },

    create: async function (): Promise<ContractReceipt> {

      const creator = SetTokenCreatorFactory.connect(
        configuration.core.SetTokenCreator.address,
        configuration.manager
      );

      const setComponents = getComponents(configuration);

      const setModules = getModules(configuration);

      const tx = await creator.create(
        setComponents.map((component) => component.address),
        setComponents.map((component) => this._calculateUnits(component)),
        setModules.map((module) => module.address),
        configuration.manager.address,
        "High-Yield Small Cap Stablecoin Index",
        "HYSI"
      );
      
      console.log("waiting for block confirmation");
      const receipt = tx.wait(1);
      return receipt;

    },
  };
}
