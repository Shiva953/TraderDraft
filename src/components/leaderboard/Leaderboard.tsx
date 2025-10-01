import React from "react";
import { FiArrowUpRight } from "react-icons/fi";
import Image from "next/image";
import Link from "next/link";
import type { LeaderboardEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardProps {
  title?: string;
  entries: LeaderboardEntry[];
  loading?: boolean;
  showActions?: boolean; // Flag to show Buy/Sell buttons during competition
}

export function Leaderboard({
  title = "Top Traders",
  entries = [],
  loading = false,
  showActions = false
}: LeaderboardProps) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-neutral-200">
      {/* Header */}
      <h2 className="mb-3 text-center text-sm tracking-widest text-neutral-400">{title.toUpperCase()}</h2>

      {/* Header labels - Updated with new columns */}
      <div className={`grid items-center gap-3 px-3 pb-2 text-xs uppercase tracking-wider text-neutral-400 ${
        showActions
          ? '[grid-template-columns:1fr_90px_90px_100px_150px]'
          : '[grid-template-columns:1fr_120px_100px_120px_100px]'
      }`}>
        <div>Trader</div>
        <div className="justify-self-end">{showActions ? 'Price' : 'Token Price'}</div>
        <div className="justify-self-end">24h</div>
        <div className="justify-self-end">PnL</div>
        <div className="justify-self-end">{showActions ? 'Actions' : 'Win Rate'}</div>
      </div>

      <div className="space-y-3">
        {loading ? (
          // Loading skeletons - Updated for new columns using shadcn Skeleton
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`skeleton-${i}`} className={`grid items-center gap-3 rounded-lg bg-neutral-900 px-3 py-3 ring-1 ring-white/10 ${
              showActions
                ? '[grid-template-columns:1fr_90px_90px_100px_150px]'
                : '[grid-template-columns:1fr_120px_100px_120px_100px]'
            }`}>
              {/* Rank + Trader skeleton */}
              <div className="flex min-w-0 items-center gap-3">
                <Skeleton className="h-8 w-8 bg-neutral-700" />
                <Skeleton className="h-10 w-10 bg-neutral-700" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-4 w-32 bg-neutral-700" />
                  <Skeleton className="h-3 w-20 bg-neutral-700" />
                </div>
              </div>
              {/* Price skeleton */}
              <div className="justify-self-end">
                <Skeleton className="h-5 w-16 bg-neutral-700" />
              </div>
              {/* Change skeleton */}
              <div className="justify-self-end">
                <Skeleton className="h-5 w-14 bg-neutral-700" />
              </div>
              {/* PnL skeleton */}
              <div className="justify-self-end">
                <Skeleton className="h-5 w-20 bg-neutral-700" />
              </div>
              {/* Action/Win Rate skeleton */}
              <div className="justify-self-end">
                {showActions ? (
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-14 bg-neutral-700" />
                    <Skeleton className="h-7 w-14 bg-neutral-700" />
                  </div>
                ) : (
                  <Skeleton className="h-5 w-16 bg-neutral-700" />
                )}
              </div>
            </div>
          ))
        ) : (
          entries.map((e) => {
            // Determine if PnL is positive or negative for coloring
            const pnlText = e.pnl || "—";
            const isPnlPositive = pnlText.includes('+') || (!pnlText.includes('-') && !pnlText.includes('—') && pnlText !== '0');

            // Determine price change color
            const priceChangePercent = e.priceChange24hPercent || 0;
            const isPricePositive = priceChangePercent >= 0;

            return (
              <div key={`${e.rank}-${e.handle}-${e.walletAddress}`} className={`grid items-center gap-3 rounded-lg bg-neutral-900 px-3 py-3 ring-1 ring-white/10 ${
                showActions
                  ? '[grid-template-columns:1fr_90px_90px_100px_150px]'
                  : '[grid-template-columns:1fr_120px_100px_120px_100px]'
              }`}>
                {/* Rank + Trader */}
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-700 text-xs font-bold text-neutral-300">
                    {e.rank}
                  </div>

                  {e.traderUrl ? (
                    <a href={e.traderUrl} target="_blank" rel="noreferrer" aria-label={`${e.handle} profile`} className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-700 cursor-pointer hover:ring-2 hover:ring-white/20 transition-all">
                      {e.avatarUrl ? (
                        <img src={e.avatarUrl} alt={e.handle} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-neutral-700 flex items-center justify-center text-neutral-400 text-xs">
                          {e.handle.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </a>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-700">
                      {e.avatarUrl ? (
                        <img src={e.avatarUrl} alt={e.handle} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-neutral-700 flex items-center justify-center text-neutral-400 text-xs">
                          {e.handle.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-white">
                      <span className="truncate text-sm font-semibold">{e.handle}</span>
                      {e.traderUrl && (
                        <a href={e.traderUrl} className="text-sky-400 hover:text-sky-300 transition-colors shrink-0" target="_blank" rel="noreferrer" aria-label="Open trader page">
                          <FiArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {e.xUrl && (
                        <a href={e.xUrl} className="opacity-70 hover:opacity-100 transition-opacity shrink-0" target="_blank" rel="noreferrer" aria-label="Open on X">
                          <Image src="/x.png" alt="X" width={12} height={12} />
                        </a>
                      )}
                    </div>
                    {!showActions && e.walletAddress && (
                      <p className="text-xs text-neutral-400 truncate font-mono">
                        {e.walletAddress.substring(0, 4)}...{e.walletAddress.substring(e.walletAddress.length - 4)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Token Price */}
                <div className="justify-self-end">
                  <span className="text-sm text-white font-medium">
                    {e.tokenPrice ? `$${e.tokenPrice}` : "—"}
                  </span>
                </div>

                {/* 24h Price Change */}
                <div className={`justify-self-end text-sm font-medium ${isPricePositive ? "text-emerald-400" : "text-rose-400"}`}>
                  {e.priceChange24h || "—"}
                </div>

                {/* PnL */}
                <div className={`whitespace-nowrap justify-self-end text-sm font-semibold ${isPnlPositive ? "text-emerald-400" : "text-rose-400"}`}>
                  {pnlText}
                </div>

                {/* Win Rate or Actions */}
                <div className="justify-self-end">
                  {showActions ? (
                    <div className="flex gap-2">
                      <Link href={`/traders/${e.handle.toLowerCase()}`}>
                        <Button
                          size="sm"
                          className="cursor-pointer h-7 px-3 text-xs bg-black hover:bg-neutral-900 text-white rounded-full"
                        >
                          Buy
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer h-7 px-3 text-xs bg-transparent border-neutral-600 hover:bg-neutral-800 text-neutral-300 rounded-full"
                      >
                        Sell
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-white font-medium">
                      {e.winRate || "—"}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {entries.length === 0 && !loading && (
          <div className="rounded-lg bg-neutral-800/50 p-4 text-center text-sm text-neutral-400">
            No entries yet
          </div>
        )}
      </div>
    </section>
  );
}