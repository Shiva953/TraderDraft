"use client"
import { motion } from "framer-motion"
import Image from "next/image"

export const PackDisplay = ({ onOpenPack }: { onOpenPack: () => void }) => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center w-full max-w-md mx-auto">
        <motion.div
          className="relative mx-auto mb-8 flex justify-center"
          whileHover={{ scale: 1.05, rotateY: 5 }}
          style={{ perspective: "1000px" }}
        >
          <div className="w-64 h-80 rounded-2xl shadow-2xl flex items-center justify-center relative overflow-hidden">
            <Image
              src="/pack.png"
              alt="Mystery Pack"
              width={256}
              height={320}
              className="w-full h-full object-cover rounded-2xl"
            />
            {/* Corner blur overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-black/20 pointer-events-none">
              <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-black/30 to-transparent rounded-br-2xl"></div>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-black/30 to-transparent rounded-bl-2xl"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-black/30 to-transparent rounded-tr-2xl"></div>
              <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-black/30 to-transparent rounded-tl-2xl"></div>
            </div>
          </div>
        </motion.div>

        <h2 className="text-4xl font-bold text-white mb-4">Ready to Reveal?</h2>
        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
          Click the pack to discover which 4 KOL traders you've received!
        </p>

        <motion.button
          onClick={onOpenPack}
          className="bg-teal-500 cursor-pointer text-white px-8 py-4 rounded-full text-xl font-light tracking-tight hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Open Pack
        </motion.button>
      </div>
    </div>
  )
}

export const PackOpeningLoader = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center w-full max-w-md mx-auto">
        <motion.div
          className="w-64 h-80 rounded-2xl shadow-2xl flex items-center justify-center mb-8 mx-auto relative overflow-hidden"
          animate={{
            rotateY: [0, 180, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          <Image
            src="/pack.png"
            alt="Mystery Pack"
            width={256}
            height={320}
            className="w-full h-full object-cover rounded-2xl"
          />
          {/* Corner blur overlay */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-black/20 pointer-events-none">
            <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-black/30 to-transparent rounded-br-2xl"></div>
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-black/30 to-transparent rounded-bl-2xl"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-black/30 to-transparent rounded-tr-2xl"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-black/30 to-transparent rounded-tl-2xl"></div>
          </div>
        </motion.div>

        <h2 className="text-3xl font-bold text-white mb-4">Opening Your Pack</h2>
        <p className="text-gray-400 text-lg">Discovering your KOL traders...</p>
      </div>
    </div>
  )
}
