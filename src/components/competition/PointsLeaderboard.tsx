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
import { Trophy, Search, ExternalLink } from 'lucide-react';

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
  windowScore: string;
  tournamentPoints: string;
  leaderboardPoints: string;
  userTotalTP: string;
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

export function PointsLeaderboard() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [filteredLeaderboard, setFilteredLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalUsers, setTotalUsers] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch finalized competitions
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const response = await fetch('/api/competitions/finalized');
        const data = await response.json();

        if (data.success && data.competitions.length > 0) {
          setCompetitions(data.competitions);
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
          setLeaderboard(leaderboardData);
          setFilteredLeaderboard(leaderboardData);
          setTotalUsers(leaderboardData.length);
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

  // Filter leaderboard based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLeaderboard(leaderboard);
      return;
    }

    const filtered = leaderboard.filter(entry =>
      entry.userWallet.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredLeaderboard(filtered);
  }, [searchQuery, leaderboard]);

  const selectedCompData = competitions.find(c => c.id === selectedCompetition);

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
        <h1 className="text-4xl font-bold mb-8">Leaderboard</h1>
        <Card className="bg-neutral-900 border-neutral-800 p-12 text-center">
          <p className="text-neutral-400">No finalized competitions yet</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          {/* <Trophy className="h-10 w-10 text-yellow-500" /> */}
          <h1 className="text-4xl font-bold">Leaderboard</h1>
        </div>

        {/* Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-neutral-400">
          <div className="flex items-center gap-6">
            <Badge variant="outline" className="border-neutral-700 bg-neutral-900 text-neutral-300 px-3 py-1">
              Past Contest
            </Badge>
            <span>Total Users: <span className="font-semibold text-white">{totalUsers}</span></span>
            {lastUpdate && (
              <span>Last Update: <span className="font-semibold text-white">{formatLastUpdate(lastUpdate)}</span></span>
            )}
          </div>
          {selectedCompData && (
            <div className="flex items-center gap-4">
              <span>Status: <span className="font-semibold text-white">Completed</span></span>
              <span>Ends: <span className="font-semibold text-white">{formatDate(new Date(selectedCompData.endDate))}</span></span>
            </div>
          )}
        </div>

        {/* Search and Select Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500"
            />
          </div>

          {/* Competition Selector */}
          <div className="md:w-96">
            <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
              <SelectTrigger className="bg-neutral-900 border-neutral-800 text-white">
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
            <div className="p-12">
              <Skeleton className="h-64 w-full bg-neutral-800" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Table Header */}
              <div className="grid grid-cols-[80px_1fr_200px_200px_200px] gap-4 px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 text-sm font-semibold text-amber-500">
                <div>Rank</div>
                <div>User</div>
                <div className="text-center">Total TP</div>
                <div className="text-right">TP Earned</div>
                <div className="text-right">Points</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-neutral-800">
                {filteredLeaderboard.length > 0 ? (
                  filteredLeaderboard.map((entry) => (
                    <div
                      key={entry.userId}
                      className="grid grid-cols-[80px_1fr_200px_200px_200px] gap-4 px-6 py-4 items-center hover:bg-neutral-800/30 transition-colors"
                    >
                      {/* Rank */}
                      <div className="text-2xl font-bold text-white">
                        {entry.rank}
                      </div>

                      {/* User */}
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://solscan.io/account/${entry.userWallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors font-mono"
                        >
                          {formatWalletAddress(entry.userWallet)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      {/* Total TP (All-Time) */}
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-semibold text-yellow-500">
                            {parseFloat(entry.userTotalTP).toFixed(0)}
                          </span>
                        </div>
                      </div>

                      {/* TP Earned */}
                      <div className="text-right font-semibold text-emerald-400">
                        +{parseFloat(entry.tournamentPoints).toFixed(0)}
                      </div>

                      {/* Points (Window Score) */}
                      <div className="text-right font-semibold text-white">
                        {parseFloat(entry.windowScore).toFixed(0)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-neutral-500">
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
