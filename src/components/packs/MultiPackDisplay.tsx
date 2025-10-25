import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSolanaWallets } from "@privy-io/react-auth/solana"
import { KOLInfiniteMovingCards } from "@/components/ui/kol-infinite-cards"
import { FlipWords } from "@/components/ui/flip-words"

interface KOLImageData {
  id: string;
  name: string;
  avatarUrl: string;
  ticker: string;
}

export const MultiPackDisplay = ({ onOpenPack, packCount }: { onOpenPack: () => void; packCount: number }) => {
    const [kolImages, setKolImages] = useState<KOLImageData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchKOLImages = async () => {
        try {
          const response = await fetch('/api/kol/random-images?count=50');
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
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-black">
        {/* Infinite moving KOL cards background */}
        {!loading && kolImages.length > 0 && (
          <div className="absolute inset-0 z-0 flex flex-col justify-evenly">
            {/* First row - moving left */}
            <KOLInfiniteMovingCards
              items={kolImages.slice(0, 10)}
              direction="left"
              speed="slow"
              pauseOnHover={false}
            />
            {/* Second row - moving right */}
            <KOLInfiniteMovingCards
              items={kolImages.slice(10, 20)}
              direction="right"
              speed="normal"
              pauseOnHover={false}
            />
            {/* Third row - moving left */}
            <KOLInfiniteMovingCards
              items={kolImages.slice(20, 30)}
              direction="left"
              speed="fast"
              pauseOnHover={false}
            />
            {/* Fourth row - moving right */}
            <KOLInfiniteMovingCards
              items={kolImages.slice(30, 40)}
              direction="right"
              speed="slow"
              pauseOnHover={false}
            />
            {/* Fifth row - moving left */}
            <KOLInfiniteMovingCards
              items={kolImages.slice(40, 50)}
              direction="left"
              speed="normal"
              pauseOnHover={false}
            />
          </div>
        )}

        {/* Dark overlay to ensure content visibility */}
        <div className="absolute inset-0 z-[1] bg-black/40" />

        {/* Content */}
        <div className="relative z-10 text-center text-white space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="text-3xl md:text-4xl font-bold tracking-tighter text-white">
              <FlipWords
                words={["Get Ready", "Packs Await", "Let's Go", "Time to Open"]}
                duration={2500}
                className="text-white font-bold tracking-tighter"
              />
            </div>
            <motion.p
              className="text-md md:text-xl text-neutral-100 font-light tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {packCount} pack{packCount === 1 ? '' : 's'} ready to reveal
            </motion.p>
          </motion.div>

          <div className="flex justify-center gap-4">
            {[...Array(Math.min(packCount, 3))].map((_, i) => (
              <motion.div
                key={i}
                className="relative"
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <img src="/pack.png" alt="Pack" className="h-32 w-auto rounded-lg shadow-lg" />
              </motion.div>
            ))}
            {packCount > 3 && (
              <div className="flex items-center justify-center h-32 w-24 rounded-lg bg-gray-800 text-white text-sm font-semibold">
                +{packCount - 3} more
              </div>
            )}
          </div>

          <button
            onClick={onOpenPack}
            className="bg-[#FF0062] cursor-pointer text-white px-12 py-4 rounded-full text-xl font-light transition-all duration-200 hover:scale-105 shadow-lg"
          >
            Reveal Packs
          </button>
        </div>
      </div>
    )
  }

  // loading component
  export const MultiPackOpeningLoader = ({ packCount }: { packCount: number }) => {
    const [kolImages, setKolImages] = useState<KOLImageData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchKOLImages = async () => {
        try {
          const response = await fetch('/api/kol/random-images?count=50');
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
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
        {/* Infinite moving KOL cards background */}
        {!loading && kolImages.length > 0 && (
          <div className="absolute inset-0 z-0 flex flex-col justify-evenly">
            {/* First row - moving left */}
            <KOLInfiniteMovingCards
              items={kolImages.slice(0, 10)}
              direction="left"
              speed="slow"
              pauseOnHover={false}
            />
            {/* Second row - moving right */}
            <KOLInfiniteMovingCards
              items={kolImages.slice(10, 20)}
              direction="right"
              speed="normal"
              pauseOnHover={false}
            />
            {/* Third row - moving left */}
            <KOLInfiniteMovingCards
              items={kolImages.slice(20, 30)}
              direction="left"
              speed="fast"
              pauseOnHover={false}
            />
            {/* Fourth row - moving right */}
            <KOLInfiniteMovingCards
              items={kolImages.slice(30, 40)}
              direction="right"
              speed="slow"
              pauseOnHover={false}
            />
            {/* Fifth row - moving left */}
            <KOLInfiniteMovingCards
              items={kolImages.slice(40, 50)}
              direction="left"
              speed="normal"
              pauseOnHover={false}
            />
          </div>
        )}

        {/* Dark overlay to ensure content visibility */}
        <div className="absolute inset-0 z-[1] bg-black/40" />

        {/* Content */}
        <div className="relative z-10 text-center text-white space-y-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="text-4xl md:text-5xl font-bold tracking-tighter text-white">
              Revealing...
            </div>
            <p className="text-md md:text-lg text-neutral-200 opacity-70 font-light tracking-tight max-w-md mx-auto">
              Please don't refresh - we're revealing your pack. This can take up to a minute.
            </p>
          </motion.div>

          {/* Modern ripple/wave loading animation */}
          <div className="flex justify-center items-center h-24">
            <div className="relative w-20 h-20">
              {/* Ripple circles */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-[#FF0062]"
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{
                    scale: [0, 2, 2.5],
                    opacity: [1, 0.5, 0]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.6,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
              ))}
              {/* Center dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="w-3 h-3 bg-[#FF0062] rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.8, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  