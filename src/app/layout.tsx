import type { Metadata } from "next";
import Providers from "@/components/PrivyAuthProvider";
import { Toaster } from "sonner";
// import { CronInitializer } from "@/components/CronInitializer";
import {PrivyProvider} from '@privy-io/react-auth';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kolscan",
  description: "Play with trader tokens and collect packs!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!
  return (
    <html lang="en" http-equiv="Content-Security-Policy">
      <body
        className={`${geistSans.className}`}
      >
        <Providers appId={appId}>
        {/* <CronInitializer /> */}
        {children}
        <Toaster 
            position="top-right"
            expand={true}
            richColors
            theme="dark"
            toastOptions={{
              style: {
                background: 'rgb(23 23 23)',
                border: '1px solid rgb(64 64 64)',
                color: 'white',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
