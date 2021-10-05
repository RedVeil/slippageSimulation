import { BigNumber, BigNumberish } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ZERO } from './utils/constants';

export interface Configuration {
  targetNAV: BigNumber;
  manager?: SignerWithAddress;
  core: {
    SetTokenCreator: {
      address: string;
    };
    modules: {
      BasicIssuanceModule?: {
        address: string,
        config?: {
          preIssueHook?: string;
        }
      };
      StreamingFeeModule: {
        address: string;
        config?: {
          feeRecipient: string;
          maxStreamingFeePercentage: BigNumberish;
          streamingFeePercentage: BigNumberish;
          lastStreamingFeeTimestamp: BigNumberish;
        }
      }
    };
  };
  components: {
    [key: string]: {
      ratio: number; // percent of targetNAV (out of 100)
      address: string;
      oracle: string;
    };
  };
}

export const DefaultConfiguration: Configuration = {
  targetNAV: parseEther("250"),
  core: {
    SetTokenCreator: {
      address: process.env.ADDR_SET_SET_TOKEN_CREATOR,
    },
    modules: {
      BasicIssuanceModule: {
        address: process.env.ADDR_SET_BASIC_ISSUANCE_MODULE,
      },
      StreamingFeeModule: {
        address: process.env.ADDR_SET_STREAMING_FEE_MODULE,
        config: {
          feeRecipient: process.env.ADDR_SET_STREAMING_FEE_MODULE_FEE_RECIPIENT,
          maxStreamingFeePercentage: parseEther('.03'),
          streamingFeePercentage: parseEther('.01'),
          lastStreamingFeeTimestamp: ZERO,
        },
      },
    },
  },
  components: {
    ycrvDUSD: {
      ratio: 25,
      address: process.env.ADDR_YEARN_CRVDUSD,
      oracle: process.env.ADDR_CURVE_CRVDUSD,
    },
    ycrvFRAX: {
      ratio: 25,
      address: process.env.ADDR_YEARN_CRVFRAX,
      oracle: process.env.ADDR_CURVE_CRVFRAX,
    },
    ycrvUSDN: {
      ratio: 25,
      address: process.env.ADDR_YEARN_CRVUSDN,
      oracle: process.env.ADDR_CURVE_CRVUSDN,
    },
    ycrvUST: {
      ratio: 25,
      address: process.env.ADDR_YEARN_CRVUST,
      oracle: process.env.ADDR_CURVE_CRVUST,
    },
  },
};
