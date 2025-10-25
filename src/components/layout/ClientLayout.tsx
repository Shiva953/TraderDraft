'use client'

import { Navigation, NavigationHeader } from './Navigation';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useXProfileSync } from '@/app/hooks/useXProfileSync';
import { useWallet } from '@/app/hooks/useWallet';

// Dynamically import TestModeController to avoid SSR issues
const TestModeController = dynamic(
  () => import('@/components/testing/TestModeController'),
  { ssr: false }
);

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { fullAddress } = useWallet();
  const pathname = usePathname();

  // Automatically sync X profile data after login
  useXProfileSync();

  // Background updates - DISABLED IN PRODUCTION, ONLY in dev on / route
  useEffect(() => {
    // IMPORTANT: Disable ALL background requests in production to avoid rate limits
    if (process.env.NODE_ENV === 'production') {
      console.log('⏭️ [Background] Skipping all background updates - PRODUCTION MODE (use Vercel Crons instead)');
      return;
    }

    // Skip all background updates if not on home route
    if (pathname !== '/') {
      console.log('⏭️ [Background] Skipping all background updates - not on home route (pathname:', pathname, ')');
      return;
    }

    console.log('🚀 [Background] Starting background updates for home route (DEVELOPMENT ONLY)');

    // Track if requests are in progress to prevent overlapping calls
    let isUpdatingMarketData = false;
    let isUpdatingPortfolio = false;

    // Market data update (development only, ONLY on / route)
    const updateMarketData = async () => {
      // CRITICAL: Check if we're still on home route BEFORE running
      if (pathname !== '/') {
        console.log('⏭️ [DEV] Skipping market data update - not on home route anymore (pathname:', pathname, ')');
        return;
      }

      if (isUpdatingMarketData) {
        console.log('⏭️ [DEV] Skipping market data update - already in progress');
        return;
      }

      isUpdatingMarketData = true;
      try {
        const response = await fetch('/api/updateMarketData', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ [DEV] Market data updated:', result.successCount, 'traders');
        } else if (response.status === 429) {
          console.warn('⚠️ [DEV] Rate limited - will retry later');
        }
      } catch (error) {
        console.error('❌ [DEV] Market data update failed:', error);
      } finally {
        isUpdatingMarketData = false;
      }
    };

    // Portfolio update (runs for authenticated users, ONLY on / route)
    const updatePortfolio = async () => {
      // CRITICAL: Check if we're still on home route BEFORE running
      if (pathname !== '/') {
        console.log('⏭️ [Portfolio] Skipping update - not on home route anymore (pathname:', pathname, ')');
        return;
      }

      if (!fullAddress) return;
      if (isUpdatingPortfolio) {
        console.log('⏭️ [Portfolio] Skipping update - already in progress');
        return;
      }

      isUpdatingPortfolio = true;
      try {
        const response = await fetch('/api/user/updatePortfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPrivyWalletAddress: fullAddress })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ [Portfolio] Updated:', result.portfolio);
        } else if (response.status === 429) {
          console.warn('⚠️ [Portfolio] Rate limited - will retry later');
        }
      } catch (error) {
        console.error('❌ [Portfolio] Update failed:', error);
      } finally {
        isUpdatingPortfolio = false;
      }
    };

    // DON'T run updates immediately on mount to avoid initial burst
    // Wait a bit to let the page load first
    const initialDelay = setTimeout(() => {
      // Double-check we're still on home route before running initial update
      if (pathname === '/') {
        updateMarketData();
        if (fullAddress) {
          updatePortfolio();
        }
      } else {
        console.log('⏭️ [Background] Skipping initial update - route changed before timeout (pathname:', pathname, ')');
      }
    }, 3000); // Wait 3 seconds after mount

    // Set up intervals (ONLY on / route, ONLY in development)
    const marketDataInterval = setInterval(updateMarketData, 2 * 60 * 1000); // 2 minutes
    const portfolioInterval = fullAddress
      ? setInterval(updatePortfolio, 5 * 60 * 1000) // 5 minutes
      : null;

    return () => {
      console.log('🛑 [Background] Stopping background updates for home route');
      clearTimeout(initialDelay);
      clearInterval(marketDataInterval);
      if (portfolioInterval) clearInterval(portfolioInterval);
    };
  }, [fullAddress, pathname]); // Re-run when wallet address OR pathname changes

  // Show test mode controller if NEXT_PUBLIC_ENABLE_TEST_MODE is set or in development
  const showTestMode = process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === 'true' ||
                       process.env.NODE_ENV === 'development';

  return (
    <SidebarProvider defaultOpen={true}>
      <Navigation />
      <SidebarInset className="m-0 p-0">
        <NavigationHeader />
        {children}
        {showTestMode && <TestModeController />}
      </SidebarInset>
    </SidebarProvider>
  );
}
