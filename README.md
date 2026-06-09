# TraderDraft — Solana KOL Trading Competition Platform

TraderDraft is a Next.js platform where real on-chain trader performance becomes a competitive game. The system scrapes top Solana wallet performers (KOLs), mints an SPL token for each one on Solana using a custom Anchor program, and runs biweekly competitions where users hold those tokens and earn scores proportional to their KOL's real PnL.

## Demo

https://github.com/user-attachments/assets/c4bcc494-2a73-4b46-a2b1-bbdab25d8d5d

---

## How It Works — End-to-End

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                        PLATFORM LIFECYCLE                        │
  └─────────────────────────────────────────────────────────────────┘

  [1] Scrape KOLScan leaderboard (Daily / Weekly / Monthly)
         │
         ▼
  [2] Store KOL wallet addresses, PnL, win-rate in Postgres
         │
         ▼
  [3] For each unique KOL name → mint SPL token via Anchor program
      + create Meteora DAMMv2 liquidity pool (token / SOL pair)
         │
         ▼
  [4] Users buy KOL packs (0.1 SOL) → receive 4 random KOL tokens
      (rarity-weighted: LEGENDARY > EPIC > RARE > COMMON)
         │
         ▼
  [5] Biweekly competition window opens (Mon–Thu or Thu–Sun)
         │
         ▼
  [6] Daily at 14:00 UTC → snapshot on-chain balances,
      calculate each user's daily score from KOL PnL × token share
         │
         ▼
  [7] Competition ends → finalize TP + LP for all participants,
      update global tournament points leaderboard
```

---

## Token Creation & Meteora DAMMv2 Pools

Each KOL gets a unique SPL token minted via the `pnlpackprogram` Anchor program and an AMM pool created through [Meteora DAMMv2 (cp-amm-sdk)](https://github.com/MeteoraAg/cp-amm-sdk).

### Token Distribution (per KOL)

```
  Total Supply: 1,000,000,000 tokens (6 decimals)

  ┌──────────────────────────────────────────────┐
  │  94% → Token Vault PDA  (pack rewards pool)  │
  │   6% → Meteora AMM pool (initial liquidity)  │
  └──────────────────────────────────────────────┘
```

### Pool Creation Flow

```
  Admin wallet
      │
      ├─[1]─ createMint()               → new SPL mint keypair
      │
      ├─[2]─ createMetadata()           → Metaplex metadata PDA
      │         name = KOL name
      │         symbol = generated ticker (e.g. "ANSEM")
      │
      ├─[3]─ setAuthority()             → transfer mint authority
      │         from: admin wallet
      │         to:   global_pack_pool PDA
      │
      ├─[4]─ initKolVaultAndTransferV2  → Anchor instruction
      │         • mints full supply
      │         • 94% → token_vault PDA
      │         • 6%  → poolTokenAccount (ATA owned by admin)
      │         • transfers SOL from global_pack_pool → admin
      │           (to fund Meteora pool creation)
      │
      └─[5]─ cpAmm.createCustomPool()  → Meteora DAMMv2 pool
                tokenA = KOL token  (6 decimals)
                tokenB = NATIVE_MINT / SOL (9 decimals)
                range  = MIN_SQRT_PRICE → MAX_SQRT_PRICE (full-range)
                fees   = 5% base + 5% partner + up to 1% dynamic
```

The partner fee (5%) routes to a designated fee wallet on every swap via the `referralTokenAccount` parameter, giving the protocol a sustainable revenue stream.

---

## Pack System

Users purchase packs via the `transferToPackPool` instruction (0.1 SOL each). The admin's `packReveal` instruction then selects 4 KOL tokens weighted by rarity and calls `transferFromKolVaultToUser` for each, moving tokens from the vault PDAs directly into the user's associated token accounts.

```
  Rarity tiers (determined by KOL leaderboard rank):

  Rank  1–5    →  LEGENDARY
  Rank  6–15   →  EPIC
  Rank 16–30   →  RARE
  Rank 31+     →  COMMON
```

---

## Competition Logic

### Schedule (production cron)

```
  Mon 00:00 UTC  → startCompetition   (window 1: Mon–Thu)
  Thu 00:00 UTC  → startCompetition   (window 2: Thu–Sun)

  Daily 14:00 UTC → calculateDailyScores  (snapshot)

  Sun 12:00 UTC  → finalizeCompetition (window 1)
  Wed 12:00 UTC  → finalizeCompetition (window 2)

  Every 5 min    → phaseManager  (auto-transition states)
  Every 6 hrs    → updateDB      (refresh KOL PnL from scraper)
