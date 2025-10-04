import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSolanaWallets } from "@privy-io/react-auth/solana"

export const MultiPackDisplay = ({ onOpenPack, packCount }: { onOpenPack: () => void; packCount: number }) => {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
        {/* Stylish blurred background with KOL pack images */}
        <div className="absolute inset-0 z-0">
          {/* Multiple pack images positioned randomly with blur */}
          <div className="absolute top-10 left-10 w-64 h-96 opacity-20 blur-3xl">
            <img src="/pack.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute top-32 right-20 w-56 h-80 opacity-15 blur-3xl">
            <img src="/pack.png" alt="" className="w-full h-full object-cover transform rotate-12" />
          </div>
          <div className="absolute bottom-20 left-1/4 w-48 h-72 opacity-20 blur-3xl">
            <img src="/pack.png" alt="" className="w-full h-full object-cover transform -rotate-12" />
          </div>
          <div className="absolute bottom-32 right-1/3 w-52 h-76 opacity-15 blur-3xl">
            <img src="/pack.png" alt="" className="w-full h-full object-cover" />
          </div>

          {/* Dark gradient overlay - black to transparent */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black/60" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center text-white space-y-8">
          <div className="space-y-4">
            {/* <h1 className="text-4xl md:text-5xl font-bold">Ready to Reveal?</h1> */}
            {/* <p className="text-xl text-gray-300">
              You're about to open {packCount} pack{packCount === 1 ? '' : 's'} simultaneously
            </p> */}
          </div>

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
    const messages = [
      "Opening your packs...",
      "Revealing KOL cards...",
      "Consolidating duplicate tokens...",
      "Claiming tokens to your wallet...",
      "Finalizing your collection..."
    ]

    const [currentMessage, setCurrentMessage] = useState(0)

    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentMessage((prev) => (prev + 1) % messages.length)
      }, 800)

      return () => clearInterval(interval)
    }, [messages.length])

    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Same stylish blurred background */}
        <div className="absolute inset-0 z-0">
          {/* Multiple pack images positioned randomly with blur */}
          <div className="absolute top-10 left-10 w-64 h-96 opacity-20 blur-3xl">
            <img src="/pack.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute top-32 right-20 w-56 h-80 opacity-15 blur-3xl">
            <img src="/pack.png" alt="" className="w-full h-full object-cover transform rotate-12" />
          </div>
          <div className="absolute bottom-20 left-1/4 w-48 h-72 opacity-20 blur-3xl">
            <img src="/pack.png" alt="" className="w-full h-full object-cover transform -rotate-12" />
          </div>
          <div className="absolute bottom-32 right-1/3 w-52 h-76 opacity-15 blur-3xl">
            <img src="/pack.png" alt="" className="w-full h-full object-cover" />
          </div>

          {/* Dark gradient overlay - black to transparent */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black/60" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center text-white space-y-8">
          <div className="space-y-4">
            {/* <h2 className="text-3xl font-bold">Processing {packCount} Pack{packCount === 1 ? '' : 's'}</h2> */}
            <p className="text-md tracking-tight text-gray-300">{messages[currentMessage]}</p>
          </div>

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
  
  