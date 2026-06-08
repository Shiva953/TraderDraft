# TraderDraft - Solana Trading Competition Platform

A Next.js-based platform for tracking top Solana traders (KOLs), creating tokenized representations, and running competitive trading windows.

## DEMO

https://github.com/user-attachments/assets/c4bcc494-2a73-4b46-a2b1-bbdab25d8d5d


## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL with Prisma ORM
- **Blockchain:** Solana (Web3.js + Anchor)
- **Auth:** Privy (Wallet + Social Login)
- **Package Manager:** Bun

## Prerequisites

- [Bun](https://bun.sh) installed
- PostgreSQL database (local or hosted)
- Privy account with app credentials
- Solana wallet keypair for admin operations

## Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_PRIVY_APP_ID` - Privy app ID
- `PRIVY_APP_SECRET` - Privy app secret
- `ADMIN_KEYPAIR` - Solana admin wallet keypair array
- `NEXT_PUBLIC_APP_URL` - App URL (auto-set by Vercel in production)

### 2. Install Dependencies

```bash
bun install
```

### 3. Database Setup

```bash
# Generate Prisma client
bunx prisma generate

# Push schema to database
bunx prisma db push
```

### 4. Run Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Build Commands

```bash
# Full build (includes Prisma generation and DB push)
bun run build

# Development server without logs
bun run dev-nolog

# Build for production (Next.js only)
bun run build-nolog
```

## Deployment on Vercel

This project is configured for deployment on Vercel with the following optimizations:

### Automatic Configuration

- TypeScript and ESLint errors are ignored during builds (configured in `next.config.ts`)
- Prisma client generation happens automatically via `vercel-build` script
- Bun is used as the package manager

### Vercel Environment Variables

Add these environment variables in your Vercel project settings:

1. `DATABASE_URL` - Your production PostgreSQL connection string
2. `NEXT_PUBLIC_PRIVY_APP_ID` - Privy app ID
3. `PRIVY_APP_SECRET` - Privy app secret
4. `ADMIN_KEYPAIR` - Admin Solana keypair (JSON array format)
5. `UPSTASH_REDIS_REST_URL` - Upstash Redis URL (if using)
6. `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token (if using)
7. `NEXT_PUBLIC_CRON_SECRET` - Secret for cron endpoints (optional but recommended)

**Note:** `NEXT_PUBLIC_APP_URL` will be automatically set by Vercel to your deployment URL.

### Deploy Steps

1. Push your code to GitHub
2. Import the repository in Vercel
3. Set the **Install Command** to: `bun install`
4. Set the **Build Command** to: `bun run vercel-build`
5. Add all required environment variables
6. Deploy!

### Post-Deployment

After deployment, you may need to:
1. Run initial data scraping via `/api/scrapeAndPushToDB`
2. Set up cron jobs for automated scoring (see CLAUDE.md for details)

### Important Notes for Production

**Playwright & Web Scraping:**
- The scraping functionality uses Playwright which requires browser binaries
- Vercel has size and execution time limits that may affect scraping operations
- Consider moving heavy scraping tasks to:
  - Vercel Cron Jobs (for scheduled tasks)
  - External service (like AWS Lambda, Railway, or Render)
  - Background job queue system
- Alternative: Use Vercel's `maxDuration` config for serverless functions if on Pro plan

## Project Structure

See [CLAUDE.md](./CLAUDE.md) for detailed project documentation including:
- Architecture overview
- API routes structure
- Database schema
- Development notes
- Testing guidelines

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Privy Documentation](https://docs.privy.io)
- [Solana Documentation](https://docs.solana.com)
- [Prisma Documentation](https://www.prisma.io/docs)
