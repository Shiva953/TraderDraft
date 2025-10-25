import React, { useState, useMemo } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";
import type { LeaderboardEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Helper function to format market cap with K, M, B abbreviations
function formatMarketCap(marketCap: number | undefined): string {
  if (!marketCap || marketCap === 0) return "—";
  
  if (marketCap >= 1_000_000_000) {
    return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
  } else if (marketCap >= 1_000_000) {
    return `$${(marketCap / 1_000_000).toFixed(2)}M`;
  } else if (marketCap >= 1_000) {
    return `$${(marketCap / 1_000).toFixed(2)}K`;
  }
  return `$${marketCap.toFixed(2)}`;
}

interface LeaderboardProps {
  title?: string;
  entries: LeaderboardEntry[];
  loading?: boolean;
  showActions?: boolean; // Flag to show Buy/Sell buttons during competition
}

const ITEMS_PER_PAGE = 10;

export function Leaderboard({
  title = "Top Traders",
  entries = [],
  loading = false,
  showActions = false
}: LeaderboardProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination
  const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentEntries = useMemo(() => entries.slice(startIndex, endIndex), [entries, startIndex, endIndex]);

  // Reset to page 1 when entries change (e.g., period change)
  React.useEffect(() => {
    setCurrentPage(1);
  }, [entries.length]);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-neutral-200">
      {/* Header */}
      <h2 className="mb-3 text-center text-sm tracking-tight text-neutral-400">{title}</h2>

      {/* Header labels */}
      <div className={`grid items-center gap-3 px-3 pb-2 text-xs tracking-tight text-neutral-400 ${
        showActions
          ? 'grid-cols-[1fr_90px_90px_100px_150px]'
          : 'grid-cols-[1fr_120px_100px_120px_100px]'
      }`}>
        <div>Trader</div>
        <div className="justify-self-end">Mkt. Cap</div>
        <div className="justify-self-end">24h</div>
        <div className="justify-self-end">Avg. Daily PnL</div>
        <div className="justify-self-end">{showActions ? 'Actions' : 'Win Rate'}</div>
      </div>

      <div className="divide-y divide-neutral-800/50">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`skeleton-${i}`} className={`grid items-center gap-3 px-3 py-3 ${
              showActions
                ? 'grid-cols-[1fr_90px_90px_100px_150px]'
                : 'grid-cols-[1fr_120px_100px_120px_100px]'
            }`}>
              {/* Rank + Trader skeleton */}
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Skeleton className="h-4 w-4 bg-neutral-700" />
                  <Skeleton className="h-4 w-6 bg-neutral-700" />
                </div>
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
                  </div>
                ) : (
                  <Skeleton className="h-5 w-16 bg-neutral-700" />
                )}
              </div>
            </div>
          ))
        ) : currentEntries.length > 0 ? (
          currentEntries.map((e) => {
            // Determine if Avg. Daily PnL is positive or negative for coloring
            const pnlText = e.avgDailyPnl || "—";
            const isPnlPositive = pnlText.includes('+') || (!pnlText.includes('-') && !pnlText.includes('—') && pnlText !== '0');

            // Determine price change color and format to 2 decimals
            const priceChangePercent = e.priceChange24hPercent || 0;
            const isPricePositive = priceChangePercent >= 0;
            const formattedPriceChange = e.priceChange24hPercent !== undefined && e.priceChange24hPercent !== null
              ? `${isPricePositive ? '+' : ''}${priceChangePercent.toFixed(2)}%`
              : "—";

            return (
              <div 
                key={`${e.rank}-${e.handle}-${e.walletAddress}`} 
                onClick={() => window.location.href = `/kols/${e.ticker || e.handle.toLowerCase()}`}
                className={`grid items-center gap-3 px-3 py-3 cursor-pointer transition-colors hover:bg-neutral-800/30 ${
                  showActions
                    ? 'grid-cols-[1fr_90px_90px_100px_150px]'
                    : 'grid-cols-[1fr_120px_100px_120px_100px]'
                }`}>
                {/* Rank + Trader */}
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <FaStar className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-bold text-neutral-300">{e.rank}</span>
                  </div>

                  {e.traderUrl ? (
                    <a 
                      href={e.traderUrl} 
                      onClick={(event) => event.stopPropagation()}
                      target="_blank" 
                      rel="noreferrer" 
                      aria-label={`${e.handle} profile`} 
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden bg-neutral-700 cursor-pointer hover:ring-2 hover:ring-white/20 transition-all"
                    >
                      {e.avatarUrl ? (
                        <Image src={e.avatarUrl} alt={e.handle} width={40} height={40} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-neutral-700 flex items-center justify-center text-neutral-400 text-xs">
                          {e.handle.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </a>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden bg-neutral-700">
                      {e.avatarUrl ? (
                        <Image src={e.avatarUrl} alt={e.handle} width={40} height={40} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-neutral-700 flex items-center justify-center text-neutral-400 text-xs">
                          {e.handle.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-white">
                      <span className="truncate text-base font-semibold font-mono">{e.handle}</span>
                      {e.traderUrl && (
                        <a 
                          href={e.traderUrl} 
                          onClick={(event) => event.stopPropagation()}
                          className="text-sky-400 hover:text-sky-300 transition-colors shrink-0" 
                          target="_blank" 
                          rel="noreferrer" 
                          aria-label="Open trader page"
                        >
                          <FiArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {e.xUrl && (
                        <a 
                          href={e.xUrl} 
                          onClick={(event) => event.stopPropagation()}
                          className="opacity-70 hover:opacity-100 transition-opacity shrink-0" 
                          target="_blank" 
                          rel="noreferrer" 
                          aria-label="Open on X"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
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

                {/* Market Cap */}
                <div className="justify-self-end">
                  <span className="text-sm text-white font-medium">
                    {formatMarketCap(e.marketCap)}
                  </span>
                </div>

                {/* 24h Price Change */}
                <div className={`justify-self-end text-sm font-medium ${isPricePositive ? "text-emerald-400" : "text-rose-400"}`}>
                  {formattedPriceChange}
                </div>

                {/* PnL */}
                <div className={`whitespace-nowrap justify-self-end text-sm font-semibold ${isPnlPositive ? "text-emerald-400" : "text-rose-400"}`}>
                  {pnlText}
                </div>

                {/* Win Rate or Actions */}
                <div className="justify-self-end">
                  {showActions ? (
                    <Button
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        window.location.href = `/kols/${e.ticker || e.handle.toLowerCase()}`;
                      }}
                      className="cursor-pointer bg-[#f78bb4] h-8 px-3 text-xs hover:bg-neutral-900 text-white rounded-full"
                    >
                      Trade
                    </Button>
                  ) : (
                    <span className="text-sm text-white font-medium">
                      {e.winRate || "—"}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-sm text-neutral-400">
            No entries yet
          </div>
        )}
      </div>

      {/* Pagination Controls - Only show if we have entries and more than one page */}
      {!loading && entries.length > ITEMS_PER_PAGE && (
        <div className="mt-4 flex items-center justify-between border-t border-neutral-800/50 pt-4">
          <div className="text-xs text-neutral-500">
            Showing {startIndex + 1}-{Math.min(endIndex, entries.length)} of {entries.length} traders
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {getPageNumbers().map((pageNum, idx) => (
                <PaginationItem key={`page-${pageNum}-${idx}`}>
                  {pageNum === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </section>
  );
}