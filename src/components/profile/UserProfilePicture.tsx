'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetTrigger } from '@/components/ui/sheet'
import UserProfileSheet from './UserProfileSheet'
import type { UserPacksData, TokenHolding } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Geist_Mono } from "next/font/google"
import { meteoraClient } from '@/lib/meteoraPriceUtils'

const geistMono = Geist_Mono({
  subsets: ["latin"],
});


interface UserProfilePictureProps {
  walletAddress: string
  userPrivyWalletAddress: string
  userPacks: UserPacksData | null
  tokenHoldings: TokenHolding[]
  tokenHoldingsCount: number
  userDataLoading: boolean
  userDataError: string | null
  onLogout: () => void
  onRefreshData: () => void
}

export default function UserProfilePicture({
  walletAddress,
  userPrivyWalletAddress,
  userPacks,
  tokenHoldings,
  tokenHoldingsCount,
  userDataLoading,
  userDataError,
  onLogout,
  onRefreshData
}: UserProfilePictureProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [portfolioValueUSD, setPortfolioValueUSD] = useState<number | null>(null)
  const [portfolioValueSOL, setPortfolioValueSOL] = useState<number | null>(null)
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true)
  const [xProfilePictureUrl, setXProfilePictureUrl] = useState<string | null>(null)
  const [xProfileLoading, setXProfileLoading] = useState(false)

  // Fast-path: fetch cached portfolio value (or first-time compute) from getPortfolioValue
  const fetchPortfolioFast = async () => {
    if (!userPrivyWalletAddress) return;
    try {
      const [portfolioResponse, solPrice] = await Promise.all([
        fetch('/api/user/getPortfolioValue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPrivyWalletAddress })
        }),
        meteoraClient.getSOLPriceUSD()
      ]);

      const data = await portfolioResponse.json();
      if (portfolioResponse.ok && data?.success) {
        const valueUSD = data.data?.totalValueUSD ?? 0;
        setPortfolioValueUSD(valueUSD);
        setPortfolioValueSOL(valueUSD / solPrice);
      }
    } catch (err) {
      console.error('Error fetching portfolio (fast):', err);
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  // Note: Background portfolio updates moved to ClientLayout to run globally (not per component instance)

  // On mount: get fast cached value (NO interval here - moved to ClientLayout to avoid duplicates)
  useEffect(() => {
    if (userPrivyWalletAddress) {
      fetchPortfolioFast();
    }
  }, [userPrivyWalletAddress]);

  // Fetch X profile avatar for header avatar display
  useEffect(() => {
    const fetchXProfile = async () => {
      if (!userPrivyWalletAddress) return;
      try {
        setXProfileLoading(true);
        const response = await fetch(`/api/user/getXProfile?walletAddress=${encodeURIComponent(userPrivyWalletAddress)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.xProfile) {
            setXProfilePictureUrl(data.xProfile.xProfilePictureUrl || null);
          }
        }
      } catch (err) {
        // Silent fail, fallback avatar will render
      } finally {
        setXProfileLoading(false);
      }
    };
    fetchXProfile();
  }, [userPrivyWalletAddress]);

  // Shrink wallet address to first 4 and last 4 characters
  const shrinkAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center gap-6">
      {/* Portfolio Value Button */}
      <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 h-11 shadow-sm">
        <span className={`${geistMono.className} tracking-tight font-bold`} style={{ color: '#dbf7be', fontSize: '1.1rem' }}>
          {isLoadingPortfolio ? (
            <span className="flex items-center gap-1">
              <span className="animate-pulse">•</span>
              <span className="animate-pulse" style={{ animationDelay: '0.15s' }}>•</span>
              <span className="animate-pulse" style={{ animationDelay: '0.3s' }}>•</span>
            </span>
          ) : (
            `${(portfolioValueSOL ?? 0).toFixed(2)} SOL`
          )}
        </span>
      </div>

      {/* User Profile Button */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <button
            className="group flex items-center gap-3 rounded-md border border-border bg-card px-4 h-11 shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer">
            <Avatar className="h-8 w-8 ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary/40">
              {xProfilePictureUrl && !xProfileLoading && (
                <AvatarImage src={xProfilePictureUrl} alt="Profile" />
              )}
              <AvatarFallback className="bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500">
              </AvatarFallback>
            </Avatar>
            <span className={`${geistMono.className} tracking-tight text-sm font-medium text-muted-foreground transition-colors duration-300 group-hover:text-foreground`}>
              {shrinkAddress(userPrivyWalletAddress)}
            </span>
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
          onRefreshData={onRefreshData}
          headerPortfolioValue={portfolioValueUSD ?? undefined}
        />
      </Sheet>
    </div>
  )
}