```

> Cron jobs are currently driven by node-cron (Vercel crons require a paid plan).

### Daily Score Snapshot (`calculateDailyScores`)

Every day the system reads **actual on-chain balances** for all users across all KOL token mints — not just what was purchased during the current competition. Users who hold tokens but haven't explicitly joined are auto-enrolled.

```
  For each KOL token T with participants holding it:

    totalSupply_T  = Σ (balance of T across all participants)

    dailyScore_T(user) = PnL_T  ×  (userBalance_T / totalSupply_T)

  User's total daily score = Σ dailyScore_T(user)  over all held tokens
```

One `DailyScoreSnapshot` row is written per user per day (upserted, keyed on `userId + competitionId + snapshotDate`).

```
  Example (2 users, 1 KOL with PnL = +500):

  User A holds 60,000 tokens  →  share = 60%  →  daily score = 300
  User B holds 40,000 tokens  →  share = 40%  →  daily score = 200
```

### Competition Finalization (`finalizeCompetition`)

After the window ends, window scores are aggregated and two metrics are computed for every participant:

```
  WindowScore(u)  = Σ dailyScore(u, day)  over all days in window

  TP(u) = TP_POOL  ×  WindowScore(u) / Σ WindowScore(v)
                                         (all participants)

  LP(u) = 100  ×  WindowScore(u) / max(WindowScore)
```

`TP` (Tournament Points) are proportional — the pool is shared relative to contribution. `LP` (Leaderboard Points, 0–100%) reflects performance relative to the top scorer. Both are written to `CompetitionEntry` and the user's `totalTournamentPoints` is incremented atomically.

```
  State machine for a competition:

  ACTIVE ──[end window]──► ACTIVE (expired, pending finalize)
         ──[finalizeCompetition]──► FINALIZED
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL + Prisma ORM |
| Blockchain | Solana — Web3.js, Anchor, SPL Token |
| AMM | Meteora DAMMv2 (`@meteora-ag/cp-amm-sdk`) |
| Auth | Privy (wallet + social login) |
| Scraping | Playwright + Cheerio (KOLScan leaderboard) |
| Package manager | Bun |

---

## Getting Started

### 1. Environment Setup

```bash
cp .env.example .env
```

Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_PRIVY_APP_ID` — Privy app ID
- `PRIVY_APP_SECRET` — Privy app secret
- `ADMIN_KEYPAIR` — Solana admin wallet keypair (JSON array)
- `NEXT_PUBLIC_SOLANA_RPC_URL` — Solana RPC endpoint

### 2. Install & Run

```bash
bun install
bunx prisma generate
bunx prisma db push
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Seed Initial Data

After the dev server is running:

1. `POST /api/scrapeAndPushToDB` — scrape KOLScan and populate the `Trader` table
2. `POST /api/createTokensAndPoolImproved` — mint SPL tokens + Meteora pools for all KOLs
3. `POST /api/competitions/start` — open the first competition window

---

## Project Structure

```
app/
  api/
    competitions/
      [id]/
        dailyUserScore/   ← daily on-chain snapshot + scoring
        end/              ← ACTIVE → ENDED transition
        finalize/         ← compute TP + LP, write results
    cron/
      phaseManager/       ← auto state transitions (every 5 min)
      updateDB/           ← refresh KOL PnL (every 6 hrs)
      startCompetition/   ← open new window (Mon + Thu)
      calculateDailyScores/ ← daily snapshot trigger (14:00 UTC)
      finalizeCompetition/  ← close window (Sun + Wed)
    createTokensAndPoolImproved/ ← mint tokens + Meteora pools
    swapMeteoraToken/     ← build unsigned swap tx for frontend
    scrapeAndPushToDB/    ← KOLScan scraper → Postgres
lib/
  idl.ts                  ← Anchor IDL for pnlpackprogram
  rarity.ts               ← rank → rarity tier mapping
```

---

## Further Reading

- [Solana Docs](https://docs.solana.com)
- [Anchor Framework](https://www.anchor-lang.com)
- [Meteora DAMMv2 SDK](https://github.com/MeteoraAg/cp-amm-sdk)
- [Privy Docs](https://docs.privy.io)
- [Prisma Docs](https://www.prisma.io/docs)