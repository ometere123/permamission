import { readFileSync } from "node:fs";
import { createAccount, createClient } from "genlayer-js";
import { studionet, localnet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";

const chains = { studionet, localnet, testnetAsimov, testnetBradbury };
const chainName = process.env.NEXT_PUBLIC_GENLAYER_CHAIN ?? "studionet";
const endpoint = process.env.NEXT_PUBLIC_GENLAYER_ENDPOINT ?? "https://studio.genlayer.com/api";
const address = process.env.NEXT_PUBLIC_PERMAMISSION_CONTRACT;
const required = [
  "create_mission",
  "fund_mission",
  "submit_proposal",
  "review_proposal",
  "open_challenge",
  "review_challenge",
  "release_payment",
  "mark_paid",
  "close_mission",
  "get_summary",
  "list_missions",
  "list_proposals",
  "get_mission",
  "get_proposal",
];

if (!address) {
  console.error("NEXT_PUBLIC_PERMAMISSION_CONTRACT is not set.");
  process.exit(1);
}

const client = createClient({ chain: chains[chainName], endpoint, account: createAccount() });
const schema = await client.getContractSchema(address);
const missing = required.filter((method) => !schema.methods[method]);

if (missing.length) {
  console.error(`Missing contract methods: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`Schema verified for ${address}.`);

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
if (pkg.dependencies["genlayer-js"] !== "1.1.8") {
  console.warn(`genlayer-js dependency is ${pkg.dependencies["genlayer-js"]}; expected 1.1.8.`);
}
