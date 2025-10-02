# Competition Testing Guide

## Daily Score Calculation

The daily score calculation works via scheduled snapshots (like cron jobs), NOT triggered from the frontend.

### How It Works

1. **Snapshot System**: The `/api/competitions/[id]/dailyUserScore` endpoint takes a snapshot of all KOL holdings at the time it's called
2. **Only Recent Purchases Count**: KOLs bought AFTER a snapshot are considered for the NEXT snapshot
3. **Score Calculation**: For each snapshot, scores are calculated based on:
   - User's token holdings
   - Trader's PnL
   - User's share ratio vs total supply

### Production Setup (4-day window, Mon-Thu)
- Snapshots at 14:00 UTC (2 PM) daily
- Use Vercel Cron or similar service
- Cron expression: `0 14 * * *`

### Testing Setup (1-hour window)
- Snapshots every 15 minutes
- Automatic finalization when competition ends
- Use background cron script (recommended) or manual triggers

## Automated Testing (RECOMMENDED)

### Using Background Cron Script

The easiest way to test is to run the automated cron script alongside your dev server:

**Terminal 1** - Start your dev server:
```bash
bun run dev
```

**Terminal 2** - Start the cron job:
```bash
bun run cron
# or: node scripts/test-competition-cron.js
```

The cron script will automatically:
- ✅ Detect when a competition starts
- ✅ Take snapshots every 15 minutes
- ✅ Finalize the competition when it ends
- ✅ Show detailed logs of all operations

**Example output:**
```
🚀 [CRON] Competition cron job started
   API URL: http://localhost:3000
   Check interval: 60s
   Snapshot interval: 15 minutes

🔍 [CRON] Checking for active competitions...
✅ [CRON] Found new active competition: cm99abc...
   Start: 2025-01-15T10:00:00.000Z
   End: 2025-01-15T11:00:00.000Z
   Time remaining: 60 minutes

📸 [SNAPSHOT] Taking snapshot...
✅ [SNAPSHOT] Successfully calculated scores
   Users updated: 5

⏱️  [CRON] Next snapshot in 15 minutes
...

🏆 [FINALIZE] Finalizing competition...
✅ [FINALIZE] Competition finalized successfully!
   Participants: 5
   TP Pool: 1000
```

To stop: Press `Ctrl+C` in the cron terminal

---

## Manual Testing (Alternative)

If you prefer to trigger snapshots manually:

### Manual API Call (Simple - No Auth Required)
```bash
# Trigger daily score calculation
POST http://localhost:3000/api/cron/calculateDailyScores

# Or with curl:
curl -X POST http://localhost:3000/api/cron/calculateDailyScores
```

## Complete Testing Flow (Automated)

### Prerequisites
1. Start dev server: `bun run dev`
2. Start cron job: `bun run cron` (in separate terminal)

### 1. Start Competition
```bash
GET http://localhost:3000/api/competitions/start
```
- Creates 1-hour test competition
- Returns `competitionId` - save this!
- Frontend banner appears automatically

### 2. Users Buy KOL Tokens
- Navigate to any KOL page (e.g., `/traders/some-kol`)
- Click "Buy" button
- Complete swap in modal
- User automatically enters competition on first purchase
- See "🏆 Welcome to the Arena!" toast

### 3. Automatic Snapshots (Every 15 Minutes)

**If using automated cron script** (recommended):
- The cron job automatically takes snapshots every 15 minutes
- Watch the logs in the cron terminal to see snapshots happening
- Snapshots occur at: 0min, 15min, 30min, 45min

**If doing manual testing**:
```bash
# Snapshot 1 (at 0 min)
POST http://localhost:3000/api/cron/calculateDailyScores

# Wait 15 minutes, then snapshot 2 (at 15 min)
POST http://localhost:3000/api/cron/calculateDailyScores

# Wait 15 minutes, then snapshot 3 (at 30 min)
POST http://localhost:3000/api/cron/calculateDailyScores

# Wait 15 minutes, then snapshot 4 (at 45 min)
POST http://localhost:3000/api/cron/calculateDailyScores
```

**Between snapshots**: Users can continue buying KOL tokens. Tokens bought after a snapshot are included in the NEXT snapshot.

### 4. View Live Scores (Anytime During Competition)
- Click "View Live Scores" button in competition banner
- See all users ranked by daily score
- Expand users to see their individual KOL holdings
- Refresh after each snapshot to see updated scores

### 5. Competition Ends & Auto-Finalization (After 60 Minutes)

**If using automated cron script** (recommended):
- Competition ends after 1 hour
- Cron job automatically detects the end time
- Finalization happens automatically within 1 minute
- Watch the logs for the finalization confirmation

**If doing manual testing**:
- Wait for 1 hour to pass from start time
- Manually call finalization:
```bash
POST http://localhost:3000/api/competitions/{competitionId}/finalize
```

**What finalization does**:
- Calculates final window scores (sum of all daily scores)
- Distributes Tournament Points (TP) from the TP pool
- Calculates Leaderboard Points (LP) as percentage of max score
- Updates each user's total TP
- Changes competition status to FINALIZED
- Frontend automatically switches from banner to results page

### 7. View Results
- Results page appears automatically on homepage
- Shows podium (top 3 winners)
- Displays your rank, TP earned, and total TP
- Full leaderboard with all participants
- User's TP is now visible in profile dropdown

## Verifying Scores

Check scores at any time with:
```bash
GET /api/competitions/[id]/dailyUserScore?userWallet=WALLET_ADDRESS
```

View in UI:
- Click "View Live Scores" button in the competition banner
- Expand each user to see their individual KOL holdings and scores

## Common Issues

1. **Scores not updating**: Check that cron job is actually running every 15 minutes
2. **Zero scores**: Ensure users bought tokens BEFORE the snapshot ran
3. **Missing holdings**: KOLs bought after snapshot won't show until next snapshot
