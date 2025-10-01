'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';

interface HowToPlayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowToPlayModal({ open, onOpenChange }: HowToPlayModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-neutral-900 border-neutral-800 text-neutral-100 max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            How to Play - Bi-Weekly Competition
          </DialogTitle>
        </DialogHeader>

        <Separator className="bg-neutral-800" />

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
          {/* Competition Overview */}
          <section>
            <h3 className="text-lg font-semibold text-pink-400 mb-2">Competition Overview</h3>
            <p className="text-neutral-300 leading-relaxed">
              Compete against other traders by building the best portfolio of KOL (Key Opinion Leader) tokens.
              The competition runs for 2 weeks, with daily score updates based on your KOL holdings' performance.
            </p>
          </section>

          {/* How to Participate */}
          <section>
            <h3 className="text-lg font-semibold text-pink-400 mb-2">How to Participate</h3>
            <ol className="list-decimal list-inside space-y-2 text-neutral-300">
              <li>Buy packs to collect KOL tokens</li>
              <li>Reveal your packs to see which KOL tokens you've received</li>
              <li>Buy or sell KOL tokens during the competition window</li>
              <li>Your portfolio is scored daily based on KOL performance</li>
              <li>Top performers win Tournament Points (TP) at the end</li>
            </ol>
          </section>

          {/* Scoring System */}
          <section>
            <h3 className="text-lg font-semibold text-pink-400 mb-2">Scoring System</h3>
            <div className="space-y-3 text-neutral-300">
              <div>
                <h4 className="font-semibold text-white mb-1">Daily Window Score</h4>
                <p>Each day, your KOL holdings are scored based on:</p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>PnL performance of each KOL trader</li>
                  <li>Rarity multipliers (Legendary &gt; Epic &gt; Rare &gt; Common)</li>
                  <li>Number of tokens held</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Tournament Points (TP)</h4>
                <p>
                  At the end of the competition, your accumulated daily scores determine your Tournament Points.
                  TP is distributed from a prize pool based on final leaderboard rankings.
                </p>
              </div>
            </div>
          </section>

          {/* Rarity System */}
          <section>
            <h3 className="text-lg font-semibold text-pink-400 mb-2">Rarity Tiers</h3>
            <div className="grid grid-cols-2 gap-3 text-neutral-300">
              <Card className="bg-neutral-800/50 p-3 border-yellow-500/30">
                <div className="font-semibold text-yellow-400">🏆 LEGENDARY</div>
                <div className="text-xs mt-1">Rank 1-3 • Highest multiplier</div>
              </Card>
              <Card className="bg-neutral-800/50 p-3 border-purple-500/30">
                <div className="font-semibold text-purple-400">💎 EPIC</div>
                <div className="text-xs mt-1">Rank 4-10 • High multiplier</div>
              </Card>
              <Card className="bg-neutral-800/50 p-3 border-blue-500/30">
                <div className="font-semibold text-blue-400">⭐ RARE</div>
                <div className="text-xs mt-1">Rank 11-25 • Medium multiplier</div>
              </Card>
              <Card className="bg-neutral-800/50 p-3 border-gray-500/30">
                <div className="font-semibold text-gray-400">◆ COMMON</div>
                <div className="text-xs mt-1">Rank 26-50 • Base multiplier</div>
              </Card>
            </div>
          </section>

          {/* Trading Tips */}
          <section>
            <h3 className="text-lg font-semibold text-pink-400 mb-2">Strategy Tips</h3>
            <ul className="list-disc list-inside space-y-2 text-neutral-300">
              <li>Higher rarity KOLs give better scores but are harder to obtain</li>
              <li>Monitor daily leaderboard to track KOL performance</li>
              <li>Buy KOLs that are trending upward in PnL</li>
              <li>Diversify your portfolio to reduce risk</li>
              <li>Check "View Live Scores" daily to see your ranking</li>
            </ul>
          </section>

          {/* Rules */}
          <section>
            <h3 className="text-lg font-semibold text-pink-400 mb-2">Important Rules</h3>
            <ul className="list-disc list-inside space-y-2 text-neutral-300">
              <li>You must hold KOL tokens to participate</li>
              <li>Scores are calculated at the end of each day</li>
              <li>Trading is allowed throughout the competition</li>
              <li>Final standings determine TP distribution</li>
              <li>Competition ends automatically after 2 weeks</li>
            </ul>
          </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
