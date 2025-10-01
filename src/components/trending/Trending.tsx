import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type TrendingItem = {
  name: string;
  price: number; // e.g., in SOL or USDC
  deltaPct?: number;
  avatarUrl?: string;
};

export function Trending({ items = [] as TrendingItem[] }: { items?: TrendingItem[] }) {
  return (
    <Card className="border-neutral-800 bg-neutral-900/40 p-4 text-neutral-200">
      <h3 className="mb-3 text-sm text-neutral-400">Trending</h3>
      <div className="space-y-2">
        {items.map((it) => (
          <Card key={it.name} className="flex items-center justify-between bg-neutral-800/60 px-3 py-2 border-neutral-700">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 overflow-hidden rounded-md bg-neutral-700" />
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide">{it.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm tabular-nums">{it.price}</div>
              {typeof it.deltaPct === "number" && (
                <Badge
                  variant="outline"
                  className={`text-xs border-0 ${it.deltaPct >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}
                >
                  {it.deltaPct >= 0 ? "↑" : "↓"} {Math.abs(it.deltaPct).toFixed(1)}%
                </Badge>
              )}
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="rounded-lg bg-neutral-800/50 p-4 text-center text-sm text-neutral-400">No trending data</div>
        )}
      </div>
    </Card>
  );
} 