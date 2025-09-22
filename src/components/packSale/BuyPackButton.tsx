/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState } from "react"
import BuyPackModal from "./BuyPackModal"

interface BuyPackButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function BuyPackButton({ className = "", children }: BuyPackButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`group relative flex items-center justify-center gap-3 rounded-full px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 transition-all duration-200 hover:shadow-purple-500/50 focus:outline-none focus:ring-4 focus:ring-purple-400/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
      >
        <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        {children || (
          <>
            <span>Buy Packs</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </>
        )}
      </button>

      <BuyPackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
