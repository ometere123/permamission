import Link from "next/link";
import { listMissions } from "@/lib/genlayer/contract";
import { formatAttoGen } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const missions = await listMissions();
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="dossier-label">Mission Registry</div>
          <h1 className="section-title mt-2">Open mission trusts</h1>
        </div>
        <Link href="/missions/new" className="seal-tab px-4 py-3">New Mission</Link>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {missions.length === 0 ? (
          <div className="manuscript-border bg-coal-900 p-6 text-margin md:col-span-2">
            No missions were returned by the contract. Deploy PermaMission, set `NEXT_PUBLIC_PERMAMISSION_CONTRACT`, then create the first mission.
          </div>
        ) : missions.map((mission) => (
          <Link key={mission.id} href={`/missions/${mission.id}`} className="folder p-5 hover:bg-coal-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="dossier-label">{mission.id}</div>
                <h2 className="heading mt-2 text-3xl">{mission.name}</h2>
              </div>
              <span className="score-pill">{mission.active ? "ACTIVE" : "CLOSED"}</span>
            </div>
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-margin">{mission.charter}</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
              <Mini label="Treasury" value={formatAttoGen(mission.treasury_available)} />
              <Mini label="Proposals" value={mission.proposal_count} />
              <Mini label="Approved" value={mission.approved_count} />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="manuscript-border bg-coal-950 p-3"><div className="dossier-label">{label}</div><div className="mono mt-1 text-ivory">{value}</div></div>;
}
