import React from "react";

export type TrendingItem = {
  name: string;
  price: number; // e.g., in SOL or USDC
  deltaPct?: number;
  avatarUrl?: string;
};

export function Trending({ items = [] as TrendingItem[] }: { items?: TrendingItem[] }) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-neutral-200">
      <h3 className="mb-3 text-sm text-neutral-400">Trending</h3>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.name} className="flex items-center justify-between rounded-lg bg-neutral-800/60 px-3 py-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 overflow-hidden rounded-md bg-neutral-700" />
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide">{it.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm tabular-nums">{it.price}</div>
              {typeof it.deltaPct === "number" && (
                <div className={`text-xs ${it.deltaPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {it.deltaPct >= 0 ? "↑" : "↓"} {Math.abs(it.deltaPct).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-lg bg-neutral-800/50 p-4 text-center text-sm text-neutral-400">No trending data</div>
        )}
      </div>
    </section>
  );
} 