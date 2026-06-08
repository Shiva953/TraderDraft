'use client'

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLogin, useLogout } from '@privy-io/react-auth';
import UserProfilePicture from '@/components/profile/UserProfilePicture';
import { KOLSearchDialog } from '@/components/search/KOLSearchDialog';
import { useWallet } from '@/app/hooks/useWallet';
import { useUserPacks } from '@/app/hooks/useUserPacks';
import { useUserData } from '@/app/hooks/useUserData';
import { Home, Trophy, Package, Briefcase, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Inter } from 'next/font/google';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

const inter = Inter({ subsets: ['latin'] });

// Header component for top bar with trigger and user profile
export function NavigationHeader() {
  const { logout } = useLogout();
  const { state, toggleSidebar } = useSidebar();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const {
    address: walletAddress,
    fullAddress: fullWalletAddress,
    isConnected: authenticated
  } = useWallet();

  const {
    data: userPacksData,
  } = useUserPacks();

  const {
    tokenHoldings,
    tokenHoldingsCount,
    loading: userDataLoading,
    error: userDataError,
    refreshUserData,
  } = useUserData(authenticated);

  if (!authenticated) {
    return null;
  }

  return (
    <>
      <header className="bg-[#0A0A0A] backdrop-blur-sm sticky top-0 w-full z-50 border-b border-neutral-800">
        <div className="flex items-center justify-between w-full px-4 h-16">
          {/* Left spacer to balance layout when sidebar is collapsed */}
          <div className="flex-shrink-0" style={{ width: state === 'collapsed' ? '0' : '0' }}></div>

          {/* Center - Search button */}
          <div className="flex-1 flex justify-center px-4">
            <Button
              onClick={() => setIsSearchOpen(true)}
              variant="outline"
              className="max-w-md w-full bg-neutral-900 border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-600 hover:text-white transition-all cursor-pointer h-11 justify-start text-left font-normal"
            >
              <Search className="h-4 w-4 mr-2 shrink-0" />
              <span className="hidden sm:inline">Search KOLs</span>
              <span className="sm:hidden">Search...</span>
              <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-neutral-700 bg-neutral-950 px-1.5 font-mono text-[10px] font-medium text-neutral-400">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>

          {/* Right side - User profile */}
          <div className="flex-shrink-0">
            <UserProfilePicture
              walletAddress={walletAddress}
              userPrivyWalletAddress={fullWalletAddress}
              userPacks={userPacksData}
              tokenHoldings={tokenHoldings}
              tokenHoldingsCount={tokenHoldingsCount}
              userDataLoading={userDataLoading}
              userDataError={userDataError}
              onLogout={logout}
              onRefreshData={refreshUserData}
            />
          </div>
        </div>
      </header>

      {/* Search Dialog */}
      <KOLSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
    </>
  );
}

// Navigation sidebar component
export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, toggleSidebar } = useSidebar();

  const {
    isConnected: authenticated
  } = useWallet();

  // Don't show navigation if not authenticated
  if (!authenticated) {
    return null;
  }

  const menuItems = [
    {
      title: 'Home',
      icon: Home,
      onClick: () => router.push('/'),
      isActive: pathname === '/',
    },
    {
      title: 'Leaderboard',
      icon: Trophy,
      onClick: () => router.push('/leaderboard'),
      isActive: pathname === '/leaderboard',
    },
    {
      title: 'Open Packs',
      icon: Package,
      onClick: () => router.push('/packs'),
      isActive: pathname === '/packs',
    },
    {
      title: 'Portfolio',
      icon: Briefcase,
      onClick: () => router.push('/portfolio'),
      isActive: pathname === '/portfolio',
    },
  ];

  return (
    <>
      {/* Sidebar */}
      <Sidebar 
        collapsible="icon" 
        className="z-100 border-r border-neutral-800 [&_[data-sidebar=sidebar-inner]]:bg-[#0A0A0A]"
        style={{ '--sidebar-width-icon': '4.5rem' } as React.CSSProperties}
      >
        <SidebarHeader className="cursor-pointer bg-[#0A0A0A] border-b border-neutral-800 relative h-16 p-0">
          <button
            onClick={toggleSidebar}
            className="absolute -right-4 top-1/2 -translate-y-1/2 bg-[#0A0A0A] text-white border border-1 border-opacity-50 border-white hover:bg-neutral-800 cursor-pointer p-2 rounded-md transition-colors flex items-center justify-center"
            aria-label="Toggle sidebar"
          >
            {state === 'expanded' ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </SidebarHeader>
        
        <SidebarContent className="bg-[#0A0A0A]">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-[2px] py-6 px-2">
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={item.onClick}
                      isActive={item.isActive}
                      size="lg"
                      tooltip={item.title}
                      className={`${inter.className} text-[0.819rem] font-medium ml-2 px-3 py-5 cursor-pointer transition-all duration-200`}
                      style={{
                        backgroundColor: item.isActive ? '#262626' : 'transparent',
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}
                      onMouseEnter={(e) => {
                        if (!item.isActive) {
                          e.currentTarget.style.backgroundColor = '#1A1A1A'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!item.isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      <item.icon className="h-6 w-6" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </>
  );
}
