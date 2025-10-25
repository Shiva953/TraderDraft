import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.kolscan.io',
        pathname: '/profiles/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.module.rules.push({
      test: /\.ts$/,
      include: /node_modules\/@cks-systems/,
      use: [
        {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: {
              module: 'esnext',
            },
          },
        },
      ],
    });

    // CRITICAL FIX: Split heavy SDKs into separate chunks to avoid 429 errors
    // This prevents Vercel from rate-limiting massive bundled chunks
    if (!isServer) {
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Solana SDK - ~300KB, separate chunk
          solana: {
            test: /[\\/]node_modules[\\/]@solana[\\/]/,
            name: 'solana-sdk',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Privy SDK - ~500KB, separate chunk
          privy: {
            test: /[\\/]node_modules[\\/]@privy-io[\\/]/,
            name: 'privy-sdk',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Meteora SDK - ~200KB, separate chunk
          meteora: {
            test: /[\\/]node_modules[\\/]@meteora-ag[\\/]/,
            name: 'meteora-sdk',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Anchor SDK - ~400KB, separate chunk
          anchor: {
            test: /[\\/]node_modules[\\/]@coral-xyz[\\/]anchor[\\/]/,
            name: 'anchor-sdk',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Metaplex SDK - ~300KB, separate chunk
          metaplex: {
            test: /[\\/]node_modules[\\/]@metaplex-foundation[\\/]/,
            name: 'metaplex-sdk',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Radix UI - multiple components
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix-ui',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Framer Motion - animation library
          framerMotion: {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: 'framer-motion',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Default vendor chunk for smaller libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },
  async headers() {
    return [
      {
        // For all pages
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Privy-Token" },
        ]
      }
    ]
  }
};

export default nextConfig;