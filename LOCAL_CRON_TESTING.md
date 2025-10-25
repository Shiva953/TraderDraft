# Local Cron Testing Guide

## Overview

Since Vercel crons only work in production, we've created local cron runners that simulate the production cron schedule on your local machine.

---

## Setup

### 1. Make Sure `.env` Has `CRON_SECRET`

```bash
# Check if CRON_SECRET exists
grep CRON_SECRET .env
```

If not found, add it:
```bash
# Generate a random secret
CRON_SECRET=your_random_secret_here_12345
```

### 2. Choose Testing Mode

#### Option A: Production Schedule (Slow, Real Timing)
Uses real production cron schedules:
- phaseManager: Every 5 minutes
- updateDB: Every 6 hours
- startCompetition: Mon & Thu at 00:00 UTC
- calculateDailyScores: Mon/Tue/Thu/Fri at 14:00 UTC
- finalizeCompetition: Wed & Sat at 12:00 UTC

**Use when:** Testing real production behavior

#### Option B: Fast Schedule (Recommended for Quick Testing)
Uses accelerated schedules:
- phaseManager: Every 30 seconds
- updateDB: Every 2 minutes
- startCompetition: Every 3 minutes
- calculateDailyScores: Every 1 minute
- finalizeCompetition: Every 2 minutes

**Use when:** Testing full lifecycle quickly

**IMPORTANT:** For fast mode, also set `TESTING_MODE=true` in `.env`:
```bash
TESTING_MODE=true  # 7min pack sale, 3min reveal, 10min competition
```

---

## Running Local Crons (Fully Automated)

### Terminal Setup

You need **2 terminals running simultaneously**:

#### Terminal 1: Start Dev Server
```bash
bun run dev
```
Wait for it to show:
```
✓ Ready in 2.1s
○ Local:        http://localhost:3000
```

#### Terminal 2: Start Cron Runner

**Option A: Production Schedule**
```bash
bun run cron
```

**Option B: Fast Schedule (Recommended)**
```bash
bun run cron:fast
```

---

## What Happens (Automated)

### With Fast Mode (`bun run cron:fast`)

```
Minute 0:00
├─ phaseManager runs immediately
│  └─ Creates PACK_SALE phase (7 minutes duration)
└─ Frontend shows "PACK SALE IS LIVE" banner

Minute 0:30, 1:00, 1:30... (every 30 seconds)
└─ phaseManager checks if pack sale ended

Minute 2:00, 4:00, 6:00... (every 2 minutes)
└─ updateDB scrapes trader data

Minute 7:00
├─ phaseManager detects pack sale ended
│  ├─ Calls createTokensAndPoolV2
│  │  └─ Creates 50 KOL tokens
│  └─ Creates PACK_REVEAL phase (3 minutes)
└─ Frontend shows "PACK REVEAL IS LIVE" banner

Minute 10:00
├─ phaseManager detects reveal ended
│  └─ Creates COMPETITION_LOOP phase
└─ Frontend waits for competition

Minute 12:00, 15:00, 18:00... (every 3 minutes)
└─ startCompetition creates new competitions

Minute 11:00, 12:00, 13:00... (every 1 minute during competition)
└─ calculateDailyScores takes snapshots

Minute 14:00, 16:00, 18:00... (every 2 minutes)
└─ finalizeCompetition closes competitions
```

**Full lifecycle tested in ~20 minutes!**

---

## Monitoring

### Watch Cron Runner Output

Terminal 2 will show:
```
⏰ [2025-01-10T12:00:00.000Z] Triggering phaseManager...
✅ [phaseManager] Success
   Phase: PACK_SALE
   Action: INITIALIZED

⏰ [2025-01-10T12:00:30.000Z] Triggering phaseManager...
✅ [phaseManager] Success
   Phase: PACK_SALE
   Action: NO_TRANSITION
   ⚠️  Skipped: Still in PACK_SALE
```

### Watch Frontend Updates

Open browser to `http://localhost:3000` and watch banners change automatically:

1. **PACK_SALE** → Blue "Pack Sale is Live" banner
2. **PACK_REVEAL** → Purple "Pack Reveal is Live" banner + KOL Leaderboard
3. **COMPETITION** → Competition banner + KOL Leaderboard

### Check Database State

```bash
# Open Prisma Studio
bunx prisma studio

# Check AppPhase table
# - Should have 1 row with currentPhase
# - Watch it change: PACK_SALE → PACK_REVEAL → COMPETITION_LOOP

# Check Traders table
# - Empty during PACK_SALE
# - Populated after PACK_REVEAL starts (50 KOLs with tokens)

# Check Competitions table
# - Empty until COMPETITION_LOOP phase
# - New competitions created every 3 mins (fast mode)
```

---

## Testing Checklist

Run `bun run cron:fast` and verify:

