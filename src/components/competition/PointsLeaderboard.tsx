'use client'

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trophy, Search, ExternalLink, HelpCircle } from 'lucide-react';
import { FunkyTooltip } from '@/components/ui/funky-tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { CompetitionResults } from './CompetitionResults';
import { useSolanaWallets } from '@privy-io/react-auth/solana';

interface Competition {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  tpPool: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: number;
  userWallet: string;
  xUsername?: string | null;
  xProfilePictureUrl?: string | null;
  xUrl?: string | null;
  windowScore: string;
  tournamentPoints: string;
  leaderboardPoints: string;
  userTotalTP: string;
}

interface TokenHolding {
  ticker: string;
  name: string;
  balance: string;
  mintAddress: string;
  poolAddress?: string;
  avatarUrl?: string;
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatCompetitionLabel = (startDate: string, endDate: string, index: number) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `GFG ${index + 1} - ${formatDate(start)} - ${formatDate(end)}`;
};

const formatLastUpdate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) + ' at ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const formatWalletAddress = (address: string) => {
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
};

// Generate a consistent gradient based on wallet address
const generateGradient = (address: string) => {
  const hash = address.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const hue1 = Math.abs(hash % 360);
  const hue2 = Math.abs((hash * 2) % 360);
  
  return `linear-gradient(135deg, hsl(${hue1}, 70%, 60%), hsl(${hue2}, 70%, 50%))`;
};

