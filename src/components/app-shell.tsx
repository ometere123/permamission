import Image from "next/image";
import Link from "next/link";
import { WalletPanel } from "./wallet-panel";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-coal-950 text-ivory">
      <header className="border-b border-stone-800 bg-coal-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/permamission-mark.svg" alt="" width={40} height={40} priority />
            <span className="heading hidden text-2xl tracking-[0.16em] text-ivory sm:inline">PERMAMISSION</span>
          </Link>
          <nav className="hidden items-center gap-3 md:flex">
            <Link className="tab-button" href="/missions">Missions</Link>
            <Link className="tab-button" href="/missions/new">New Mission</Link>
            <Link className="tab-button" href="/proposals">Proposals</Link>
          </nav>
          <WalletPanel />
        </div>
      </header>
      {children}
      <footer className="mx-auto max-w-7xl px-5 py-10 text-sm text-margin">
        PermaMission is a GenLayer mission trust. The configured contract is the source of truth for every mission, proposal, review, and payout state.
      </footer>
    </div>
  );
}
