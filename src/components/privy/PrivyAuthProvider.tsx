'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';

export default function Providers({ children, appId }: { children: React.ReactNode, appId: string }) {
  const [isClient, setIsClient] = useState(false);

  // Only render Privy on the client side to avoid hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Initializing...</p>
      </div>
    </div>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["google", "github", "twitter"],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false,
        },
        appearance: {
          theme: 'dark',
          walletChainType: "solana-only"
        },
        // Add network configuration to prevent timeouts
        solana: {
          network: 'devnet',
        }
      }}
    >
      {children}
    </PrivyProvider>
  );
}