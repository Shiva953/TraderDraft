# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TraderDraft is a Next.js-based Solana trading competition platform that tracks top traders (KOLs - Key Opinion Leaders), creates tokenized representations of them, and runs competitive trading windows where users can collect and trade KOL tokens via a pack-opening system.

**Tech Stack:** Next.js 15, TypeScript, Prisma (PostgreSQL), Solana Web3.js, Anchor, Playwright, Privy Auth, Meteora DEX integration

## Development Commands

**Package Manager:** This project uses **Bun** (not npm/yarn/pnpm).

```bash
# Development
bun run dev              # Start dev server with normal logging
bun run dev-nolog        # Start dev server on port 8080 without logs

# Build
bun run build            # Full build: Prisma generate + db push + Next.js build
bun run build-nolog      # Build Next.js only without logs
bun run vercel-build     # Vercel-specific build (Prisma generate + Next.js build)

# Database
bunx prisma generate     # Generate Prisma client
bunx prisma db push      # Push schema changes to database
bunx prisma studio       # Open Prisma Studio GUI
```

## Architecture

### Data Flow

1. **Scraping Pipeline** (`/api/scrapeAndPushToDB`): Playwright-based scraper collects top trader data (daily/weekly/monthly rankings) and stores in Traders table
2. **Token Creation** (`/api/createTokensAndPoolV2`): For each top trader, creates SPL tokens and Meteora liquidity pools on Solana
3. **Pack System**: Users buy packs containing random KOL tokens (weighted by rarity: Legendary/Epic/Rare/Common)
4. **Competition System**: Time-windowed tournaments where users' KOL holdings are scored daily based on trader performance

### Key Models (Prisma Schema)

- **Trader**: KOL data with rank, PNL, win rate, avatar, X/Twitter URL, Solana token mint, pool address, rarity tier
- **User**: Privy wallet address, pack holdings, tournament points
- **Competition**: Active tournaments with start/end dates, status (ACTIVE/ENDED/FINALIZED), and TP (Tournament Points) pool
- **CompetitionEntry**: User participation in competitions with scores (windowScore, tournamentPoints, leaderboardPoints)
- **DailyScoreSnapshot**: Lightweight daily aggregate score storage (ONE row per user per competition per day) - token holdings are fetched from on-chain, not stored
- **Order**: Pack purchase transactions

### Rarity System

KOLs are assigned rarity tiers based on leaderboard rank (configured in `src/lib/rarity.ts`):
- **LEGENDARY** (Rank 1-3): 5% pack drop rate, 6% of leaderboard
- **EPIC** (Rank 4-10): 15% pack drop rate, 14% of leaderboard
- **RARE** (Rank 11-25): 30% pack drop rate, 30% of leaderboard
- **COMMON** (Rank 26-50): 50% pack drop rate, 50% of leaderboard

Pack generation uses weighted random selection to match these distribution targets.

### Solana Program Integration

Custom Anchor program (`pnlpackprogram`) at address `9GNSpxshtu8rA7cmHdvNVgGXh9WtxBrSC53k3FJ1jMnZ` handles:
- Pack initialization with KOL token distributions
- Claiming tokens from packs (4 KOLs per pack)
- On-chain pack state management
- Global pack pool PDA: `4AjtpSua4zndvhs4y3zCxyLSvQm1SFpZqD5W76PEkmid`

IDL is located at `src/lib/idl.ts`.

### API Routes Structure

- **Competition Routes** (`/api/competitions/*`):
  - `start`: Create new competition window
  - `[id]/dailyUserScore`: Fetch on-chain token balances and calculate/store daily aggregate scores (cron job at 14:00 UTC)
  - `[id]/finalize`: Close competition and calculate final standings from daily score snapshots
  - `[id]/leaderboard`: Get competition rankings
  - `[id]/results`: Fetch competition results

- **Pack Routes** (`/api/pack/*`):
  - `buyPack`: Purchase packs using Solana transactions
  - `revealPack` / `revealAllPacks` / `revealAllPacksWithRarity`: Open packs and reveal KOL tokens
  - `claimPack` / `claimAllKOLTokens`: Claim tokens from opened packs to user wallet
  - `getUserPacks` / `updateUserPacks`: Manage user pack inventory

- **Data Routes**:
  - `getTopTraders`: Fetch leaderboard data by period (daily/weekly/monthly)
  - `getIndividualKOLData`: Get specific trader details
  - `getUserKOLTokenHoldings`: User's current KOL token portfolio
  - `getOrders`: User's pack purchase history

### Frontend Structure

- **Pages**:
  - `/` - Main landing page
  - `/traders/[kol]` - Individual KOL profile page

- **Components** (`src/components/*`):
  - `leaderboard/` - Trader rankings display
  - `packSale/` - Pack purchase UI
  - `packs/` - Pack opening/revealing interface
  - `traderProfile/` - Individual trader detail views
  - `privy/` - Wallet connection/auth components
  - `ui/` - Reusable UI primitives (Radix UI + shadcn/ui)

- **Hooks** (`src/app/hooks/*`):
  - `useWallet`: Privy wallet integration
  - `usePackPurchase`: Pack buying flow
  - `useUserPacks`: Pack inventory management
  - `useLeaderboard`: Trader leaderboard data
  - `useDevBackgroundJobs`: Development-only scheduled jobs

### Authentication

Uses **Privy** for wallet authentication. User identification is based on `userPrivyWalletAddress`. API routes validate Privy tokens via `@privy-io/server-auth`.

### Environment Variables Required

- `DATABASE_URL`: PostgreSQL connection string
- `NEXT_PUBLIC_PRIVY_APP_ID`: Privy app identifier
- `PRIVY_APP_SECRET`: Privy server-side secret
- `ADMIN_KEYPAIR`: Base58 private key for Solana transactions
- Solana RPC endpoints (devnet currently used)

## Important Development Notes

- **Build Configuration**: TypeScript and ESLint errors are ignored during builds (`next.config.ts`) - fix warnings but they won't block deploys
- **CORS**: All API routes have permissive CORS headers to allow frontend access
- **Devnet**: Currently uses Solana devnet (`api.devnet.solana.com`)
- **Cron Jobs**: Background jobs for competition updates and DB refreshes should be triggered manually or via scheduled routes
- **Logging**: Extensive console logging throughout with emoji prefixes for visual grep-ability (🟡 🟢 🔵 ❌ ✅)
- **Transaction Flow**: Most Solana transactions are constructed server-side, serialized, sent to client for signing, then returned to server for submission

## Testing & Debugging

- Check `/logs` directory for scraping session outputs
- Use `dev-nolog` scripts to reduce console noise during development
- Prisma Studio is helpful for directly inspecting database state
- Most API routes log request/response bodies for debugging