/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
} from "ethers";
import {
  Contract,
  ContractTransaction,
  Overrides,
  CallOverrides,
} from "@ethersproject/contracts";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";

interface StreamingFeeModuleInterface extends ethers.utils.Interface {
  functions: {
    "accrueFee(address)": FunctionFragment;
    "controller()": FunctionFragment;
    "feeStates(address)": FunctionFragment;
    "getFee(address)": FunctionFragment;
    "initialize(address,tuple)": FunctionFragment;
    "removeModule()": FunctionFragment;
    "updateFeeRecipient(address,address)": FunctionFragment;
    "updateStreamingFee(address,uint256)": FunctionFragment;
  };

  encodeFunctionData(functionFragment: "accrueFee", values: [string]): string;
  encodeFunctionData(
    functionFragment: "controller",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "feeStates", values: [string]): string;
  encodeFunctionData(functionFragment: "getFee", values: [string]): string;
  encodeFunctionData(
    functionFragment: "initialize",
    values: [
      string,
      {
        feeRecipient: string;
        maxStreamingFeePercentage: BigNumberish;
        streamingFeePercentage: BigNumberish;
        lastStreamingFeeTimestamp: BigNumberish;
      }
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "removeModule",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "updateFeeRecipient",
    values: [string, string]
  ): string;
  encodeFunctionData(
    functionFragment: "updateStreamingFee",
    values: [string, BigNumberish]
  ): string;

  decodeFunctionResult(functionFragment: "accrueFee", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "controller", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "feeStates", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getFee", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "initialize", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "removeModule",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "updateFeeRecipient",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "updateStreamingFee",
    data: BytesLike
  ): Result;

  events: {
    "FeeActualized(address,uint256,uint256)": EventFragment;
    "FeeRecipientUpdated(address,address)": EventFragment;
    "StreamingFeeUpdated(address,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "FeeActualized"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "FeeRecipientUpdated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "StreamingFeeUpdated"): EventFragment;
}

export class StreamingFeeModule extends Contract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  on(event: EventFilter | string, listener: Listener): this;
  once(event: EventFilter | string, listener: Listener): this;
  addListener(eventName: EventFilter | string, listener: Listener): this;
  removeAllListeners(eventName: EventFilter | string): this;
  removeListener(eventName: any, listener: Listener): this;

  interface: StreamingFeeModuleInterface;

