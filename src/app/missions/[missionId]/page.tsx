import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposalForm } from "@/components/write-actions";
import { getMission, listProposals } from "@/lib/genlayer/contract";
import { displayTime, formatAttoGen, statusTone } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MissionDetail({ params }: { params: Promise<{ missionId: string }> }) {
  const { missionId } = await params;
  const [mission, proposals] = await Promise.all([getMission(missionId), listProposals(missionId)]);
  if (!mission) notFound();
  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_430px]">
      <section>
        <div className="dossier-label">{mission.id}</div>
        <h1 className="heading mt-2 text-5xl tracking-[0.06em]">{mission.name}</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Panel label="Treasury" value={formatAttoGen(mission.treasury_available)} />
          <Panel label="Goal" value={formatAttoGen(mission.treasury_goal)} />
          <Panel label="Created" value={displayTime(mission.created_at)} />
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <TextBlock label="Charter" text={mission.charter} />
          <TextBlock label="Constraints" text={mission.constraints} />
        </div>
        <div className="mt-10">
          <div className="dossier-label">Proposals</div>
          <div className="mt-4 space-y-4">
            {proposals.length === 0 ? (
              <div className="manuscript-border bg-coal-900 p-5 text-margin">No proposals yet. The form beside this record is the first path.</div>
            ) : proposals.map((proposal) => (
              <Link key={proposal.id} href={`/proposals/${proposal.id}`} className="block manuscript-border bg-coal-900 p-5 hover:bg-coal-800">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="heading text-2xl">{proposal.title}</h2>
                  <span className={`score-pill ${statusTone(proposal.status)}`}>{proposal.status}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-margin">{proposal.plan}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <aside>
        <ProposalForm missionId={mission.id} steward={mission.steward} />
      </aside>
    </main>
  );
}

function Panel({ label, value }: { label: string; value: string }) {
  return <div className="manuscript-border bg-coal-900 p-4"><div className="dossier-label">{label}</div><div className="mono mt-2 text-sm text-ivory">{value}</div></div>;
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return <div className="manuscript-border bg-coal-900 p-5"><div className="dossier-label">{label}</div><p className="mt-3 text-sm leading-7 text-margin">{text}</p></div>;
}
