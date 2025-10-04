'use client'

import { PointsLeaderboard } from '@/components/competition/PointsLeaderboard';

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <PointsLeaderboard />
      </div>
    </main>
  );
}
