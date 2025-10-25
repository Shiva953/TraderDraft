"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MultiPackRevealSystem } from "@/components/packs/MultiPackRevealSystem"
import { useSolanaWallets } from "@privy-io/react-auth/solana"

interface PackRevealPhaseBannerProps {
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
 * Pack Reveal Phase Banner
 * Shown during PACK_REVEAL phase (Day 7-10)
 * Displays countdown and "Reveal Packs" button
 * When clicked, opens MultiPackRevealSystem to reveal all user's packs
 */
export function PackRevealPhaseBanner({ endsAt, timeRemaining }: PackRevealPhaseBannerProps) {
  const [showRevealSystem, setShowRevealSystem] = useState(false);
  const [packCount, setPackCount] = useState(0);
  const [kolImages, setKolImages] = useState<KOLImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const { wallets } = useSolanaWallets();

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

  // Fetch user pack holdings
  useEffect(() => {
    const fetchPackHoldings = async () => {
      if (!wallets || wallets.length === 0) return;

      const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
      if (!embeddedWallet) return;

      try {
        const response = await fetch("/api/pack/getUserPacks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userPrivyWalletAddress: embeddedWallet.address }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setPackCount(result.data.packHoldings || 0);
          }
        }
      } catch (error) {
        console.error("Error fetching pack holdings:", error);
      }
    };

    fetchPackHoldings();
  }, [wallets]);

  const handleRevealClick = () => {
    setShowRevealSystem(true);
  };

  const handleCloseReveal = () => {
    setShowRevealSystem(false);
  };

  // Hide TestModeController and lock body scroll when reveal system is open
  useEffect(() => {
    if (showRevealSystem) {
      // Lock body scroll immediately
      document.body.style.overflow = 'hidden';
      
      // Small delay to ensure DOM is ready
      const hideTimer = setTimeout(() => {
        // Hide TestModeController when fullscreen reveal is active
        const bottomRightElements = document.querySelectorAll('.fixed');
        console.log(`[PackReveal] Found ${bottomRightElements.length} fixed elements`);
        
        bottomRightElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const classes = htmlEl.className;
          
          // Check if it has bottom-6, right-6, and z-50 OR if it's the TestMode help modal (z-[60])
          if ((classes.includes('bottom-6') && classes.includes('right-6') && classes.includes('z-50')) ||
              (classes.includes('z-[60]'))) {
            console.log(`[PackReveal] Hiding element:`, classes);
            htmlEl.style.display = 'none';
          }
        });
      }, 50);
      
      return () => clearTimeout(hideTimer);
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';
      
      // Restore TestModeController when reveal system is closed
      const bottomRightElements = document.querySelectorAll('.fixed');
      bottomRightElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const classes = htmlEl.className;
        if ((classes.includes('bottom-6') && classes.includes('right-6') && classes.includes('z-50')) ||
            (classes.includes('z-[60]'))) {
          htmlEl.style.display = '';
        }
      });
    }

    return () => {
      // Restore body scroll and TestModeController on cleanup
      document.body.style.overflow = 'unset';
      const bottomRightElements = document.querySelectorAll('.fixed');
      bottomRightElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const classes = htmlEl.className;
        if ((classes.includes('bottom-6') && classes.includes('right-6') && classes.includes('z-50')) ||
            (classes.includes('z-[60]'))) {
          htmlEl.style.display = '';
        }
      });
    };
  }, [showRevealSystem]);

  if (showRevealSystem) {
    return (
      <div className="fixed inset-0 z-[100] bg-black">
        {/* Close button - HIGHEST z-index to always be visible */}
        <button
          onClick={handleCloseReveal}
          className="fixed top-6 right-6 z-[200] w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/20 hover:border-white/50 transition-all duration-200 flex items-center justify-center text-2xl font-light shadow-xl"
          aria-label="Close reveal modal"
        >
          ✕
        </button>
        
        {/* Reveal system content */}
        <div className="w-full h-full overflow-auto">
          <MultiPackRevealSystem />
        </div>
      </div>
    );
  }

  return (
    <Card className="relative w-full border-purple-800/50 bg-black p-8 overflow-hidden">
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
          <div className="w-16 h-20 bg-gradient-to-b from-purple-300 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/50">
            <div className="text-white font-bold text-xs">KOL</div>
          </div>
          <div className="w-20 h-24 bg-gradient-to-b from-purple-300 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/50">
            <div className="text-white font-bold text-sm">KOL</div>
          </div>
          <div className="w-16 h-20 bg-gradient-to-b from-purple-300 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/50">
            <div className="text-white font-bold text-xs">KOL</div>
          </div>
        </div>

        {/* Main title */}
        <h1 className="text-3xl tracking-tight md:text-6xl font-extrabold text-white mb-2">
           Pack Reveal is Live
        </h1>
        <p className="text-md md:text-xl tracking-tight text-purple-200 font-light mb-8">
          Open your packs and claim unique KOLs!
        </p>

        {/* Countdown timer */}
        {timeRemaining && (
          <div className="flex justify-center items-center space-x-2 text-white text-2xl md:text-3xl font-mono mb-8">
            <div className="flex flex-col items-center">
              <span className="bg-black/20 px-3 py-2 rounded">{timeRemaining.days}</span>
              <span className="text-xs text-purple-300 mt-1">Days</span>
            </div>
            <span>:</span>
            <div className="flex flex-col items-center">
              <span className="bg-black/20 px-3 py-2 rounded">{timeRemaining.hours.toString().padStart(2, "0")}</span>
              <span className="text-xs text-purple-300 mt-1">Hours</span>
            </div>
            <span>:</span>
            <div className="flex flex-col items-center">
              <span className="bg-black/20 px-3 py-2 rounded">{timeRemaining.minutes.toString().padStart(2, "0")}</span>
              <span className="text-xs text-purple-300 mt-1">Mins</span>
            </div>
            <span>:</span>
            <div className="flex flex-col items-center">
              <span className="bg-black/20 px-3 py-2 rounded">{timeRemaining.seconds.toString().padStart(2, "0")}</span>
              <span className="text-xs text-purple-300 mt-1">Secs</span>
            </div>
          </div>
        )}

        {/* Pack count display */}
        {packCount > 0 && (
          <div className="mb-6">
            <p className="text-3xl font-bold text-white mb-2">
              You have <span className="text-purple-300">{packCount}</span> {packCount === 1 ? 'pack' : 'packs'} to reveal!
            </p>
          </div>
        )}

        {/* Reveal button */}
        <Button
          onClick={handleRevealClick}
          disabled={packCount === 0}
          size="lg"
          className="bg-white text-gray-800 hover:bg-gray-100 rounded-full font-medium cursor-pointer px-8 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {packCount > 0 ? `Reveal ${packCount} ${packCount === 1 ? 'Pack' : 'Packs'}` : 'No Packs to Reveal'}
        </Button>

        {/* Info text */}
        <p className="text-sm text-purple-300 mt-6">
          Reveal your packs to discover which KOL tokens you received
        </p>
      </div>
    </Card>
  );
}