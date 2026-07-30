import { MissionForm } from "@/components/write-actions";
import { TransactionRail } from "@/components/transaction-provider";

export default function NewMissionPage() {
  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="dossier-label">New Charter</div>
        <h1 className="section-title mt-2">Create a mission trust</h1>
        <p className="mt-4 max-w-2xl text-margin">Creation is deterministic and fast. GenLayer consensus is reserved for proposal review, where judgement actually matters.</p>
        <div className="mt-8"><MissionForm /></div>
      </div>
      <TransactionRail />
    </main>
  );
}
