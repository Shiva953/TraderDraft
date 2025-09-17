'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import UserProfileDropDownMenu from './UserProfileDropDownMenu'

interface UserProfilePictureProps {
  walletAddress: string
  userPrivyWalletAddress: string
}

interface UserPacksData {
  packHoldings: number
  totalValueOfPackHoldings: number
  claimedPacks: number
  unclaimedPacks: number
}

export default function UserProfilePicture({ walletAddress, userPrivyWalletAddress }: UserProfilePictureProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [userPacks, setUserPacks] = useState<UserPacksData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchUserPacks = async () => {
    if (!userPrivyWalletAddress) return

    setLoading(true)
    try {
      const response = await fetch('/api/getUserPacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrivyWalletAddress,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setUserPacks(data.data)
      }
    } catch (error) {
      console.error('Error fetching user packs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserPacks()
  }, [userPrivyWalletAddress])

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-3 rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-white/40 hover:bg-white/5 transition-all duration-200 cursor-pointer"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-xs">
          {walletAddress ? walletAddress.substring(0, 2).toUpperCase() : '?'}
        </div>
        <div className="text-left">
          <div className="font-semibold">{formatAddress(walletAddress)}</div>
          {userPacks && (
            <div className="text-xs text-neutral-400">
              {userPacks.packHoldings} packs • {userPacks.totalValueOfPackHoldings} SOL
            </div>
          )}
        </div>
        {isDropdownOpen ? (
          <ChevronUp className="h-4 w-4 text-neutral-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        )}
      </button>

      <UserProfileDropDownMenu
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        userPrivyWalletAddress={userPrivyWalletAddress}
      />
    </div>
  )
}
