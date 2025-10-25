"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import BuyPackModal from "@/components/packSale/BuyPackModal"

interface PackSalePhaseBannerProps {
  endsAt?: string;
  timeRemaining?: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
}

interface KOLImageData {
  id: string;
  name: string;
  avatarUrl: string;
  ticker: string;
}

/**
 * Pack Sale Phase Banner
 * Shown during PACK_SALE phase (Day 0-7)
 * Displays countdown and "Buy Packs" button
 */
export function PackSalePhaseBanner({ endsAt, timeRemaining }: PackSalePhaseBannerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kolImages, setKolImages] = useState<KOLImageData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch random KOL images for background
  useEffect(() => {
    const fetchKOLImages = async () => {
      try {
        const response = await fetch('/api/kol/random-images?count=4');
        const data = await response.json();
        if (data.success) {
          setKolImages(data.data);
        }
      } catch (error) {
        console.error('Error fetching KOL images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKOLImages();
  }, []);

  return (
    <>
      <Card className="relative w-full border-blue-800/50 bg-black p-8 overflow-hidden">
        {/* Blended KOL Background Images */}
        {!loading && kolImages.length > 0 && (
          <div className="absolute inset-0">
            {kolImages.map((kol, index) => (
              <div
                key={kol.id}
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${kol.avatarUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(8px)',
                  opacity: 0.15,
                  mixBlendMode: index % 2 === 0 ? 'screen' : 'overlay',
                  transform: `scale(1.${index + 1})`,
                }}
              />
            ))}
          </div>
        )}
        
        {/* Black-transparent gradient overlay with blur */}
        <div 
          className="absolute inset-0 backdrop-blur-sm"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.7) 100%)',
          }}
        />

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
              <div className="text-white font-bold text-xs">KOL</div>
            </div>
            <div className="w-20 h-24 bg-gradient-to-b from-gray-300 to-gray-600 rounded-lg flex items-center justify-center">
              <div className="text-white font-bold text-sm">KOL</div>
            </div>
            <div className="w-16 h-20 bg-gradient-to-b from-gray-300 to-gray-500 rounded-lg flex items-center justify-center">
              <div className="text-white font-bold text-xs">KOL</div>
            </div>
          </div>

          {/* Main title */}
          <h1 className="text-6xl md:text-5xl font-extrabold tracking-tight text-white mb-2">
            Pack Sale is Live
          </h1>
          <p className="text-md md:text-xl text-blue-200 font-light mb-8">
            4 Unique KOLs/Pack. Keep buying to get more allocation!
          </p>

          {/* Countdown timer */}
          {timeRemaining && (
            <div className="flex justify-center items-center space-x-2 text-white text-2xl md:text-3xl font-mono mb-8">
              <div className="flex flex-col items-center">
                <span className="bg-black/20 px-3 py-2 rounded">{timeRemaining.days}</span>
                <span className="text-xs text-blue-300 mt-1">Days</span>
              </div>
              <span>:</span>
              <div className="flex flex-col items-center">
                <span className="bg-black/20 px-3 py-2 rounded">{timeRemaining.hours.toString().padStart(2, "0")}</span>
                <span className="text-xs text-blue-300 mt-1">Hours</span>
              </div>
              <span>:</span>
              <div className="flex flex-col items-center">
                <span className="bg-black/20 px-3 py-2 rounded">{timeRemaining.minutes.toString().padStart(2, "0")}</span>
                <span className="text-xs text-blue-300 mt-1">Mins</span>
              </div>
              <span>:</span>
              <div className="flex flex-col items-center">
                <span className="bg-black/20 px-3 py-2 rounded">{timeRemaining.seconds.toString().padStart(2, "0")}</span>
                <span className="text-xs text-blue-300 mt-1">Secs</span>
              </div>
            </div>
          )}

          {/* Buy now button */}
          <Button
            onClick={() => setIsModalOpen(true)}
            size="lg"
            className="bg-white text-gray-800 hover:bg-gray-100 rounded-full font-medium cursor-pointer px-8 py-6 text-lg"
          >
            Buy Packs Now
          </Button>

          {/* Info text */}
          <p className="text-sm text-blue-300 mt-6">
            Each pack contains 4 random KOL tokens • 0.10 SOL per pack
          </p>
        </div>
      </Card>

      {/* Buy Pack Modal */}
      <BuyPackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}