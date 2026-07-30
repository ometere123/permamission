import Link from "next/link";
import { listProposals } from "@/lib/genlayer/contract";
import { formatAttoGen, statusTone } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const proposals = await listProposals();
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="dossier-label">Proposal Docket</div>
      <h1 className="section-title mt-2">Work awaiting mission judgement</h1>
      <div className="mt-8 space-y-4">
        {proposals.length === 0 ? (
          <div className="manuscript-border bg-coal-900 p-6 text-margin">
            No proposals were returned by the contract yet.
          </div>
        ) : proposals.map((proposal) => (
          <Link key={proposal.id} href={`/proposals/${proposal.id}`} className="block manuscript-border bg-coal-900 p-5 hover:bg-coal-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="dossier-label">{proposal.mission_id}</div>
                <h2 className="heading mt-1 text-2xl">{proposal.title}</h2>
              </div>
              <span className={`score-pill ${statusTone(proposal.status)}`}>{proposal.status}</span>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-margin">{proposal.plan}</p>
            <div className="mono mt-4 text-sm text-gold">{formatAttoGen(proposal.requested_amount)}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
