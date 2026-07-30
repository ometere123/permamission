import { createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const address = process.env.NEXT_PUBLIC_PERMAMISSION_CONTRACT;
if (!address) {
  console.error("NEXT_PUBLIC_PERMAMISSION_CONTRACT is required");
  process.exit(1);
}

const GEN = 10n ** 18n;
const privateKey = process.env.PERMAMISSION_EXERCISE_PRIVATE_KEY || generatePrivateKey();
const account = createAccount(privateKey);
const endpoint = process.env.NEXT_PUBLIC_GENLAYER_ENDPOINT ?? "https://studio.genlayer.com/api";
const client = createClient({ chain: studionet, endpoint, account });

const stamp = Date.now().toString().slice(-6);
const missionId = `mission-${stamp}`;
const proposalId = `proposal-${stamp}`;

const txs = [];

async function wait(hash, label, target = TransactionStatus.ACCEPTED) {
  console.log(`${label}: ${hash}`);
  txs.push({ label, hash });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: target,
    interval: 5000,
    retries: 90,
  });
  console.log(`${label} reached ${receipt.statusName || receipt.status}`);
  return receipt;
}

async function write(label, functionName, args, value = 0n, target = TransactionStatus.ACCEPTED) {
  const hash = await client.writeContract({
    address,
    functionName,
    args,
    value,
    consensusMaxRotations: 3,
  });
  return wait(hash, label, target);
}

console.log(`Account: ${account.address}`);
console.log(`Private key for reproduction: ${privateKey}`);
console.log(`Contract: ${address}`);

await write("create_mission", "create_mission", [
  missionId,
  "Example Domain Stewardship",
  "Maintain public educational material that explains reserved example domains, why they exist, how builders should use them safely, and how civic or open-source documentation can cite them without relying on private services.",
  "Fund only public documentation work with durable source links, clear attribution, reproducible artifacts, and no private advertising or partisan campaigning.",
  25n * GEN,
], 10n * GEN);

await write("fund_mission", "fund_mission", [missionId], 2n * GEN);

await write("submit_proposal", "submit_proposal", [
  proposalId,
  missionId,
  "Publish example-domain explainer",
  1n * GEN,
  "Create a public explainer that cites the official IANA example-domain page, explains the reserved-domain purpose, and ships a reusable one-page guide for educators and open-source maintainers.",
  "https://www.iana.org/help/example-domains",
]);

await write("review_proposal", "review_proposal", [proposalId], 0n, TransactionStatus.ACCEPTED);

const proposal = await client.readContract({
  address,
  functionName: "get_proposal",
  args: [proposalId],
});
console.log("proposal after review:", JSON.stringify(proposal, null, 2));

let released = false;

if (proposal?.status === "APPROVED") {
  await write("challenge_review", "challenge_review", [
    proposalId,
    "https://www.iana.org/domains/reserved",
    "The official reserved-domain registry provides additional public evidence that example domains are specifically set aside for documentation and educational material, reinforcing the mission fit before any payout is released.",
  ]);

  await write("review_proposal_after_challenge", "review_proposal", [proposalId], 0n, TransactionStatus.ACCEPTED);

  const challengedProposal = await client.readContract({
    address,
    functionName: "get_proposal",
    args: [proposalId],
  });
  console.log("proposal after challenge review:", JSON.stringify(challengedProposal, null, 2));

  if (challengedProposal?.status !== "APPROVED") {
    console.log("release_payment skipped because challenge review did not approve");
  } else {
    await write("release_payment", "release_payment", [proposalId]);
    released = true;
  }
} else if (proposal?.status === "REJECTED" || proposal?.status === "NEEDS_EVIDENCE") {
  await write("challenge_review", "challenge_review", [
    proposalId,
    "https://www.iana.org/domains/reserved",
    "Additional public evidence is supplied so validators can re-check whether the planned documentation is aligned with the mission charter.",
  ]);
  await write("review_proposal_after_challenge", "review_proposal", [proposalId], 0n, TransactionStatus.ACCEPTED);
} else {
  console.log("challenge_review skipped because proposal is not in a challengeable decision state");
}

const latestProposal = await client.readContract({
  address,
  functionName: "get_proposal",
  args: [proposalId],
});

if (!released && latestProposal?.status === "APPROVED") {
  await write("release_payment", "release_payment", [proposalId]);
} else {
  console.log(released ? "release_payment completed" : "release_payment skipped because proposal was not APPROVED after final review");
}

await write("close_mission", "close_mission", [missionId]);

const summary = await client.readContract({
  address,
  functionName: "get_summary",
  args: [],
});

console.log("summary:", JSON.stringify(summary, null, 2));
console.log("transactions:", JSON.stringify(txs, null, 2));
