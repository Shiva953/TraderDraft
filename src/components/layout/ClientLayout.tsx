'use client'

import { Navigation } from './Navigation';
import dynamic from 'next/dynamic';

// Dynamically import TestModeController to avoid SSR issues
const TestModeController = dynamic(
  () => import('@/components/testing/TestModeController'),
  { ssr: false }
);

export function ClientLayout({ children }: { children: React.ReactNode }) {
  // Show test mode controller if NEXT_PUBLIC_ENABLE_TEST_MODE is set or in development
  const showTestMode = process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === 'true' ||
                       process.env.NODE_ENV === 'development';

  return (
    <>
      <Navigation />
      {children}
      {showTestMode && <TestModeController />}
    </>
  );
}
