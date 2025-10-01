import { Card } from '@/components/ui/card';

export function CompetitionBannerSkeleton() {
  return (
    <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur-sm animate-pulse">
      <div className="flex flex-col gap-6 p-8 md:p-12">
        {/* Status Badge Skeleton */}
        <div className="h-7 w-24 bg-neutral-800 rounded-full"></div>

        {/* Main Content Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1 space-y-4">
            {/* Title Skeleton */}
            <div className="h-12 bg-neutral-800 rounded-lg max-w-lg"></div>
            {/* Description Skeleton */}
            <div className="space-y-2">
              <div className="h-5 bg-neutral-800 rounded max-w-2xl"></div>
              <div className="h-5 bg-neutral-800 rounded max-w-xl"></div>
            </div>
          </div>

          {/* Timer Skeleton */}
          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="h-5 w-20 bg-neutral-800 rounded"></div>
            <div className="flex gap-3">
              <div className="bg-neutral-800 rounded-lg px-4 py-3 min-w-[70px] h-[72px]"></div>
              <div className="bg-neutral-800 rounded-lg px-4 py-3 min-w-[70px] h-[72px]"></div>
              <div className="bg-neutral-800 rounded-lg px-4 py-3 min-w-[70px] h-[72px]"></div>
            </div>
          </div>
        </div>

        {/* Buttons Skeleton */}
        <div className="flex flex-wrap gap-3">
          <div className="h-11 w-36 bg-neutral-800 rounded-md"></div>
          <div className="h-11 w-40 bg-neutral-800 rounded-md"></div>
        </div>
      </div>
    </Card>
  );
}
