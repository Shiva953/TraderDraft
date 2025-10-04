'use client'

import { useState } from 'react'
import { Sheet, SheetTrigger } from '@/components/ui/sheet'
import UserProfileSheet from './UserProfileSheet'
import type { UserPacksData, TokenHolding } from '@/types'

interface UserProfilePictureProps {
  walletAddress: string
  userPrivyWalletAddress: string
  userPacks: UserPacksData | null
  tokenHoldings: TokenHolding[]
  tokenHoldingsCount: number
  userDataLoading: boolean
  userDataError: string | null
  onLogout: () => void
}

export default function UserProfilePicture({
  walletAddress,
  userPrivyWalletAddress,
  userPacks,
  tokenHoldings,
  tokenHoldingsCount,
  userDataLoading,
  userDataError,
  onLogout
}: UserProfilePictureProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-white/40 hover:bg-white/5 transition-all duration-200 cursor-pointer"
        >
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-xs">
            {walletAddress ? walletAddress.substring(0, 2).toUpperCase() : '?'}
          </div>
          <span>{walletAddress}</span>
        </button>
      </SheetTrigger>

      <UserProfileSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        userPrivyWalletAddress={userPrivyWalletAddress}
        userPacks={userPacks}
        tokenHoldings={tokenHoldings}
        tokenHoldingsCount={tokenHoldingsCount}
        loading={userDataLoading}
        error={userDataError}
        onLogout={onLogout}
      />
    </Sheet>
  )
}