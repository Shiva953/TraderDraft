"use client"

import { useEffect, useMemo, useState } from "react"
import BuyPackModal from './BuyPackModal';

interface CompetitionBannerProps {
  prizeSol?: number
  onHowToPlay?: () => void
  onViewLeaderboard?: () => void
  onSkipToReveal?: () => void
}

function getNextWeekEnd(): number {
  const now = new Date()
  // Set target to upcoming Sunday 23:59:59 UTC
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59))
  // getUTCDay: 0 (Sunday) ... 6 (Saturday). We want Sunday.
  const daysUntilSunday = (7 - now.getUTCDay()) % 7
  target.setUTCDate(now.getUTCDate() + daysUntilSunday)
  return target.getTime()
}

function formatDuration(msRemaining: number) {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000))
  const days = Math.floor(totalSeconds / (24 * 3600))
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds }
}

export function PackSaleBannerNew({ prizeSol = 26, onHowToPlay, onViewLeaderboard, onSkipToReveal }: CompetitionBannerProps) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  const targetMs = useMemo(() => getNextWeekEnd(), [])

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const remainingMs = Math.max(0, targetMs - nowMs)
  const { days, hours, minutes, seconds } = formatDuration(remainingMs)
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-8">
        {/* Background stars effect */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-4 left-8 w-1 h-1 bg-white rounded-full animate-pulse"></div>
          <div className="absolute top-12 right-16 w-1 h-1 bg-white rounded-full animate-pulse delay-300"></div>
          <div className="absolute bottom-8 left-16 w-1 h-1 bg-white rounded-full animate-pulse delay-700"></div>
          <div className="absolute bottom-16 right-8 w-1 h-1 bg-white rounded-full animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 text-center">
          {/* Pack images */}
          <div className="flex justify-center items-end mb-8 space-x-4">
            <div className="w-16 h-20 bg-gradient-to-b from-gray-300 to-gray-500 rounded-lg flex items-center justify-center">
              <div className="text-white font-bold text-xs">F3</div>
            </div>
            <div className="w-20 h-24 bg-gradient-to-b from-gray-300 to-gray-600 rounded-lg flex items-center justify-center">
              <div className="text-white font-bold text-sm">F3</div>
            </div>
            <div className="w-16 h-20 bg-gradient-to-b from-gray-300 to-gray-500 rounded-lg flex items-center justify-center">
              <div className="text-white font-bold text-xs">F3</div>
            </div>
          </div>

          {/* Main title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-wide">KOL PACKS</h1>
          <p className="text-xl md:text-2xl text-blue-200 font-light mb-8 tracking-wider">AVAILABLE NOW</p>

          {/* Buy now and Skip to Packs Reveal buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-gray-800 cursor-pointer px-8 py-3 rounded-full font-medium text-lg hover:bg-gray-100 transition-colors"
            >
              Buy Now
            </button>
            
            {onSkipToReveal && (
              <button
                onClick={onSkipToReveal}
                className="bg-transparent border-2 border-white text-white cursor-pointer px-8 py-3 rounded-full font-medium text-lg hover:bg-white hover:text-gray-800 transition-colors"
              >
                Skip to Packs Reveal
              </button>
            )}
          </div>

          {/* Countdown timer */}
          <div className="flex justify-center items-center space-x-2 text-white text-2xl md:text-3xl font-mono">
            <span className="bg-black/20 px-3 py-2 rounded">{days}</span>
            <span>:</span>
            <span className="bg-black/20 px-3 py-2 rounded">{hours.toString().padStart(2, "0")}</span>
            <span>:</span>
            <span className="bg-black/20 px-3 py-2 rounded">{minutes.toString().padStart(2, "0")}</span>
            <span>:</span>
            <span className="bg-black/20 px-3 py-2 rounded">{seconds.toString().padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </div>
    <BuyPackModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  )
}

export default PackSaleBannerNew
