"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { waitAccepted, writeContract } from "@/lib/genlayer/contract";
import { parseGen } from "@/lib/format";
import { useTransactions } from "./transaction-provider";
import { useWallet } from "./wallet-provider";

const DEMO_MISSION = {
  id: "mission-public-security-guides",
  name: "Public Security Guide Fund",
  charter: "Fund concise, public security education guides that translate official cyber guidance into plain-language checklists, templates, and review prompts for small community organizations.",
  constraints: "Work must cite durable public sources, avoid private or paywalled evidence, and produce reusable artifacts that a non-technical community maintainer can apply.",
  goal: "25",
  deposit: "8",
};

const DEMO_PROPOSAL = {
  id: "proposal-secure-by-design-guide-pack",
  title: "Secure by Design Guide Pack",
  amount: "3",
  evidence: "https://www.cisa.gov/resources-tools/resources/secure-by-design",
  plan: "Create a community guide pack summarizing secure-by-design principles into onboarding checklists, workshop slides, maintainer review prompts, and a public source index. The work will turn the official guidance into practical materials for small organizations while preserving source URLs for validator review.",
};

const DEMO_CHALLENGE = {
  evidence: "https://www.cisa.gov/securebydesign",
  summary: "This official CISA Secure by Design program page gives broader public context for the guidance and helps validators decide whether the proposal truly advances the mission rather than merely linking a related resource.",
};

function demoSuffix() {
  return Date.now().toString().slice(-6);
}

function writeErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Failed to fetch Version") || message.includes("unknown RPC error")) {
    return "Injected wallet RPC is not compatible with this GenLayer StudioNet write. Use the browser wallet, or import a browser key, then try again.";
  }
  return error instanceof Error ? error.message : fallback;
}

