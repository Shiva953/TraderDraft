'use client'

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HowToPlayModal } from './HowToPlayModal';
import { DailyScoresModal } from './DailyScoresModal';
import { Clock, Trophy } from 'lucide-react';

interface CompetitionBannerProps {
  endTime: Date;
  competitionId?: string;
}

export function CompetitionBanner({ endTime, competitionId }: CompetitionBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0 });
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showDailyScores, setShowDailyScores] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining({ days, hours, minutes });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <>
      <Card className="relative overflow-hidden border-neutral-800 bg-neutral-900/40 backdrop-blur-sm">
        <div className="flex flex-col gap-6 p-8 md:p-12">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-400 px-3 py-1">
              <div className="mr-2 h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              LIVE NOW
            </Badge>
          </div>

          {/* Main Content */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  Bi-Weekly Competition
                </h2>
              </div>
              <p className="text-md text-neutral-400 max-w-2xl leading-relaxed">
                Trade KOL tokens to build the best portfolio. Daily scores are calculated based on your holdings' performance.
                Top traders win Tournament Points at the end of the competition window.
              </p>
            </div>

            {/* Timer Section */}
            <div className="flex flex-col items-center md:items-end gap-4">
              <div className="flex items-center gap-2 text-neutral-400">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">Ends In</span>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col items-center bg-neutral-800/50 rounded-lg px-4 py-3 min-w-[70px]">
                  <div className="text-3xl font-bold text-white">{timeRemaining.days}</div>
                  <div className="text-xs text-neutral-500 uppercase">Days</div>
                </div>
                <div className="flex flex-col items-center bg-neutral-800/50 rounded-lg px-4 py-3 min-w-[70px]">
                  <div className="text-3xl font-bold text-white">{timeRemaining.hours}</div>
                  <div className="text-xs text-neutral-500 uppercase">Hours</div>
                </div>
                <div className="flex flex-col items-center bg-neutral-800/50 rounded-lg px-4 py-3 min-w-[70px]">
                  <div className="text-3xl font-bold text-white">{timeRemaining.minutes}</div>
                  <div className="text-xs text-neutral-500 uppercase">Min</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowHowToPlay(true)}
              size="lg"
              className="bg-white text-black hover:bg-neutral-200 font-semibold cursor-pointer"
            >
              How To Play
            </Button>
            <Button
              onClick={() => setShowDailyScores(true)}
              size="lg"
              variant="outline"
              className="border-neutral-700 hover:bg-neutral-800 font-semibold cursor-pointer"
            >
              View Live Scores
            </Button>
          </div>
        </div>

        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none"></div>
      </Card>

      <HowToPlayModal open={showHowToPlay} onOpenChange={setShowHowToPlay} />
      <DailyScoresModal
        open={showDailyScores}
        onOpenChange={setShowDailyScores}
        competitionId={competitionId}
      />
    </>
  );
}
