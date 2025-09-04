import { useEffect, useMemo, useState } from "react";

interface CompetitionBannerProps {
  prizeSol?: number;
  onHowToPlay?: () => void;
  onViewLeaderboard?: () => void;
}

function getNextWeekEnd(): number {
  const now = new Date();
  // Set target to upcoming Sunday 23:59:59 UTC
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
  // getUTCDay: 0 (Sunday) ... 6 (Saturday). We want Sunday.
  const daysUntilSunday = (7 - now.getUTCDay()) % 7;
  target.setUTCDate(now.getUTCDate() + daysUntilSunday);
  return target.getTime();
}

function formatDuration(msRemaining: number) {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { hours, minutes };
}

export function CompetitionBanner({ prizeSol = 26, onHowToPlay, onViewLeaderboard }: CompetitionBannerProps) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const targetMs = useMemo(() => getNextWeekEnd(), []);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000 * 30); // update every 30s; good enough for banner
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, targetMs - nowMs);
  const { hours, minutes } = formatDuration(remainingMs);

  return (
    <section className="rounded-2xl border border-rose-400/50 bg-neutral-950/60 p-6 text-center">
      <div className="text-2xl md:text-3xl tracking-wide text-neutral-200">WEEKLY COMPETITION</div>

      <div className="mt-6 grid grid-cols-1 items-end gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <div className="text-5xl md:text-6xl font-bold text-pink-300">{prizeSol} SOL</div>
          <div className="text-neutral-400">In Prizes</div>
        </div>

        <div className="space-y-2">
          <div className="text-5xl md:text-6xl font-bold text-pink-300">
            {hours}h {minutes.toString().padStart(2, "0")}m
          </div>
          <div className="text-neutral-400">left</div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-4 md:flex-row">
        <button
          onClick={onHowToPlay}
          className="w-full md:w-auto rounded-xl bg-neutral-300 px-6 py-3 font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-200 cursor-pointer"
        >
          How to Play
        </button>
        <button
          onClick={onViewLeaderboard}
          className="w-full md:w-auto rounded-xl bg-pink-400 px-6 py-3 font-semibold text-neutral-900 shadow-sm transition hover:bg-pink-300 cursor-pointer"
        >
          View Leaderboard
        </button>
      </div>
    </section>
  );
}

export default CompetitionBanner; 