export function MissionForm() {
  const router = useRouter();
  const wallet = useWallet();
  const txs = useTransactions();
  const [state, setState] = useState({ id: "", name: "", charter: "", constraints: "", goal: "100", deposit: "1" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const client = await wallet.getWriteClient();
      const hash = await writeContract(
        client,
        "create_mission",
        [state.id, state.name, state.charter, state.constraints, parseGen(state.goal)],
        parseGen(state.deposit),
      );
      txs.track({ hash, label: `Create ${state.name}`, createdAt: new Date().toISOString(), status: "PENDING", functionName: "create_mission" });
      const receipt = await waitAccepted(client, hash);
      txs.update(hash, String(receipt.statusName ?? receipt.status ?? "ACCEPTED") as never);
      router.push(`/missions/${state.id}`);
    } catch (err) {
      setError(writeErrorMessage(err, "Create mission failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="folder p-6">
      <button
        type="button"
        className="tab-button mb-5"
        onClick={() => setState({ ...DEMO_MISSION, id: `${DEMO_MISSION.id}-${demoSuffix()}` })}
      >
        Use demo data
      </button>
      <div className="grid gap-4">
        <Field label="Mission ID" value={state.id} onChange={(id) => setState({ ...state, id })} placeholder="open-civic-memory" />
        <Field label="Name" value={state.name} onChange={(name) => setState({ ...state, name })} placeholder="Open Civic Memory" />
        <Area label="Charter" value={state.charter} onChange={(charter) => setState({ ...state, charter })} />
        <Area label="Constraints" value={state.constraints} onChange={(constraints) => setState({ ...state, constraints })} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Treasury Goal (GEN)" value={state.goal} onChange={(goal) => setState({ ...state, goal })} />
          <Field label="Initial Deposit (GEN)" value={state.deposit} onChange={(deposit) => setState({ ...state, deposit })} />
        </div>
      </div>
      {error ? <p className="mt-4 border border-red-400/50 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
      <button className="seal-tab mt-6 px-5 py-3" disabled={busy}>{busy ? "Submitting..." : "Create Mission"}</button>
    </form>
  );
}

export function ProposalForm({ missionId, steward }: { missionId: string; steward: string }) {
  const router = useRouter();
  const wallet = useWallet();
  const txs = useTransactions();
  const [state, setState] = useState({ id: "", title: "", amount: "10", plan: "", evidence: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const connected = wallet.address?.toLowerCase();
  const isSteward = Boolean(connected && connected === steward.toLowerCase());

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const client = await wallet.getWriteClient();
      if (isSteward) throw new Error("Use a proposer wallet. Mission stewards cannot submit to their own mission.");
      const hash = await writeContract(
        client,
        "submit_proposal",
        [state.id, missionId, state.title, parseGen(state.amount), state.plan, state.evidence],
        0n,
      );
      txs.track({ hash, label: `Submit ${state.title}`, createdAt: new Date().toISOString(), status: "PENDING", functionName: "submit_proposal" });
      const receipt = await waitAccepted(client, hash);
      txs.update(hash, String(receipt.statusName ?? receipt.status ?? "ACCEPTED") as never);
      router.push(`/proposals/${state.id}`);
    } catch (err) {
      setError(writeErrorMessage(err, "Submit proposal failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="folder p-6">
      <button
        type="button"
        className="tab-button mb-5"
        onClick={() => setState({ ...DEMO_PROPOSAL, id: `${DEMO_PROPOSAL.id}-${demoSuffix()}` })}
      >
        Use demo data
      </button>
      <div className="grid gap-4">
        <Field label="Proposal ID" value={state.id} onChange={(id) => setState({ ...state, id })} placeholder="archive-water-notices" />
        <Field label="Title" value={state.title} onChange={(title) => setState({ ...state, title })} />
        <Field label="Requested Amount (GEN)" value={state.amount} onChange={(amount) => setState({ ...state, amount })} />
        <Field label="Evidence URL" value={state.evidence} onChange={(evidence) => setState({ ...state, evidence })} placeholder="https://..." />
        <Area label="Plan" value={state.plan} onChange={(plan) => setState({ ...state, plan })} />
      </div>
      {error ? <p className="mt-4 border border-red-400/50 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
      {isSteward ? (
        <p className="mt-4 border border-amber-400/50 bg-amber-500/10 p-3 text-sm text-amber-100">
          Switch to a proposer wallet. The contract rejects steward-submitted proposals for this mission.
        </p>
      ) : null}
      <button className="seal-tab mt-6 px-5 py-3" disabled={busy || isSteward}>{busy ? "Submitting..." : "Submit Proposal"}</button>
    </form>
  );
}

export function ProposalActionButtons({ proposalId, status }: { proposalId: string; status: string }) {
  const wallet = useWallet();
  const txs = useTransactions();
  const [message, setMessage] = useState("");

  async function run(functionName: "review_proposal" | "review_challenge" | "release_payment") {
    try {
      setMessage("Waiting for wallet signature...");
      const client = await wallet.getWriteClient();
      const hash = await writeContract(client, functionName, [proposalId], 0n);
      txs.track({ hash, label: `${functionName} ${proposalId}`, createdAt: new Date().toISOString(), status: "PENDING", functionName });
      setMessage("Transaction sent. Consensus can take several minutes.");
      const receipt = await waitAccepted(client, hash);
      txs.update(hash, String(receipt.statusName ?? receipt.status ?? "ACCEPTED") as never);
      setMessage(`Reached ${String(receipt.statusName ?? receipt.status)}.`);
    } catch (error) {
      setMessage(writeErrorMessage(error, "Write failed."));
    }
  }

  return (
    <div className="manuscript-border bg-coal-900 p-5">
      <div className="dossier-label">Actions</div>
      <div className="mt-4 flex flex-wrap gap-3">
        {(status === "OPEN" || status === "NEEDS_EVIDENCE") ? <button className="seal-tab px-4 py-3" onClick={() => run("review_proposal")}>Review by Consensus</button> : null}
        {status === "CHALLENGED" ? <button className="seal-tab px-4 py-3" onClick={() => run("review_challenge")}>Review Challenge</button> : null}
        {status === "APPROVED" ? <button className="tab-button" onClick={() => run("release_payment")}>Release GEN</button> : null}
      </div>
      {message ? <p className="mt-4 text-sm text-margin" aria-live="polite">{message}</p> : null}
    </div>
  );
}

export function ChallengeReviewForm({ proposalId, status, proposer, steward }: { proposalId: string; status: string; proposer: string; steward: string }) {
  const wallet = useWallet();
  const txs = useTransactions();
  const [state, setState] = useState({ evidence: "", summary: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const connected = wallet.address?.toLowerCase();
  const isProposer = connected === proposer.toLowerCase();
  const isSteward = connected === steward.toLowerCase();
  const canChallenge = status === "APPROVED" ? isSteward : (status === "REJECTED" || status === "NEEDS_EVIDENCE") && (isProposer || isSteward);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const client = await wallet.getWriteClient();
      const hash = await writeContract(client, "open_challenge", [proposalId, state.evidence, state.summary], 0n);
      txs.track({ hash, label: `Open challenge ${proposalId}`, createdAt: new Date().toISOString(), status: "PENDING", functionName: "open_challenge" });
      setMessage("Challenge opened. Run challenge review after it finalizes.");
      const receipt = await waitAccepted(client, hash);
      txs.update(hash, String(receipt.statusName ?? receipt.status ?? "ACCEPTED") as never);
      setMessage(`Challenge reached ${String(receipt.statusName ?? receipt.status)}.`);
    } catch (error) {
      setMessage(writeErrorMessage(error, "Challenge failed."));
    } finally {
      setBusy(false);
    }
  }

  if (!canChallenge) return null;

  return (
    <form onSubmit={submit} className="manuscript-border bg-coal-900 p-5">
      <div className="dossier-label">Challenge Decision</div>
      <button
        type="button"
        className="tab-button mt-4"
        onClick={() => setState(DEMO_CHALLENGE)}
      >
        Use demo data
      </button>
      <div className="mt-4 grid gap-4">
        <Field label="Challenge Evidence URL" value={state.evidence} onChange={(evidence) => setState({ ...state, evidence })} placeholder="https://..." />
        <Area label="Challenge Summary" value={state.summary} onChange={(summary) => setState({ ...state, summary })} />
      </div>
      <button className="tab-button mt-5" disabled={busy}>{busy ? "Submitting..." : "Submit Challenge"}</button>
      {message ? <p className="mt-4 text-sm text-margin" aria-live="polite">{message}</p> : null}
    </form>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label>
      <span className="dossier-label">{label}</span>
      <input className="field mt-2" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="dossier-label">{label}</span>
      <textarea className="field mt-2 min-h-36" value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}
