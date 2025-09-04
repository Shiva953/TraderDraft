'use client';

import { PrivyProvider } from '@privy-io/react-auth';

export default function Providers({ children, appId }: { children: React.ReactNode, appId: string }) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Create embedded wallets for users who don't have a wallet
        loginMethods: ["google", "github", "twitter"],
        embeddedWallets: {
          createOnLogin: 'all-users', 
          solana: {
            createOnLogin: 'all-users' // Explicitly create Solana wallet for all users
          }
        },
        // Add appearance config if needed
        appearance: {
          theme: 'dark',
          walletChainType: "solana-only"
        }
      }}
    >
      {children}
    </PrivyProvider>
  );
}