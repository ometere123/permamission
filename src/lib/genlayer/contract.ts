import { TransactionStatus } from "genlayer-js/types";
import type { CalldataEncodable, GenLayerClient, TransactionHash } from "genlayer-js/types";
import { CONTRACT_ADDRESS, REQUIRED_METHODS } from "./config";
import { createReadClient } from "./read-client";
import type { Contribution, Mission, Profile, Proposal, Summary } from "../types";

type Client = GenLayerClient<typeof import("./config").chain>;

export async function verifyContractSchema() {
  if (!CONTRACT_ADDRESS) return { ok: false, missing: REQUIRED_METHODS, configured: false };
  const address = CONTRACT_ADDRESS;
  const client = createReadClient();
  const schema = await readMaybe<{ methods: Record<string, unknown> }>(() => client.getContractSchema(address));
  if (!schema) return { ok: false, missing: REQUIRED_METHODS, configured: true };
  const missing = REQUIRED_METHODS.filter((method) => !schema.methods[method]);
  return { ok: missing.length === 0, missing, configured: true };
}

export async function getSummary() {
  if (!CONTRACT_ADDRESS) return emptySummary();
  const address = CONTRACT_ADDRESS;
  const client = createReadClient();
  return (await readMaybe<Summary>(() => client.readContract({ address, functionName: "get_summary", args: [] }))) ?? emptySummary();
}

export async function listMissions(): Promise<Mission[]> {
  if (!CONTRACT_ADDRESS) return [];
  const address = CONTRACT_ADDRESS;
  const client = createReadClient();
  return (await readMaybe<Mission[]>(() => client.readContract({
    address,
    functionName: "list_missions",
    args: [0n, 50n],
  }))) ?? [];
}

export async function listProposals(missionId = ""): Promise<Proposal[]> {
  if (!CONTRACT_ADDRESS) return [];
  const address = CONTRACT_ADDRESS;
  const client = createReadClient();
  return (await readMaybe<Proposal[]>(() => client.readContract({
    address,
    functionName: "list_proposals",
    args: [missionId, 0n, 100n],
  }))) ?? [];
}

export async function listContributions(account: `0x${string}`): Promise<Contribution[]> {
  if (!CONTRACT_ADDRESS) return [];
  const address = CONTRACT_ADDRESS;
  const client = createReadClient();
  return (await readMaybe<Contribution[]>(() => client.readContract({
    address,
    functionName: "list_contributions",
    args: [account, 0n, 100n],
  }))) ?? [];
}

export async function getMission(id: string): Promise<Mission | undefined> {
  if (!CONTRACT_ADDRESS) return undefined;
  const address = CONTRACT_ADDRESS;
  const client = createReadClient();
  return readMaybe<Mission>(() => client.readContract({ address, functionName: "get_mission", args: [id] }));
}

export async function getProposal(id: string): Promise<Proposal | undefined> {
  if (!CONTRACT_ADDRESS) return undefined;
  const address = CONTRACT_ADDRESS;
  const client = createReadClient();
  return readMaybe<Proposal>(() => client.readContract({ address, functionName: "get_proposal", args: [id] }));
}

export async function getProfile(account: `0x${string}`): Promise<Profile | undefined> {
  if (!CONTRACT_ADDRESS) return undefined;
  const address = CONTRACT_ADDRESS;
  const client = createReadClient();
  return readMaybe<Profile>(() => client.readContract({ address, functionName: "get_profile", args: [account] }));
}

export async function writeContract(
  client: Client,
  functionName: string,
  args: CalldataEncodable[],
  value: bigint,
) {
  if (!CONTRACT_ADDRESS) throw new Error("No deployed contract address is configured.");
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value,
    consensusMaxRotations: 3,
  });
  return hash as TransactionHash;
}

function emptySummary(): Summary {
  return {
    steward: "",
    mission_count: 0,
    proposal_count: 0,
    contribution_count: 0,
    balance: "0",
  };
}

async function readMaybe<T>(read: () => Promise<unknown>): Promise<T | undefined> {
  try {
    return (await read()) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("execution failed") ||
      message.includes("Missing or invalid parameters") ||
      message.includes("Rate limit exceeded") ||
      message.includes("QueuePool limit") ||
      message.includes("Unexpected token")
    ) {
      return undefined;
    }
    throw error;
  }
}

export async function waitAccepted(client: Client, hash: TransactionHash) {
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    interval: 5000,
    retries: 90,
  });
  const finalized = await client.getTransaction({ hash });
  const result = finalized?.consensus_data?.leader_receipt?.[0]?.execution_result;
  if (result && result !== "SUCCESS") {
    throw new Error(`GenLayer contract execution failed (${result}). Transaction: ${hash}`);
  }
  return receipt;
}
