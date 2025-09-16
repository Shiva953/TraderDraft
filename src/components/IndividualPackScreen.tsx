import React, { useState, useRef, useId, useEffect } from "react";
import { motion, AnimatePresence, useAnimate } from "framer-motion";

export const PackDisplay = ({ onOpenPack }: { onOpenPack: () => void }) => {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-8"
        >
          <h1 className="text-4xl font-bold">Your Mystery Pack</h1>
          
          <motion.div
            whileHover={{ scale: 1.05, rotateY: 5 }}
            className="relative mx-auto"
          >
            <div className="h-80 w-60 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-6 shadow-2xl">
              <div className="flex flex-col items-center justify-between h-full text-white">
                <div className="text-lg font-semibold">MYSTERY</div>
                <div className="text-6xl">?</div>
                <div className="text-lg font-semibold">PACK</div>
              </div>
            </div>
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl" />
          </motion.div>
  
          <motion.button
            onClick={onOpenPack}
            className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 text-xl font-semibold text-white shadow-lg hover:shadow-purple-500/30 transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Open Pack
          </motion.button>
        </motion.div>
      </div>
    );
  };
  
  // Loading Animation Component
  export const PackOpeningLoader = () => {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative"
        >
          <div className="h-80 w-60 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-6 shadow-2xl">
            <div className="flex flex-col items-center justify-between h-full text-white">
              <div className="text-lg font-semibold">MYSTERY</div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-6xl"
              >
                ?
              </motion.div>
              <div className="text-lg font-semibold">PACK</div>
            </div>
          </div>
          
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute -inset-8 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-2xl blur-2xl"
          />
        </motion.div>
        
        <div className="mt-8 space-y-4 text-center">
          <h2 className="text-2xl font-bold">Opening Your Pack...</h2>
          <p className="text-gray-400">Revealing your KOL tokens</p>
          
          <div className="flex items-center justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2 w-2 bg-purple-500 rounded-full"
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };
  