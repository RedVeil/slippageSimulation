import { ethers } from "ethers";
import { JsonRpcProvider } from '@ethersproject/providers';

export const getCreatedSetTokenAddress = async (txnHash: string | undefined, provider: JsonRpcProvider): Promise<string> => {
  if (!txnHash) {
    throw new Error("Invalid transaction hash");
  }

  const abi = ['event SetTokenCreated(address indexed _setToken, address _manager, string _name, string _symbol)'];
  const iface = new ethers.utils.Interface(abi);

  const topic = ethers.utils.id('SetTokenCreated(address,address,string,string)');
  const logs = await provider.getLogs({
    fromBlock: "latest",
    toBlock: "latest",
    topics: [topic],
  });

  const parsed = iface.parseLog(logs[logs.length - 1]);
  return parsed.args[0]
}
export default getCreatedSetTokenAddress;