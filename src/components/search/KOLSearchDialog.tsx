'use client'

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

interface KOLResult {
  ticker: string;
  name: string;
  rank: number;
  avatarUrl?: string;
  tokenPrice?: string;
  priceChange24hPercent?: number;
  pnl?: string;
  winRate?: string;
}

interface KOLSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KOLSearchDialog({ open, onOpenChange }: KOLSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<KOLResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [allKOLs, setAllKOLs] = useState<KOLResult[]>([]);
  const router = useRouter();

  // Fetch all KOLs when dialog opens
  useEffect(() => {
    if (open && allKOLs.length === 0) {
      fetchAllKOLs();
    }
  }, [open]);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }

      // Close on Escape
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setResults([]);
    }
  }, [open]);

  const fetchAllKOLs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/getTopTraders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: 'daily',
          limit: 50,
          fetchAll: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        const traders = data.selected?.traders || [];

        const formattedKOLs = traders.map((trader: any) => ({
          ticker: trader.ticker || trader.name,
          name: trader.name,
          rank: trader.rank,
          avatarUrl: trader.avatarUrl,
          tokenPrice: trader.tokenPrice,
          priceChange24hPercent: typeof trader.priceChange24hPercent === 'number' ? trader.priceChange24hPercent : undefined,
          pnl: trader.avgDailyPnl,
          winRate: trader.winRate
        }));

        setAllKOLs(formattedKOLs);
        setResults(formattedKOLs.slice(0, 10)); // Show top 10 by default
      }
    } catch (error) {
      console.error('Error fetching KOLs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter results based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults(allKOLs.slice(0, 10));
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allKOLs.filter(kol =>
      kol.name.toLowerCase().includes(query) ||
      kol.ticker.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 results

    setResults(filtered);
  }, [searchQuery, allKOLs]);

  const handleSelectKOL = (kol: KOLResult) => {
    onOpenChange(false);
    router.push(`/kols/${kol.ticker.toLowerCase()}`);
  };

  const formatPrice = (price?: string) => {
    if (!price) return '—';
    const num = parseFloat(price);
    if (num >= 1) return `$${num.toFixed(2)}`;
    return `$${num.toFixed(4)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-neutral-900 border-neutral-800 p-0 gap-0">
        {/* Search Input */}
        <div className="px-6 pt-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              placeholder="Search by name or ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-12 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-neutral-600"
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full bg-neutral-800" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 bg-neutral-800" />
                    <Skeleton className="h-3 w-24 bg-neutral-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((kol) => {
                const isPricePositive = (kol.priceChange24hPercent || 0) >= 0;

                return (
                  <button
                    key={kol.ticker}
                    onClick={() => handleSelectKOL(kol)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800/50 transition-colors text-left group cursor-pointer"
                  >
                    {/* Avatar */}
                    <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden bg-neutral-700">
                      {kol.avatarUrl ? (
                        <Image
                          src={kol.avatarUrl}
                          alt={kol.name}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-neutral-400 text-xs">
                          {kol.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{kol.name}</span>
                        <span className="text-xs text-neutral-500">#{kol.rank}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <span className="font-mono">{kol.ticker}</span>
                        {kol.pnl && (
                          <>
                            <span>•</span>
                            <span>{kol.pnl}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Price & Change */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-medium text-white">
                        {formatPrice(kol.tokenPrice)}
                      </div>
                      {kol.priceChange24hPercent !== undefined && kol.priceChange24hPercent !== null && (
                        <div className={`flex items-center justify-end gap-1 text-xs ${isPricePositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPricePositive ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>{isPricePositive ? '+' : ''}{kol.priceChange24hPercent.toFixed(2)}%</span>
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="h-4 w-4 text-neutral-600 group-hover:text-neutral-400 transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-neutral-500">
              {searchQuery ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-4 text-neutral-700" />
                  <p className="text-sm">No KOLs found matching "{searchQuery}"</p>
                </>
              ) : (
                <>
                  <Search className="h-12 w-12 mx-auto mb-4 text-neutral-700" />
                  <p className="text-sm">Start typing to search for KOLs</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-900/50">
          <p className="text-xs text-neutral-500 text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 font-mono">ESC</kbd> to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
