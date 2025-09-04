import React from "react";

export type LeaderboardEntry = {
  rank: number;
  handle: string;
  avatarUrl?: string;
  changePct?: number; // positive up, negative down
};

export function Leaderboard({ title = "Top Traders", entries = [] as LeaderboardEntry[] }: { title?: string; entries?: LeaderboardEntry[] }) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-neutral-200">
      <h2 className="mb-3 text-center text-sm tracking-widest text-neutral-400">{title.toUpperCase()}</h2>
      <div className="space-y-3">
        {entries.map((e) => (
          <div key={e.rank} className="flex items-center justify-between rounded-lg bg-neutral-800/60 px-3 py-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 overflow-hidden rounded-md bg-neutral-700" />
              <div className="text-sm">
                <span className="font-medium">{e.handle}</span>
                {typeof e.changePct === "number" && (
                  <span className={`ml-2 text-xs ${e.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {e.changePct >= 0 ? "↑" : "↓"}
                    {Math.abs(e.changePct).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button className="rounded-md bg-white px-3 py-1 text-neutral-900">BUY</button>
              <button className="rounded-md bg-neutral-900 px-3 py-1 text-white ring-1 ring-white/20">SELL</button>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="rounded-lg bg-neutral-800/50 p-4 text-center text-sm text-neutral-400">No entries yet</div>
        )}
      </div>
    </section>
  );
} 