# Test Mode Guide

## Overview

The Test Mode Controller allows founders and developers to test the competition flow with an accelerated timeline without needing to run terminal commands.

## Features

- **10-minute competitions** (vs 2.5 days in production)
- **2-minute snapshot intervals** (vs 14 hours in production, at 14:00 UTC everyday during the window)
- **1.5-minute cooldown** between competitions (vs 12 hours in production, where we show the finalized results for the last competition that took place)
- **Auto-snapshots** - Automatic score updates every 2 minutes
- **Auto-finalization** - Competition auto-finalizes after 10 minutes
- **Toast notifications** - Visual feedback for all actions
- **Help modal** - Built-in testing instructions

## How to Access

### Development (Automatic)
Test Mode is automatically enabled in development:
```bash
bun run dev
```

### Production/Preview (Manual Enable)
Add to your environment variables:
```bash
NEXT_PUBLIC_ENABLE_TEST_MODE=true
```

## How to Test

### 1. Start a Competition
1. Click the **"Test Mode"** button in bottom-right corner
2. Click **"Start Test Competition (10min)"**
3. Competition starts immediately with 10-minute duration

### 2. Buy KOL Tokens
- Use the main app interface to buy KOL tokens
- Your holdings will be tracked in the competition

### 3. Watch Auto-Snapshots
- Every 2 minutes, a toast notification appears: **"📸 Daily Score Snapshot Taken!"**
- Your scores update automatically
- Refresh the leaderboard to see updated rankings

### 4. Competition Finalization
- After 10 minutes, competition auto-finalizes
- Giant toast appears: **"🏆 COMPETITION FINALIZED!"**
- Click **"Refresh"** button in toast to see final results

### 5. Cooldown Period
- Wait 1.5 minutes before starting next competition
- Timer shown in Test Mode Controller
- New competition can be started after cooldown

## Manual Controls

While auto-actions run in background, you can also manually trigger:

### Manual Snapshot
- Click **"Take Snapshot Now"** to force a score update
- Useful for testing without waiting for auto-interval

### Manual Finalize
- Click **"Finalize Now"** to end competition early
- Competition must be active to finalize

## Test Mode UI

### Status Display
- 🟢 **Green dot** - Competition active
- 🟡 **Yellow dot** - Cooldown period
- ⚪ **Gray dot** - Ready to start

### Competition Info
- Competition ID
- Time remaining (countdown)
- Last finalized competition details

### Help Button
Click the **?** icon for full testing instructions

## Timeline Comparison

| Action | Test Mode | Production |
|--------|-----------|------------|
| Competition Duration | 10 minutes | 2.5 days (Mon 0:00 - Wed 12:00) |
| Snapshot Interval | 2 minutes | 14 hours (daily at 14:00 UTC) |
| Post-Finalize Gap | 1.5 minutes | 12 hours |

## Testing Flow Example

```
1. [0:00] Start Competition
2. [0:01] Buy KOL Tokens
3. [2:00] Auto-Snapshot #1 📸
4. [3:00] Buy More Tokens
5. [4:00] Auto-Snapshot #2 📸
6. [6:00] Auto-Snapshot #3 📸
7. [8:00] Auto-Snapshot #4 📸
8. [10:00] Auto-Finalize 🏆
9. [10:00] View Winners
10. [11:30] Ready for Next Test
```

## Important Notes

### For Founders
- ✅ Test complete competition flow quickly
- ✅ See all UI states (active, finalized, cooldown)
- ✅ Validate scoring and leaderboard logic
- ✅ No terminal/command line needed

### For Developers
- 🔧 Test Mode uses same database as production
- 🔧 All API routes are the same (just accelerated timeline)
- 🔧 Auto-enabled in `NODE_ENV=development`
- 🔧 Can be enabled in production with env flag (for staging tests)

### For Production
- ⚠️ **Disable Test Mode** in final production deployment
- ⚠️ Remove `NEXT_PUBLIC_ENABLE_TEST_MODE=true` from production env
- ⚠️ Test Mode button will not appear when disabled

## Troubleshooting

### Test Mode button not appearing?
- Check `NODE_ENV` is `development`, OR
- Add `NEXT_PUBLIC_ENABLE_TEST_MODE=true` to `.env`

### Can't start competition?
- Check if competition already active (only 1 at a time)
- Wait for cooldown period if just finalized

### Snapshots not working?
- Competition must be ACTIVE
- Check browser console for errors
- Refresh Test Mode Controller status

### Auto-actions not triggering?
- Auto-snapshots run every 2 minutes
- Auto-finalize runs at exactly 10 minutes
- Check toast notifications for confirmation

## API Endpoints Used

- `POST /api/test-mode` - Test mode actions
  - `{ action: 'start' }` - Start competition
  - `{ action: 'snapshot' }` - Take snapshot
  - `{ action: 'finalize' }` - Finalize competition
  - `{ action: 'status' }` - Get status

- `GET /api/test-mode` - Get current status

All underlying APIs are the same as production:
- `/api/competitions/start`
- `/api/cron/calculateDailyScores`
- `/api/competitions/{id}/finalize`

## Disabling Test Mode

### Local Development
Test Mode is always enabled in development. To disable:
1. Set `NEXT_PUBLIC_ENABLE_TEST_MODE=false` in `.env`
2. Restart dev server

### Production
Simply don't add the `NEXT_PUBLIC_ENABLE_TEST_MODE` variable or set it to `false`.

The Test Mode button will automatically hide when disabled.