  functions: {
    accrueFee(
      _setToken: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "accrueFee(address)"(
      _setToken: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    controller(overrides?: CallOverrides): Promise<{
      0: string;
    }>;

    "controller()"(overrides?: CallOverrides): Promise<{
      0: string;
    }>;

    feeStates(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<{
      feeRecipient: string;
      maxStreamingFeePercentage: BigNumber;
      streamingFeePercentage: BigNumber;
      lastStreamingFeeTimestamp: BigNumber;
      0: string;
      1: BigNumber;
      2: BigNumber;
      3: BigNumber;
    }>;

    "feeStates(address)"(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<{
      feeRecipient: string;
      maxStreamingFeePercentage: BigNumber;
      streamingFeePercentage: BigNumber;
      lastStreamingFeeTimestamp: BigNumber;
      0: string;
      1: BigNumber;
      2: BigNumber;
      3: BigNumber;
    }>;

    getFee(
      _setToken: string,
      overrides?: CallOverrides
    ): Promise<{
      0: BigNumber;
    }>;

    "getFee(address)"(
      _setToken: string,
      overrides?: CallOverrides
    ): Promise<{
      0: BigNumber;
    }>;

    initialize(
      _setToken: string,
      _settings: {
        feeRecipient: string;
        maxStreamingFeePercentage: BigNumberish;
        streamingFeePercentage: BigNumberish;
        lastStreamingFeeTimestamp: BigNumberish;
      },
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "initialize(address,tuple)"(
      _setToken: string,
      _settings: {
        feeRecipient: string;
        maxStreamingFeePercentage: BigNumberish;
        streamingFeePercentage: BigNumberish;
        lastStreamingFeeTimestamp: BigNumberish;
      },
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    removeModule(overrides?: Overrides): Promise<ContractTransaction>;

    "removeModule()"(overrides?: Overrides): Promise<ContractTransaction>;

    updateFeeRecipient(
      _setToken: string,
      _newFeeRecipient: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "updateFeeRecipient(address,address)"(
      _setToken: string,
      _newFeeRecipient: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    updateStreamingFee(
      _setToken: string,
      _newFee: BigNumberish,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "updateStreamingFee(address,uint256)"(
      _setToken: string,
      _newFee: BigNumberish,
      overrides?: Overrides
    ): Promise<ContractTransaction>;
  };

  accrueFee(
    _setToken: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "accrueFee(address)"(
    _setToken: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  controller(overrides?: CallOverrides): Promise<string>;

  "controller()"(overrides?: CallOverrides): Promise<string>;

  feeStates(
    arg0: string,
    overrides?: CallOverrides
  ): Promise<{
    feeRecipient: string;
    maxStreamingFeePercentage: BigNumber;
    streamingFeePercentage: BigNumber;
    lastStreamingFeeTimestamp: BigNumber;
    0: string;
    1: BigNumber;
    2: BigNumber;
    3: BigNumber;
  }>;

  "feeStates(address)"(
    arg0: string,
    overrides?: CallOverrides
  ): Promise<{
    feeRecipient: string;
    maxStreamingFeePercentage: BigNumber;
    streamingFeePercentage: BigNumber;
    lastStreamingFeeTimestamp: BigNumber;
    0: string;
    1: BigNumber;
    2: BigNumber;
    3: BigNumber;
  }>;

  getFee(_setToken: string, overrides?: CallOverrides): Promise<BigNumber>;

  "getFee(address)"(
    _setToken: string,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  initialize(
    _setToken: string,
    _settings: {
      feeRecipient: string;
      maxStreamingFeePercentage: BigNumberish;
      streamingFeePercentage: BigNumberish;
      lastStreamingFeeTimestamp: BigNumberish;
    },
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "initialize(address,tuple)"(
    _setToken: string,
    _settings: {
      feeRecipient: string;
      maxStreamingFeePercentage: BigNumberish;
      streamingFeePercentage: BigNumberish;
      lastStreamingFeeTimestamp: BigNumberish;
    },
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  removeModule(overrides?: Overrides): Promise<ContractTransaction>;

  "removeModule()"(overrides?: Overrides): Promise<ContractTransaction>;

  updateFeeRecipient(
    _setToken: string,
    _newFeeRecipient: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "updateFeeRecipient(address,address)"(
    _setToken: string,
    _newFeeRecipient: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  updateStreamingFee(
    _setToken: string,
    _newFee: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "updateStreamingFee(address,uint256)"(
    _setToken: string,
    _newFee: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  callStatic: {
    accrueFee(_setToken: string, overrides?: CallOverrides): Promise<void>;

    "accrueFee(address)"(
      _setToken: string,
      overrides?: CallOverrides
    ): Promise<void>;

    controller(overrides?: CallOverrides): Promise<string>;

    "controller()"(overrides?: CallOverrides): Promise<string>;

    feeStates(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<{
      feeRecipient: string;
      maxStreamingFeePercentage: BigNumber;
      streamingFeePercentage: BigNumber;
      lastStreamingFeeTimestamp: BigNumber;
      0: string;
      1: BigNumber;
      2: BigNumber;
      3: BigNumber;
    }>;

    "feeStates(address)"(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<{
      feeRecipient: string;
      maxStreamingFeePercentage: BigNumber;
      streamingFeePercentage: BigNumber;
      lastStreamingFeeTimestamp: BigNumber;
      0: string;
      1: BigNumber;
      2: BigNumber;
      3: BigNumber;
    }>;

    getFee(_setToken: string, overrides?: CallOverrides): Promise<BigNumber>;

    "getFee(address)"(
      _setToken: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    initialize(
      _setToken: string,
      _settings: {
        feeRecipient: string;
        maxStreamingFeePercentage: BigNumberish;
        streamingFeePercentage: BigNumberish;
        lastStreamingFeeTimestamp: BigNumberish;
      },
      overrides?: CallOverrides
    ): Promise<void>;

    "initialize(address,tuple)"(
      _setToken: string,
      _settings: {
        feeRecipient: string;
        maxStreamingFeePercentage: BigNumberish;
        streamingFeePercentage: BigNumberish;
        lastStreamingFeeTimestamp: BigNumberish;
      },
      overrides?: CallOverrides
    ): Promise<void>;

    removeModule(overrides?: CallOverrides): Promise<void>;

    "removeModule()"(overrides?: CallOverrides): Promise<void>;

    updateFeeRecipient(
      _setToken: string,
      _newFeeRecipient: string,
      overrides?: CallOverrides
    ): Promise<void>;

    "updateFeeRecipient(address,address)"(
      _setToken: string,
      _newFeeRecipient: string,
      overrides?: CallOverrides
    ): Promise<void>;

    updateStreamingFee(
      _setToken: string,
      _newFee: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    "updateStreamingFee(address,uint256)"(
      _setToken: string,
      _newFee: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    FeeActualized(
      _setToken: string | null,
      _managerFee: null,
      _protocolFee: null
    ): EventFilter;

    FeeRecipientUpdated(
      _setToken: string | null,
      _newFeeRecipient: null
    ): EventFilter;

    StreamingFeeUpdated(
      _setToken: string | null,
      _newStreamingFee: null
    ): EventFilter;
  };

  estimateGas: {
    accrueFee(_setToken: string, overrides?: Overrides): Promise<BigNumber>;

    "accrueFee(address)"(
      _setToken: string,
      overrides?: Overrides
    ): Promise<BigNumber>;

    controller(overrides?: CallOverrides): Promise<BigNumber>;

    "controller()"(overrides?: CallOverrides): Promise<BigNumber>;

    feeStates(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

    "feeStates(address)"(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getFee(_setToken: string, overrides?: CallOverrides): Promise<BigNumber>;

    "getFee(address)"(
      _setToken: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    initialize(
      _setToken: string,
      _settings: {
        feeRecipient: string;
        maxStreamingFeePercentage: BigNumberish;
        streamingFeePercentage: BigNumberish;
        lastStreamingFeeTimestamp: BigNumberish;
      },
      overrides?: Overrides
    ): Promise<BigNumber>;

    "initialize(address,tuple)"(
      _setToken: string,
      _settings: {
        feeRecipient: string;
        maxStreamingFeePercentage: BigNumberish;
        streamingFeePercentage: BigNumberish;
        lastStreamingFeeTimestamp: BigNumberish;
      },
      overrides?: Overrides
    ): Promise<BigNumber>;

    removeModule(overrides?: Overrides): Promise<BigNumber>;

    "removeModule()"(overrides?: Overrides): Promise<BigNumber>;

    updateFeeRecipient(
      _setToken: string,
      _newFeeRecipient: string,
      overrides?: Overrides
    ): Promise<BigNumber>;

    "updateFeeRecipient(address,address)"(
      _setToken: string,
      _newFeeRecipient: string,
      overrides?: Overrides
    ): Promise<BigNumber>;

    updateStreamingFee(
      _setToken: string,
      _newFee: BigNumberish,
      overrides?: Overrides
    ): Promise<BigNumber>;

    "updateStreamingFee(address,uint256)"(
      _setToken: string,
      _newFee: BigNumberish,
      overrides?: Overrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    accrueFee(
      _setToken: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "accrueFee(address)"(
      _setToken: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    controller(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "controller()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    feeStates(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "feeStates(address)"(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getFee(
      _setToken: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "getFee(address)"(
      _setToken: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    initialize(
      _setToken: string,
      _settings: {
        feeRecipient: string;
        maxStreamingFeePercentage: BigNumberish;
        streamingFeePercentage: BigNumberish;
        lastStreamingFeeTimestamp: BigNumberish;
      },
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "initialize(address,tuple)"(
      _setToken: string,
      _settings: {
        feeRecipient: string;
        maxStreamingFeePercentage: BigNumberish;
        streamingFeePercentage: BigNumberish;
        lastStreamingFeeTimestamp: BigNumberish;
      },
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    removeModule(overrides?: Overrides): Promise<PopulatedTransaction>;

    "removeModule()"(overrides?: Overrides): Promise<PopulatedTransaction>;

    updateFeeRecipient(
      _setToken: string,
      _newFeeRecipient: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "updateFeeRecipient(address,address)"(
      _setToken: string,
      _newFeeRecipient: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    updateStreamingFee(
      _setToken: string,
      _newFee: BigNumberish,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "updateStreamingFee(address,uint256)"(
      _setToken: string,
      _newFee: BigNumberish,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;
  };
}
