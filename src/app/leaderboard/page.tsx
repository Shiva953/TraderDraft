'use client'

import { PointsLeaderboard } from '@/components/competition/PointsLeaderboard';
import { ArrowUpRight } from 'lucide-react';
import { useWallet } from '@/app/hooks/useWallet';
import { useLogin } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';

export default function LeaderboardPage() {
  const { isLoading: isWalletLoading, isConnected: authenticated } = useWallet();
  const { login } = useLogin();

  // Show loading state while checking authentication
  if (isWalletLoading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!authenticated) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-neutral-100 antialiased">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,170,120,0.18), rgba(255,90,90,0.06) 45%, transparent 70%)",
        }}
      />
      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      {/* Grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        {/* <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full bg-[#ff8a5b] shadow-[0_0_12px_rgba(255,138,91,0.9)]"
          />
        </div> */}
        <span
          className="hidden text-xs text-neutral-500 sm:inline"
          style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
        >
          v1.0 · SEASON 01
        </span>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-180px)] max-w-3xl flex-col items-center justify-center px-6 text-center">
        {/* <div
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-300 backdrop-blur"
          style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
        >
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live · 1,284 traders drafting now
        </div> */}

        <h1
          className="text-balance text-[clamp(3rem,9vw,6.5rem)] font-normal leading-[0.95] tracking-tight"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Trader
          <em
            className="italic text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(180deg, #ffd9b8 0%, #ff8a5b 60%, #d65a3a 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            Draft
          </em>
          {/* <br /> in crypto. */}
        </h1>

        <p
          className="mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-neutral-400"
          style={{ fontFamily: "'Geist', sans-serif" }}
        >
          Draft your KOLs, hold their tokens, and ride the chaos to the top of the leaderboard.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4">
          <Button
            onClick={() => login()}
            className="group h-12 cursor-pointer rounded-full bg-white px-7 text-[16px] font-medium text-black shadow-[0_8px_30px_-8px_rgba(255,255,255,0.4)] transition-all duration-300 hover:bg-white hover:shadow-[0_12px_40px_-8px_rgba(255,255,255,0.55)] hover:-translate-y-0.5"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            Sign in with Privy
            <ArrowUpRight className="ml-0.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
          <p
            className="text-xs text-neutral-500"
            style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
          >
            no wallet? no problem · email + passkey works
          </p>
        </div>

        {/* Stat ticker */}
        <div className="mt-16 grid w-full max-w-2xl grid-cols-3 divide-x divide-white/5 rounded-2xl border border-white/5 bg-white/[0.02] py-5 backdrop-blur">
          {[
            { k: "KOLs tracked", v: "412" },
            { k: "Avg. draft size", v: "5" },
            { k: "S1 prize pool", v: "$25k" },
          ].map((s) => (
            <div key={s.k} className="px-4 text-center">
              <div
                className="text-2xl text-neutral-100"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                {s.v}
              </div>
              <div
                className="mt-1 text-[10px] uppercase tracking-[0.18em] text-neutral-500"
                style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
              >
                {s.k}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-neutral-600"
        style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
      >
        <span>© TraderDraft</span>
        <span>Secured by Privy</span>
      </footer>
    </main>
    );
  }

  // Render leaderboard for authenticated users
  return (
    <main className="min-h-screen text-white">
      {/* Center-focused container with max width and responsive padding */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <PointsLeaderboard />
      </div>
    </main>
  );
}
