import React from "react";
import { FiArrowUpRight } from "react-icons/fi";
import Image from "next/image";

export type LeaderboardEntry = {
  rank: number;
  handle: string;
  avatarUrl?: string;
  xUrl?: string; // external profile link
  traderUrl?: string; // internal trader details link
  pnlSol?: number; // profit and loss in SOL
  sharePrice?: number; // current share price in SOL
  shareDeltaPct?: number; // share price percentage change
};

export function Leaderboard({ title = "Top Traders", entries = [] as LeaderboardEntry[] }: { title?: string; entries?: LeaderboardEntry[] }) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-neutral-200">
      <h2 className="mb-3 text-center text-sm tracking-widest text-neutral-400">{title.toUpperCase()}</h2>
      {/* Header labels */}
      <div className="grid [grid-template-columns:1fr_220px_200px] items-center gap-8 px-3 pb-2 text-xs uppercase tracking-wider text-neutral-400">
        <div />
        <div className="justify-self-end ml--6">PnL</div>
        <div className="justify-self-end">Share Price</div>
      </div>
      <div className="space-y-3">
        {entries.map((e) => {
          const pnlPositive = (e.pnlSol ?? 0) >= 0;
          const deltaPositive = (e.shareDeltaPct ?? 0) >= 0;
          return (
            <div key={e.rank} className="grid [grid-template-columns:1fr_220px_200px] items-center gap-8 rounded-lg bg-neutral-900 px-3 py-3 ring-1 ring-white/10">
              {/* Rank + Trader */}
              <div className="flex min-w-0 items-center gap-4">
                {e.traderUrl ? (
                  <a href={e.traderUrl} target="_blank" rel="noreferrer" aria-label={`${e.handle} profile`} className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-neutral-700 cursor-pointer">
                    {e.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.avatarUrl} alt={e.handle} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-neutral-700" />
                    )}
                  </a>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-neutral-700">
                    {e.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.avatarUrl} alt={e.handle} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-neutral-700" />
                    )}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-3 text-white">
                    <span className="truncate text-lg font-semibold">{e.handle}</span>
                    {e.traderUrl && (
                      <a href={e.traderUrl} className="text-sky-400 hover:text-sky-300" target="_blank" rel="noreferrer" aria-label="Open trader page">
                        <FiArrowUpRight className="h-5 w-5" />
                      </a>
                    )}
                    {e.xUrl && (
                      <a href={e.xUrl} className="opacity-70 hover:opacity-100" target="_blank" rel="noreferrer" aria-label="Open on X">
                        <Image src="/x.png" alt="X" width={16} height={16} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* PnL */}
              <div className={`whitespace-nowrap justify-self-end text-xl font-semibold ${pnlPositive ? "text-emerald-400" : "text-rose-400"}`}>
                {typeof e.pnlSol === "number" ? `${pnlPositive ? "+" : "-"}${Math.abs(e.pnlSol).toFixed(2)} SOL` : "—"}
              </div>

              {/* Share Price */}
              <div className="flex items-baseline justify-self-end gap-2 text-right">
                <span className="text-2xl text-white">{typeof e.sharePrice === "number" ? e.sharePrice.toFixed(3) : "—"}</span>
                {typeof e.shareDeltaPct === "number" && (
                  <span className={`text-sm ${deltaPositive ? "text-emerald-400" : "text-rose-400"}`}>
                    {deltaPositive ? "↑" : "↓"}{Math.abs(e.shareDeltaPct).toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {entries.length === 0 && (
          <div className="rounded-lg bg-neutral-800/50 p-4 text-center text-sm text-neutral-400">No entries yet</div>
        )}
      </div>
    </section>
  );
} 