### Phase 1: PACK_SALE (0-7 minutes)
- [ ] phaseManager creates PACK_SALE phase
- [ ] Frontend shows "Pack Sale is Live" banner
- [ ] No KOL leaderboard visible
- [ ] Can buy packs via modal

### Phase 2: PACK_REVEAL (7-10 minutes)
- [ ] phaseManager calls createTokensAndPoolV2
- [ ] Traders table populated with 50 KOLs
- [ ] Frontend shows "Pack Reveal is Live" banner
- [ ] KOL leaderboard visible
- [ ] Can reveal packs

### Phase 3: COMPETITION_LOOP (10+ minutes)
- [ ] phaseManager creates COMPETITION_LOOP phase
- [ ] startCompetition creates first competition
- [ ] Frontend shows competition banner
- [ ] KOL leaderboard visible
- [ ] calculateDailyScores runs every minute
- [ ] finalizeCompetition runs every 2 minutes

---

## Stopping Crons

Press `Ctrl+C` in Terminal 2 (cron runner) to stop.

Terminal 1 (dev server) can keep running.

---

## Troubleshooting

### Cron Runner Can't Connect
```
❌ [phaseManager] Failed: fetch failed
```

**Fix:** Make sure dev server is running in Terminal 1:
```bash
bun run dev
```

### "CRON_SECRET not found"
```
❌ CRON_SECRET not found in environment variables!
```

**Fix:** Add to `.env`:
```bash
CRON_SECRET=your_random_secret_here
```

### Crons Getting Skipped
```
⚠️  Skipped: Not in COMPETITION_LOOP phase
```

**Expected behavior:** Crons have guards. They only run in appropriate phases.

### Database Connection Error
```
❌ Can't reach database server
```

**Fix:** Check `DATABASE_URL` in `.env` is correct and database is accessible.

---

## Production vs Local Testing Comparison

| Feature | Production (Vercel) | Local (Fast Mode) |
|---------|---------------------|-------------------|
| **Cron Execution** | Vercel's cron service | `node-cron` library |
| **Schedule** | Real times (5min, 6hrs, etc.) | Accelerated (30s, 2min, etc.) |
| **Pack Sale** | 7 days | 7 minutes |
| **Pack Reveal** | 3 days | 3 minutes |
| **Competition** | 60 hours | 10 minutes |
| **Full Lifecycle** | 10+ days | ~20 minutes |
| **Authorization** | Vercel adds CRON_SECRET header | Script adds CRON_SECRET header |

---

## Files Created

```
scripts/local-cron-runner.ts       # Production schedule
scripts/local-cron-runner-fast.ts  # Fast schedule (for testing)
```

**Package.json scripts:**
```json
{
  "cron": "bun run scripts/local-cron-runner.ts",
  "cron:fast": "bun run scripts/local-cron-runner-fast.ts"
}
```

---

## Summary

**To test locally (fully automated):**

1. Terminal 1: `bun run dev`
2. Terminal 2: `bun run cron:fast`
3. Watch Terminal 2 for cron logs
4. Watch browser for frontend updates
5. Check Prisma Studio for database changes

**No manual intervention needed - crons run automatically on schedule!** 🚀

---

## Resetting for Re-Testing

### Reset to Pack Sale Phase (Quick Reset)

If you want to test the pack sale → reveal flow again:

```bash
# Stop cron runner (Ctrl+C in Terminal 2)

# Reset to pack sale phase
bun run reset:phase

# Restart cron runner
bun run cron:fast
```

**What it does:**
- Deletes all `AppPhase` entries
- Next phaseManager run will create PACK_SALE phase again
- Keeps all other data (traders, competitions, users)

### Full Database Reset (Nuclear Option)

To start completely fresh (delete everything):

```bash
# Stop cron runner (Ctrl+C in Terminal 2)

# Full reset (interactive - asks confirmation)
bun run reset:full

# Follow prompts to choose what to delete

# Restart cron runner
bun run cron:fast
```

**What it does:**
- Deletes AppPhase, Competitions, KolHoldings, Traders
- Optionally deletes Users & Orders
- Complete fresh start

---

## Updated Fast Mode Timings

With the updated `cron:fast` schedule, you now get **3-minute gaps** to view results:

```
Timeline Example:

Minute 0:   Competition #1 starts
Minute 1.5: Daily scores snapshot #1
Minute 3:   Competition #1 finalizes → Show results for 3 mins
Minute 6:   Competition #2 starts
Minute 7.5: Daily scores snapshot #1
Minute 9:   Competition #2 finalizes → Show results for 3 mins
Minute 12:  Competition #3 starts
...
```

**Schedule:**
- phaseManager: Every 30 seconds
- updateDB: Every 2 minutes
- startCompetition: Every 6 minutes (gives 3 min gap after finalize)
- calculateDailyScores: Every 1.5 minutes
- finalizeCompetition: Every 3 minutes

This gives you **3 full minutes** to view competition results before the next competition starts!

