import React from "react";
import { FiArrowUpRight } from "react-icons/fi";
import Image from "next/image";

export type LeaderboardEntry = {
  rank: number;
  handle: string;
  avatarUrl?: string;
  xUrl?: string; 
  traderUrl?: string; 
  pnl: string; 
  winRate: string;
  walletAddress?: string;
  tokenPrice?: string;
  priceChange24h?: string;
  priceChange24hPercent?: number;
  poolAddress?: string;
  tokenMintAddress?: string;
};

interface LeaderboardProps {
  title?: string;
  entries: LeaderboardEntry[];
  loading?: boolean;
}

export function Leaderboard({ 
  title = "Top Traders", 
  entries = [],
  loading = false
}: LeaderboardProps) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-neutral-200">
      {/* Header */}
      <h2 className="mb-3 text-center text-sm tracking-widest text-neutral-400">{title.toUpperCase()}</h2>

      {/* Header labels - Updated with new columns */}
      <div className="grid [grid-template-columns:1fr_120px_100px_120px_100px] items-center gap-4 px-3 pb-2 text-xs uppercase tracking-wider text-neutral-400">
        <div>Trader</div>
        <div className="justify-self-end">Token Price</div>
        <div className="justify-self-end">24h Change</div>
        <div className="justify-self-end">PnL</div>
        <div className="justify-self-end">Win Rate</div>
      </div>

      <div className="space-y-3">
        {loading ? (
          // Loading skeletons - Updated for new columns
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="grid [grid-template-columns:1fr_120px_100px_120px_100px] items-center gap-4 rounded-lg bg-neutral-900 px-3 py-3 ring-1 ring-white/10 animate-pulse">
              {/* Rank + Trader skeleton */}
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-8 w-8 rounded-md bg-neutral-700" />
                <div className="h-10 w-10 rounded-md bg-neutral-700" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-32 rounded bg-neutral-700 mb-1" />
                  <div className="h-3 w-20 rounded bg-neutral-700" />
                </div>
              </div>
              {/* Price skeleton */}
              <div className="justify-self-end">
                <div className="h-5 w-20 rounded bg-neutral-700" />
              </div>
              {/* Change skeleton */}
              <div className="justify-self-end">
                <div className="h-5 w-16 rounded bg-neutral-700" />
              </div>
              {/* PnL skeleton */}
              <div className="justify-self-end">
                <div className="h-5 w-24 rounded bg-neutral-700" />
              </div>
              {/* Win Rate skeleton */}
              <div className="justify-self-end">
                <div className="h-5 w-16 rounded bg-neutral-700" />
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
              <div key={`${e.rank}-${e.handle}-${e.walletAddress}`} className="grid [grid-template-columns:1fr_120px_100px_120px_100px] items-center gap-4 rounded-lg bg-neutral-900 px-3 py-3 ring-1 ring-white/10">
                {/* Rank + Trader */}
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-700 text-xs font-bold text-neutral-300">
                    {e.rank}
                  </div>
                  
                  {e.traderUrl ? (
                    <a href={e.traderUrl} target="_blank" rel="noreferrer" aria-label={`${e.handle} profile`} className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-neutral-700 cursor-pointer hover:ring-2 hover:ring-white/20 transition-all">
                      {e.avatarUrl ? (
                        <img src={e.avatarUrl} alt={e.handle} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-neutral-700 flex items-center justify-center text-neutral-400 text-xs">
                          {e.handle.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </a>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-neutral-700">
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
                    <div className="flex items-center gap-2 text-white">
                      <span className="truncate text-sm font-semibold">{e.handle}</span>
                      {e.traderUrl && (
                        <a href={e.traderUrl} className="text-sky-400 hover:text-sky-300 transition-colors" target="_blank" rel="noreferrer" aria-label="Open trader page">
                          <FiArrowUpRight className="h-4 w-4" />
                        </a>
                      )}
                      {e.xUrl && (
                        <a href={e.xUrl} className="opacity-70 hover:opacity-100 transition-opacity" target="_blank" rel="noreferrer" aria-label="Open on X">
                          <Image src="/x.png" alt="X" width={14} height={14} />
                        </a>
                      )}
                    </div>
                    {e.walletAddress && (
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

                {/* Win Rate */}
                <div className="justify-self-end">
                  <span className="text-sm text-white font-medium">
                    {e.winRate || "—"}
                  </span>
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