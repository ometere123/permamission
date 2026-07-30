import Link from "next/link";
import { Landmark, Scale, ShieldCheck, Telescope } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getSummary, listMissions, listProposals, verifyContractSchema } from "@/lib/genlayer/contract";
import { formatAttoGen } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [summary, missions, proposals, schema] = await Promise.all([
    getSummary(),
    listMissions(),
    listProposals(),
    verifyContractSchema(),
  ]);

  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="dossier-label">Autonomous Mission Trust</div>
          <h1 className="heading mt-4 max-w-4xl text-5xl tracking-[0.07em] text-ivory md:text-7xl">
            Fund a purpose. Let consensus guard the mission.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-margin">
            PermaMission lets communities create funded mission charters, accept public proposals, and use GenLayer validators to decide whether evidence-backed work actually advances the mission.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/missions/new" className="seal-tab px-5 py-3">Create Mission</Link>
            <Link href="/missions" className="tab-button">Browse Missions</Link>
          </div>
        </div>
        <div className="folder p-6">
          <div className="dossier-label">Live Ledger</div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Stat label="Missions" value={String(summary.mission_count)} />
            <Stat label="Proposals" value={String(summary.proposal_count)} />
            <Stat label="Contract Balance" value={formatAttoGen(summary.balance)} wide />
            <Stat label="Schema" value={schema.ok ? "Verified" : schema.configured ? "Mismatch" : "Contract not configured"} wide />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-4 md:grid-cols-4">
          {instruments.map(([title, copy, Icon]) => (
            <div className="manuscript-border bg-coal-900 p-5" key={String(title)}>
              <Icon className="text-gold" size={22} />
              <h2 className="heading mt-4 text-xl text-ivory">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-margin">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-2">
        <div>
          <div className="dossier-label">Open Missions</div>
          <div className="mt-4 space-y-4">
            {missions.length === 0 ? (
              <div className="manuscript-border bg-coal-900 p-5 text-margin">
                No missions have been read from the configured contract yet.
              </div>
            ) : missions.slice(0, 3).map((mission) => (
              <Link key={mission.id} href={`/missions/${mission.id}`} className="block manuscript-border bg-coal-900 p-5 hover:bg-coal-800">
                <div className="dossier-label">{mission.id}</div>
                <h3 className="heading mt-1 text-2xl">{mission.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-margin">{mission.charter}</p>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="dossier-label">Recent Proposals</div>
          <div className="mt-4 space-y-4">
            {proposals.length === 0 ? (
              <div className="manuscript-border bg-coal-900 p-5 text-margin">
                No proposals have been read from the configured contract yet.
              </div>
            ) : proposals.slice(0, 3).map((proposal) => (
              <Link key={proposal.id} href={`/proposals/${proposal.id}`} className="block manuscript-border bg-coal-900 p-5 hover:bg-coal-800">
                <div className="flex items-center justify-between gap-3">
                  <span className="dossier-label">{proposal.mission_id}</span>
                  <span className="score-pill">{proposal.status}</span>
                </div>
                <h3 className="heading mt-2 text-2xl">{proposal.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-margin">{proposal.plan}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`manuscript-border bg-coal-950 p-4 ${wide ? "col-span-2" : ""}`}>
      <div className="dossier-label">{label}</div>
      <div className="mono mt-2 text-lg text-ivory">{value}</div>
    </div>
  );
}
  const instruments: Array<[string, string, LucideIcon]> = [
    ["Mission charter", "A public, immutable operating purpose.", Landmark],
    ["Evidence fetch", "The contract retrieves cited evidence during review.", Telescope],
    ["Consensus verdict", "Validators compare proposal, charter, and evidence.", Scale],
    ["Treasury action", "Approved work can move through payout states.", ShieldCheck],
  ];
