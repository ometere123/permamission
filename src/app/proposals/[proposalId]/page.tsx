import Link from "next/link";
import { notFound } from "next/navigation";
import { ChallengeReviewForm, ProposalActionButtons } from "@/components/write-actions";
import { TransactionRail } from "@/components/transaction-provider";
import { getMission, getProposal } from "@/lib/genlayer/contract";
import { displayTime, formatAttoGen, statusTone } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProposalDetail({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  const proposal = await getProposal(proposalId);
  if (!proposal) notFound();
  const mission = await getMission(proposal.mission_id);
  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_360px]">
      <section>
        <Link href={`/missions/${proposal.mission_id}`} className="tab-button">Back to mission</Link>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="dossier-label">{proposal.id}</span>
          <span className={`score-pill ${statusTone(proposal.status)}`}>{proposal.status}</span>
          <span className={`score-pill ${statusTone(proposal.verdict)}`}>{proposal.verdict}</span>
        </div>
        <h1 className="heading mt-3 text-5xl tracking-[0.05em]">{proposal.title}</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Panel label="Mission" value={proposal.mission_id} />
          <Panel label="Requested" value={formatAttoGen(proposal.requested_amount)} />
          <Panel label="Created" value={displayTime(proposal.created_at)} />
        </div>
        <div className="mt-8 manuscript-border bg-coal-900 p-5">
          <div className="dossier-label">Plan</div>
          <p className="mt-3 leading-7 text-margin">{proposal.plan}</p>
        </div>
        <div className="mt-6 manuscript-border bg-coal-900 p-5">
          <div className="dossier-label">Evidence URL</div>
          <a className="mono mt-3 block break-all text-gold underline" href={proposal.evidence_url} target="_blank" rel="noreferrer">{proposal.evidence_url}</a>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="manuscript-border bg-coal-900 p-5">
            <div className="dossier-label">Evidence Summary</div>
            <p className="mt-3 text-sm leading-7 text-margin">{proposal.evidence_summary || "Consensus review has not produced evidence notes yet."}</p>
          </div>
          <div className="manuscript-border bg-coal-900 p-5">
            <div className="dossier-label">Rationale</div>
            <p className="mt-3 text-sm leading-7 text-margin">{proposal.rationale || "Review the proposal to store a validator-backed rationale."}</p>
          </div>
        </div>
        {proposal.challenge_url ? (
          <div className="mt-6 manuscript-border bg-coal-900 p-5">
            <div className="dossier-label">Challenge Evidence</div>
            <a className="mono mt-3 block break-all text-gold underline" href={proposal.challenge_url} target="_blank" rel="noreferrer">{proposal.challenge_url}</a>
            <p className="mt-3 text-sm leading-7 text-margin">{proposal.challenge_summary}</p>
            <p className="mono mt-3 text-xs text-margin">Submitted {displayTime(proposal.challenged_at)}</p>
          </div>
        ) : null}
        {proposal.status === "PAID" ? (
          <div className="mt-6 manuscript-border bg-coal-900 p-5">
            <div className="dossier-label">Released Payment</div>
            <p className="mono mt-3 break-all text-gold">{formatAttoGen(proposal.paid_amount)} to {proposal.released_to}</p>
          </div>
        ) : null}
      </section>
      <aside className="space-y-6">
        <ProposalActionButtons proposalId={proposal.id} status={proposal.status} />
        <ChallengeReviewForm proposalId={proposal.id} status={proposal.status} proposer={proposal.proposer} steward={mission?.steward ?? ""} />
        <TransactionRail />
      </aside>
    </main>
  );
}

function Panel({ label, value }: { label: string; value: string }) {
  return <div className="manuscript-border bg-coal-900 p-4"><div className="dossier-label">{label}</div><div className="mono mt-2 break-all text-sm text-ivory">{value}</div></div>;
}