export function PointsLeaderboard() {
  const { wallets } = useSolanaWallets();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [lastFinalizedCompetition, setLastFinalizedCompetition] = useState<Competition | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [filteredLeaderboard, setFilteredLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalUsers, setTotalUsers] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [userHoldings, setUserHoldings] = useState<Map<string, TokenHolding[]>>(new Map());
  const [loadingHoldings, setLoadingHoldings] = useState<Set<string>>(new Set());

  // Fetch finalized competitions
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const response = await fetch('/api/competitions/finalized');
        const data = await response.json();

        if (data.success && data.competitions.length > 0) {
          setCompetitions(data.competitions);
          // Store the most recent (last finalized) competition
          setLastFinalizedCompetition(data.competitions[0]);
          // Select the most recent competition by default
          setSelectedCompetition(data.competitions[0].id);
        }
      } catch (error) {
        console.error('Error fetching competitions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, []);

  // Fetch leaderboard when competition changes
  useEffect(() => {
    if (!selectedCompetition) return;

    const fetchLeaderboard = async () => {
      setLoadingLeaderboard(true);
      try {
        const response = await fetch(`/api/competitions/${selectedCompetition}/finalize`);
        const data = await response.json();

        if (data.success) {
          const leaderboardData = data.results || data.leaderboard || [];
          
          // Sort by tournamentPoints descending at UI level as additional safeguard
          const sortedData = [...leaderboardData].sort((a, b) => {
            const aTP = parseFloat(a.tournamentPoints || '0');
            const bTP = parseFloat(b.tournamentPoints || '0');
            return bTP - aTP; // Highest TP first
          });
          
          // Recalculate ranks based on sorted order
          const rankedData = sortedData.map((entry, index) => ({
            ...entry,
            rank: index + 1
          }));
          
          setLeaderboard(rankedData);
          setFilteredLeaderboard(rankedData);
          setTotalUsers(rankedData.length);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchLeaderboard();
  }, [selectedCompetition]);

  // Filter leaderboard based on search query (wallet address OR X username)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLeaderboard(leaderboard);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = leaderboard.filter(entry => {
      const walletMatch = entry.userWallet.toLowerCase().includes(query);
      const xUsernameMatch = entry.xUsername?.toLowerCase().includes(query);
      return walletMatch || xUsernameMatch;
    });
    setFilteredLeaderboard(filtered);
  }, [searchQuery, leaderboard]);

  // Fetch user holdings on hover
  const fetchUserHoldings = async (userWallet: string) => {
    if (userHoldings.has(userWallet) || loadingHoldings.has(userWallet)) {
      return; // Already fetched or currently fetching
    }

    setLoadingHoldings(prev => new Set(prev).add(userWallet));

    try {
      const response = await fetch('/api/user/getUserKOLTokenHoldings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrivyWalletAddress: userWallet })
      });

      const data = await response.json();

      if (data.success && data.data.holdings) {
        // Sort by balance and take top 8
        const sortedHoldings = data.data.holdings
          .sort((a: TokenHolding, b: TokenHolding) => 
            parseFloat(b.balance) - parseFloat(a.balance)
          )
          .slice(0, 8);

        setUserHoldings(prev => new Map(prev).set(userWallet, sortedHoldings));
      }
    } catch (error) {
      console.error('Error fetching user holdings:', error);
    } finally {
      setLoadingHoldings(prev => {
        const newSet = new Set(prev);
        newSet.delete(userWallet);
        return newSet;
      });
    }
  };

  const selectedCompData = competitions.find(c => c.id === selectedCompetition);
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64 bg-neutral-800" />
        <Skeleton className="h-32 w-full bg-neutral-800" />
        <Skeleton className="h-96 w-full bg-neutral-800" />
      </div>
    );
  }

  if (competitions.length === 0) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-8">Player Leaderboard</h1>
        <Card className="bg-neutral-900 border-neutral-800 p-12 text-center">
          <p className="text-neutral-400">No finalized competitions yet</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Competition Results Banner - Always show last finalized competition */}
        {lastFinalizedCompetition && (
          <div className="mb-8 sm:mb-10 md:mb-12">
            <CompetitionResults
              competitionId={lastFinalizedCompetition.id}
              competitionStartDate={new Date(lastFinalizedCompetition.startDate)}
              competitionEndDate={new Date(lastFinalizedCompetition.endDate)}
            />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3">
          {/* <Trophy className="h-10 w-10 text-yellow-500" /> */}
          <h1 className="text-3xl md:text-4xl font-bold">Player Leaderboard</h1>
        </div>

        {/* Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-neutral-400">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <Badge variant="outline" className="border-neutral-700 bg-neutral-900 text-neutral-300 px-2 sm:px-3 py-1 text-xs">
              Past Contest
            </Badge>
            <span className="text-xs sm:text-sm">Total Users: <span className="font-semibold text-white">{totalUsers}</span></span>
            {lastUpdate && (
              <span className="hidden sm:inline text-xs sm:text-sm">Last Update: <span className="font-semibold text-white">{formatLastUpdate(lastUpdate)}</span></span>
            )}
          </div>
          {selectedCompData && (
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <span>Status: <span className="font-semibold text-white">Completed</span></span>
              <span>Ends: <span className="font-semibold text-white">{formatDate(new Date(selectedCompData.endDate))}</span></span>
            </div>
          )}
        </div>

        {/* Search and Select Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              placeholder="Search by wallet or X username"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm sm:text-md bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* Find Me Button */}
          {embeddedWallet && (
            <Button
              onClick={() => setSearchQuery(embeddedWallet.address)}
              variant="outline"
              className="bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800 hover:border-neutral-600 whitespace-nowrap cursor-pointer text-sm"
            >
              Find Me
            </Button>
          )}

          {/* Competition Selector */}
          <div className="md:w-80">
            <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
              <SelectTrigger className="bg-neutral-900 border-neutral-800 text-white text-sm">
                <SelectValue placeholder="Select Contest" />
              </SelectTrigger>
              <SelectContent>
                {competitions.map((comp, index) => (
                  <SelectItem key={comp.id} value={comp.id}>
                    {formatCompetitionLabel(comp.startDate, comp.endDate, index)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Leaderboard Table */}
        <Card className="bg-neutral-900 border-neutral-800 overflow-hidden">
          {loadingLeaderboard ? (
            <div className="p-8 sm:p-12">
              <Skeleton className="h-64 w-full bg-neutral-800" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Table Header */}
              <div className="grid grid-cols-[60px_1fr_140px_140px] sm:grid-cols-[80px_1fr_160px_160px] gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-800 bg-neutral-900/50 text-xs sm:text-sm font-semibold" style={{ color: '#EBD4AB' }}>
                <div>Rank</div>
                <div>User</div>
                <div className="flex items-center justify-end gap-1">
                  <span className="hidden sm:inline">TP Earned</span>
                  <span className="sm:hidden">TP</span>
                  <FunkyTooltip
                    content={
                      <div className="space-y-2 text-xs">
                        <div className="font-semibold text-white border-b border-neutral-700 pb-2 mb-2">
                          TP Distribution Formula
                        </div>
                        <div className="text-neutral-300 space-y-1.5">
                          <div className="font-mono text-[10px] bg-neutral-800/50 px-2 py-1 rounded">
                            TP = (Your Score / Total Score) × 10,000
                          </div>
                          <div className="text-neutral-400 leading-relaxed">
                            Your TP share is proportional to your Score relative to all participants
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <div className="cursor-help p-1 rounded-full transition-colors" style={{ backgroundColor: 'rgba(235, 212, 171, 0.1)' }}>
                      <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4 transition-colors" style={{ color: '#EBD4AB' }} />
                    </div>
                  </FunkyTooltip>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <span>Score</span>
                  <FunkyTooltip
                    content={
                      <div className="space-y-2 text-xs">
                        <div className="font-semibold text-white border-b border-neutral-700 pb-2 mb-2">
                          Score Calculation
                        </div>
                        <div className="text-neutral-300 space-y-1.5">
                          <div className="font-mono text-[10px] bg-neutral-800/50 px-2 py-1 rounded">
                            Score = Σ Daily Scores
                          </div>
                          <div className="text-neutral-400 leading-relaxed">
                            Sum of all your daily KOL holding scores throughout the competition
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <div className="cursor-help p-1 rounded-full transition-colors" style={{ backgroundColor: 'rgba(235, 212, 171, 0.1)' }}>
                      <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4 transition-colors" style={{ color: '#EBD4AB' }} />
                    </div>
                  </FunkyTooltip>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-neutral-800">
                {filteredLeaderboard.length > 0 ? (
                  filteredLeaderboard.map((entry) => {
                    const holdings = userHoldings.get(entry.userWallet) || [];
                    const isLoadingHoldings = loadingHoldings.has(entry.userWallet);

                    return (
                      <div
                        key={entry.userId}
                        className="grid grid-cols-[60px_1fr_140px_140px] sm:grid-cols-[80px_1fr_160px_160px] gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 items-center hover:bg-neutral-800/30 transition-colors cursor-pointer"
                      >
                        {/* Rank */}
                        <div className="text-xl sm:text-2xl font-bold text-white">
                          {entry.rank}
                        </div>

                        {/* User with Avatar and HoverCard */}
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <HoverCard openDelay={200}>
                            <HoverCardTrigger asChild>
                              <div
                                className="cursor-pointer shrink-0"
                                onMouseEnter={() => fetchUserHoldings(entry.userWallet)}
                                onClick={(e) => {
                                  // If user has X profile, redirect to it
                                  if (entry.xUrl) {
                                    e.stopPropagation();
                                    window.open(entry.xUrl, '_blank', 'noopener,noreferrer');
                                  }
                                }}
                              >
                                <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                                  {entry.xProfilePictureUrl ? (
                                    <img
                                      src={entry.xProfilePictureUrl}
                                      alt={entry.xUsername || 'User avatar'}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <AvatarFallback
                                      className="border-0"
                                      style={{ background: generateGradient(entry.userWallet) }}
                                    />
                                  )}
                                </Avatar>
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent
                              className="w-[300px] sm:w-[450px] bg-[#0A0A0A] border-neutral-700"
                              align="start"
                              sideOffset={8}
                              collisionPadding={{ top: 60, bottom: 20, left: 20, right: 20 }}
                              avoidCollisions={true}
                            >
                              <div>
                                <h4 className="text-sm font-semibold text-neutral-200 mb-3 flex items-center gap-2">
                                  <Avatar className="h-6 w-6 shrink-0">
                                    {entry.xProfilePictureUrl ? (
                                      <img
                                        src={entry.xProfilePictureUrl}
                                        alt={entry.xUsername || 'User avatar'}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <AvatarFallback
                                        className="border-0"
                                        style={{ background: generateGradient(entry.userWallet) }}
                                      />
                                    )}
                                  </Avatar>
                                  Top Holdings
                                </h4>

                                {isLoadingHoldings ? (
                                  <div className="grid grid-cols-1 gap-2">
                                    {[...Array(4)].map((_, i) => (
                                      <Skeleton key={i} className="h-14 bg-neutral-800" />
                                    ))}
                                  </div>
                                ) : holdings.length > 0 ? (
                                  <div className="flex flex-col gap-3 h-[180px] overflow-y-auto overflow-x-hidden">
                                    {holdings.map((holding) => (
                                      <div
                                        key={holding.mintAddress}
                                        className="relative group flex items-center justify-between px-4 py-3 rounded-lg border border-neutral-800 bg-[#0A0A0A] overflow-hidden transition-all duration-200 hover:border-neutral-700 hover:bg-[#0F0F0F] flex-shrink-0 cursor-pointer"
                                      >
                                        {/* Top-left white radial gradient */}
                                        <div
                                          className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-[0.02] pointer-events-none"
                                          style={{
                                            background: 'radial-gradient(circle at top left, white 0%, transparent 70%)',
                                          }}
                                        />

                                        <div className="flex items-center gap-3 relative z-10">
                                          {holding.avatarUrl ? (
                                            <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-800 ring-2 ring-neutral-700/50 shrink-0">
                                              <img
                                                src={holding.avatarUrl}
                                                alt={holding.ticker}
                                                className="h-full w-full object-cover"
                                              />
                                            </div>
                                          ) : (
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-neutral-700/50 shrink-0">
                                              {holding.ticker.substring(0, 2).toUpperCase()}
                                            </div>
                                          )}
                                          <div className="flex flex-col">
                                            <span className="text-white text-sm font-medium">{holding.ticker}</span>
                                            <span className="text-neutral-500 text-xs">
                                              {(parseFloat(holding.balance) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })} {holding.ticker}
                                            </span>
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => {
                                            // Navigate to the KOL page
                                            window.location.href = `/kols/${holding.ticker}`;
                                          }}
                                          className="relative z-10 px-3 py-1.5 text-xs font-medium rounded-md bg-[#F78BB4] hover:bg-[#F9A0C3] text-white transition-all duration-200 cursor-pointer shrink-0"
                                        >
                                          Buy
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-neutral-500 text-sm">
                                    No KOL token holdings found
                                  </div>
                                )}
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                          <div className="flex flex-col min-w-0 flex-1">
                            {entry.xUsername ? (
                              <>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-white font-medium text-sm sm:text-base truncate">@{entry.xUsername}</span>
                                  {entry.xUrl && (
                                    <a
                                      href={entry.xUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sky-400 hover:text-sky-300 transition-colors shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                      </svg>
                                    </a>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-neutral-400 font-mono truncate">
                                    {formatWalletAddress(entry.userWallet)}
                                  </span>
                                  <a
                                    href={`https://solscan.io/account/${entry.userWallet}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white hover:text-blue-400 transition-colors shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-white font-mono text-sm sm:text-base truncate">
                                  {formatWalletAddress(entry.userWallet)}
                                </span>
                                <a
                                  href={`https://solscan.io/account/${entry.userWallet}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-white hover:text-blue-400 transition-colors shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* TP Earned */}
                        <div className="text-right font-semibold text-sm sm:text-base" style={{ color: '#EBD4AB' }}>
                          +{parseFloat(entry.tournamentPoints).toFixed(0)}
                        </div>

                        {/* Score */}
                        <div className="text-right font-semibold text-sm sm:text-base" style={{ color: '#EBD4AB' }}>
                          {parseFloat(entry.windowScore).toFixed(0)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 sm:p-12 text-center text-neutral-500 text-sm">
                    {searchQuery ? 'No users found matching your search' : 'No participants in this competition'}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
    </div>
  );
}
