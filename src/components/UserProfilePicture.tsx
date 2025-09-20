'use client'

import { useState } from 'react'
import UserProfileDropDownMenu from './UserProfileDropDownMenu'

interface UserPacksData {
  packHoldings: number
  totalValueOfPackHoldings: number
  claimedPacks: number
  unclaimedPacks: number
}

interface TokenHolding {
  ticker: string
  name: string
  balance: string
  mintAddress: string
  poolAddress?: string
  tokenPrice?: string
  priceChange24h?: string
  priceChange24hPercent?: number
}

interface UserProfilePictureProps {
  walletAddress: string
  userPrivyWalletAddress: string
  userPacks: UserPacksData | null
  tokenHoldings: TokenHolding[]
  tokenHoldingsCount: number
  userDataLoading: boolean
  userDataError: string | null
}

export default function UserProfilePicture({ 
  walletAddress, 
  userPrivyWalletAddress,
  userPacks,
  tokenHoldings,
  tokenHoldingsCount,
  userDataLoading,
  userDataError
}: UserProfilePictureProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const closeDropdown = () => {
    setIsDropdownOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-white/40 hover:bg-white/5 transition-all duration-200 cursor-pointer"
      >
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-xs">
          {walletAddress ? walletAddress.substring(0, 2).toUpperCase() : '?'}
        </div>
        <span>{walletAddress}</span>
      </button>

      <UserProfileDropDownMenu
        isOpen={isDropdownOpen}
        onClose={closeDropdown}
        userPrivyWalletAddress={userPrivyWalletAddress}
        userPacks={userPacks}
        tokenHoldings={tokenHoldings}
        tokenHoldingsCount={tokenHoldingsCount}
        loading={userDataLoading}
        error={userDataError}
      />
    </div>
  )
}