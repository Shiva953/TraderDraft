'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

interface HowToPlayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowToPlayModal({ open, onOpenChange }: HowToPlayModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 text-white max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light tracking-tight text-white">
            how to play
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4 -mr-2">
          <div className="space-y-8 text-sm">
          <section>
            <h3 className="text-base font-medium text-gray-200 mb-3">competition overview</h3>
            <p className="text-gray-300 leading-relaxed font-light">
              Compete against other traders by building the best portfolio of KOL (key opinion leader) tokens.
              The competition runs for 2 weeks, with daily score updates based on your KOL holdings' performance.
            </p>
          </section>

          <section>
            <h3 className="text-base font-medium text-gray-200 mb-3">how to participate</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-300 font-light">
              <li>buy packs to collect KOL tokens</li>
              <li>reveal your packs to see which KOL tokens you've received</li>
              <li>buy or sell KOL tokens during the competition window</li>
              <li>your portfolio is scored daily based on KOL performance</li>
              <li>top performers win tournament points at the end</li>
            </ol>
          </section>

          <section>
            <h3 className="text-base font-medium text-gray-200 mb-3">scoring system</h3>
            <div className="space-y-4 text-gray-300 font-light">
              <div>
                <h4 className="font-medium text-white mb-2">daily window score</h4>
                <p className="mb-2">each day, your KOL holdings are scored based on:</p>
                <ul className="list-disc list-inside ml-4 space-y-1.5">
                  <li>PnL performance of each KOL trader</li>
                  <li>rarity multipliers (legendary &gt; epic &gt; rare &gt; common)</li>
                  <li>number of tokens held</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">tournament points</h4>
                <p>
                  at the end of the competition, your accumulated daily scores determine your tournament points.
                  points are distributed from a prize pool based on final leaderboard rankings.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-base font-medium text-gray-200 mb-3">rarity tiers</h3>
            <div className="grid grid-cols-2 gap-3 text-gray-300">
              <Card className="bg-gray-800/50 p-4 border-yellow-500/30 rounded-lg">
                <div className="font-medium text-yellow-400">legendary</div>
                <div className="text-xs mt-1 text-gray-400">rank 1-3 · highest multiplier</div>
              </Card>
              <Card className="bg-gray-800/50 p-4 border-purple-500/30 rounded-lg">
                <div className="font-medium text-purple-400">epic</div>
                <div className="text-xs mt-1 text-gray-400">rank 4-10 · high multiplier</div>
              </Card>
              <Card className="bg-gray-800/50 p-4 border-blue-500/30 rounded-lg">
                <div className="font-medium text-blue-400">rare</div>
                <div className="text-xs mt-1 text-gray-400">rank 11-25 · medium multiplier</div>
              </Card>
              <Card className="bg-gray-800/50 p-4 border-gray-500/30 rounded-lg">
                <div className="font-medium text-gray-400">common</div>
                <div className="text-xs mt-1 text-gray-500">rank 26-50 · base multiplier</div>
              </Card>
            </div>
          </section>

          <section>
            <h3 className="text-base font-medium text-gray-200 mb-3">strategy tips</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 font-light">
              <li>higher rarity KOLs give better scores but are harder to obtain</li>
              <li>monitor daily leaderboard to track KOL performance</li>
              <li>buy KOLs that are trending upward in PnL</li>
              <li>diversify your portfolio to reduce risk</li>
              <li>check live scores daily to see your ranking</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-medium text-gray-200 mb-3">important rules</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 font-light">
              <li>you must hold KOL tokens to participate</li>
              <li>scores are calculated at the end of each day</li>
              <li>trading is allowed throughout the competition</li>
              <li>final standings determine tournament point distribution</li>
              <li>competition ends automatically after 2 weeks</li>
            </ul>
          </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
