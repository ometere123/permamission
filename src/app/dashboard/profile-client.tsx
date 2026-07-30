"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgeCheck, Banknote, FileText, FolderKanban, RefreshCw } from "lucide-react";
import { getProfile } from "@/lib/genlayer/contract";
import { displayTime, formatAttoGen, shortenAddress, statusTone } from "@/lib/format";
import type { Contribution, Mission, Profile, Proposal } from "@/lib/types";
import { useWallet } from "@/components/wallet-provider";

type LoadState = "idle" | "loading" | "ready" | "error";

export function DashboardClient() {
  const wallet = useWallet();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    if (!wallet.address) return;
    setState("loading");
    setError("");
    try {
      const next = await getProfile(wallet.address);
      setProfile(next ?? null);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile read failed.");
      setState("error");
    }
  }, [wallet.address]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadProfile();
    });
  }, [loadProfile]);

  const stats = useMemo(() => {
    const stewarded = profile?.stewarded_missions.length ?? 0;
    const submitted = profile?.submitted_proposals.length ?? 0;
    const funded = profile?.funded_missions.length ?? 0;
    const openChallenges = profile?.open_challenges.length ?? 0;
    return { stewarded, submitted, funded, openChallenges };
  }, [profile]);

  if (!wallet.address) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="folder p-6">
          <div className="dossier-label">Participant Dashboard</div>
          <h1 className="section-title mt-2">Connect a wallet to read your contract profile</h1>
          <p className="mt-4 max-w-2xl leading-7 text-margin">
            PermaMission profiles are assembled from contract state: stewarded missions, submitted proposals, funded missions, payouts, and open challenge responsibilities.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="dossier-label">Participant Dashboard</div>
          <h1 className="section-title mt-2">{shortenAddress(wallet.address)}</h1>
        </div>
        <button className="tab-button" onClick={loadProfile} disabled={state === "loading"}>
          <RefreshCw size={14} />
          {state === "loading" ? "Reading" : "Refresh"}
        </button>
      </div>

      {error ? <div className="mt-6 manuscript-border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}

      <section className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Stewarded" value={String(stats.stewarded)} />
        <Stat label="Submitted" value={String(stats.submitted)} />
        <Stat label="Funded" value={String(stats.funded)} />
        <Stat label="Challenges" value={String(stats.openChallenges)} />
        <Stat label="Funded GEN" value={formatAttoGen(profile?.funded_total ?? "0")} wide />
        <Stat label="Earned GEN" value={formatAttoGen(profile?.earned_total ?? "0")} wide />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <MissionSection title="Stewarded Missions" icon={<FolderKanban size={18} />} missions={profile?.stewarded_missions ?? []} />
        <ContributionSection contributions={profile?.funded_missions ?? []} />
        <ProposalSection title="Submitted Proposals" icon={<FileText size={18} />} proposals={profile?.submitted_proposals ?? []} />
        <ProposalSection title="Received Payouts" icon={<Banknote size={18} />} proposals={profile?.paid_proposals ?? []} />
      </section>

      <section className="mt-8">
        <ProposalSection title="Open Challenge Work" icon={<AlertTriangle size={18} />} proposals={profile?.open_challenges ?? []} wide />
      </section>
    </main>
  );
}

function Stat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`manuscript-border bg-coal-900 p-4 ${wide ? "md:col-span-2 lg:col-span-1" : ""}`}>
      <div className="dossier-label">{label}</div>
      <div className="mono mt-2 text-lg text-ivory">{value}</div>
    </div>
  );
}

function MissionSection({ title, icon, missions }: { title: string; icon: React.ReactNode; missions: Mission[] }) {
  return (
    <div className="manuscript-border bg-coal-900 p-5">
      <SectionTitle icon={icon} title={title} />
      <div className="mt-4 space-y-3">
        {missions.length === 0 ? <Empty text="No missions in this role yet." /> : missions.map((mission) => (
          <Link key={mission.id} href={`/missions/${mission.id}`} className="block manuscript-border bg-coal-950 p-4 hover:bg-coal-800">
            <div className="flex items-center justify-between gap-3">
              <span className="dossier-label">{mission.id}</span>
              <span className="score-pill">{mission.active ? "ACTIVE" : "CLOSED"}</span>
            </div>
            <h2 className="heading mt-2 text-2xl">{mission.name}</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <Mini label="Treasury" value={formatAttoGen(mission.treasury_available)} />
              <Mini label="Proposals" value={mission.proposal_count} />
              <Mini label="Paid" value={mission.paid_count} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ContributionSection({ contributions }: { contributions: Contribution[] }) {
  return (
    <div className="manuscript-border bg-coal-900 p-5">
      <SectionTitle icon={<BadgeCheck size={18} />} title="Funded Missions" />
      <div className="mt-4 space-y-3">
        {contributions.length === 0 ? <Empty text="No mission funding receipts yet." /> : contributions.map((contribution) => (
          <Link key={contribution.id} href={`/missions/${contribution.mission_id}`} className="block manuscript-border bg-coal-950 p-4 hover:bg-coal-800">
            <div className="dossier-label">{contribution.mission_id}</div>
            <div className="mono mt-2 text-lg text-ivory">{formatAttoGen(contribution.amount)}</div>
            <div className="mt-2 text-xs text-margin">Last funded {displayTime(contribution.last_funded_at)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProposalSection({ title, icon, proposals, wide }: { title: string; icon: React.ReactNode; proposals: Proposal[]; wide?: boolean }) {
  return (
    <div className={`manuscript-border bg-coal-900 p-5 ${wide ? "" : ""}`}>
      <SectionTitle icon={icon} title={title} />
      <div className="mt-4 grid gap-3">
        {proposals.length === 0 ? <Empty text="No proposals in this section." /> : proposals.map((proposal) => (
          <Link key={proposal.id} href={`/proposals/${proposal.id}`} className="block manuscript-border bg-coal-950 p-4 hover:bg-coal-800">
            <div className="flex items-center justify-between gap-3">
              <span className="dossier-label">{proposal.mission_id}</span>
              <span className={`score-pill ${statusTone(proposal.status)}`}>{proposal.status}</span>
            </div>
            <h2 className="heading mt-2 text-2xl">{proposal.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-margin">{proposal.plan}</p>
            <div className="mono mt-3 text-sm text-gold">{formatAttoGen(proposal.requested_amount)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-gold">
      {icon}
      <div className="dossier-label text-gold">{title}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="manuscript-border bg-coal-900 p-2">
      <div className="dossier-label">{label}</div>
      <div className="mono mt-1 break-all text-ivory">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="manuscript-border bg-coal-950 p-4 text-sm text-margin">{text}</div>;
}
