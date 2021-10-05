import { BigNumber } from "@ethersproject/bignumber";
import { parseEther } from "@ethersproject/units";
import { CurveMetapool, MockYearnV2Vault } from "../typechain";
import { BasicIssuanceModule } from "../SetToken/vendor/set-protocol/types/BasicIssuanceModule";
import { SetToken } from "../SetToken/vendor/set-protocol/types/SetToken";
import { HysiBatchInteraction } from "../typechain/HysiBatchInteraction";
export enum BatchType {
  Mint,
  Redeem,
}

export interface Batch {
  batchType: BatchType;
  batchId: string;
  claimable: boolean;
  unclaimedShares: BigNumber;
  suppliedTokenBalance: BigNumber;
  claimableTokenBalance: BigNumber;
  suppliedTokenAddress: string;
  claimableTokenAddress: string;
}

export interface ComponentMap {
  // key is yTokenAddress
  [key: string]: {
    name: string;
    metaPool?: CurveMetapool;
    yPool?: MockYearnV2Vault;
  };
}
export class HysiBatchInteractionAdapter {
  constructor(private contract: HysiBatchInteraction) {}

  async getBatch(batchId: string): Promise<Batch> {
    const batch = await this.contract.batches(batchId);
    return {
      batchType: batch.batchType,
      batchId: batch.batchId,
      claimable: batch.claimable,
      unclaimedShares: batch.unclaimedShares,
      suppliedTokenBalance: batch.suppliedTokenBalance,
      claimableTokenBalance: batch.claimableTokenBalance,
      suppliedTokenAddress: batch.suppliedTokenAddress,
      claimableTokenAddress: batch.claimableTokenAddress,
    };
  }

  async calculateAmountToReceiveForClaim(batchId, address): Promise<BigNumber> {
    const batch = await this.contract.batches(batchId);

    const unclaimedShares = batch.unclaimedShares;
    const claimableTokenBalance = batch.claimableTokenBalance;
    const accountBalance = await this.contract.accountBalances(
      batchId,
      address
    );
    const amountToReceive = claimableTokenBalance
      .mul(accountBalance)
      .div(unclaimedShares);
    return amountToReceive;
  }

  static async getMinAmountOf3CrvToReceiveForBatchRedeem(
    slippage: number = 0.005,
    contracts: {
      hysiBatchInteraction: HysiBatchInteraction;
      basicIssuanceModule: BasicIssuanceModule;
      setToken: SetToken;
    },
    componentMap: ComponentMap
  ): Promise<BigNumber> {
    const batchId = await contracts.hysiBatchInteraction.currentRedeemBatchId();

    // get expected units of HYSI given 3crv amount:
    const HYSIInBatch = (await contracts.hysiBatchInteraction.batches(batchId))
      .suppliedTokenBalance;

    const components =
      await contracts.basicIssuanceModule.getRequiredComponentUnitsForIssue(
        contracts.setToken.address,
        HYSIInBatch
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
      (sum, componentPrice, i) => {
        return sum.add(
          componentPrice.mul(componentAmounts[i]).div(parseEther("1"))
        );
      },
      parseEther("0")
    );

    // 50 bps slippage tolerance
    const slippageTolerance = 1 - Number(slippage);
    const minAmountToReceive = componentValuesInUSD
      .mul(parseEther(slippageTolerance.toString()))
      .div(parseEther("1"));

    return minAmountToReceive;
  }
}

export default HysiBatchInteractionAdapter;
