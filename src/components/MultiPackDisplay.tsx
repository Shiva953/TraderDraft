import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSolanaWallets } from "@privy-io/react-auth/solana"

export const MultiPackDisplay = ({ onOpenPack, packCount }: { onOpenPack: () => void; packCount: number }) => {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <div className="text-center text-white space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">Ready to Reveal?</h1>
            <p className="text-xl text-gray-300">
              You're about to open {packCount} pack{packCount === 1 ? '' : 's'} simultaneously
            </p>
            <p className="text-sm text-gray-400">
              This will consolidate duplicate KOLs and their tokens automatically
            </p>
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
            className="bg-[#FF0062] cursor-pointer text-white px-12 py-4 rounded-full text-xl font-light tracking-tight transition-all duration-200 hover:scale-105 shadow-lg"
          >
            Open All Packs
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
      "Calculating total values...",
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
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Processing {packCount} Pack{packCount === 1 ? '' : 's'}</h2>
            <p className="text-xl text-gray-300">{messages[currentMessage]}</p>
          </div>
          
          <div className="flex justify-center space-x-4">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-4 h-4 bg-purple-500 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [1, 0.5, 1]
                }}
                transition={{
                  duration: 1,
                  delay: i * 0.2,
                  repeat: Infinity
                }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  