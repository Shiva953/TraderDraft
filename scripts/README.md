# Competition Testing Scripts

## test-competition-cron.js

Automated background cron job for testing competitions without manual intervention.

### What it does

1. **Monitors active competitions** - Checks every minute for active competitions
2. **Takes snapshots automatically** - Triggers daily score calculation every 15 minutes
3. **Auto-finalizes** - Finalizes competitions when they end
4. **Detailed logging** - Shows all operations with timestamps and results

### Usage

```bash
# Start the cron job (in a separate terminal from your dev server)
bun run cron

# Or directly with node
node scripts/test-competition-cron.js
```

### Testing Flow

1. **Terminal 1**: Run `bun run dev` (your Next.js app)
2. **Terminal 2**: Run `bun run cron` (this script)
3. Visit your app and start a competition: `GET /api/competitions/start`
4. The cron script will automatically:
   - Detect the new competition
   - Take snapshots every 15 minutes
   - Finalize when the 1-hour window ends

### Configuration

Edit the constants in `test-competition-cron.js`:

```javascript
const CHECK_INTERVAL = 60 * 1000;        // How often to check (1 minute)
const SNAPSHOT_INTERVAL = 15 * 60 * 1000; // Snapshot frequency (15 minutes)
const API_URL = 'http://localhost:3000';  // Your app URL
```

### Log Output Examples

**Competition detected:**
```
✅ [CRON] Found new active competition: cm99abc...
   Start: 2025-01-15T10:00:00.000Z
   End: 2025-01-15T11:00:00.000Z
   Time remaining: 60 minutes
```

**Snapshot taken:**
```
📸 [SNAPSHOT] Taking snapshot for competition cm99abc...
✅ [SNAPSHOT] Successfully calculated scores:
   Competitions processed: 1
   Succeeded: 1
   Failed: 0
   Users updated: 5
```

**Finalization:**
```
🏆 [FINALIZE] Finalizing competition cm99abc...
✅ [FINALIZE] Competition finalized successfully!
   Participants: 5
   TP Pool: 1000
   Total distributed: 1000.00 TP

🏅 Top 3:
   1. 8x9Abc... - 450.25 TP
   2. 7y8Def... - 325.50 TP
   3. 6z7Ghi... - 224.25 TP
```

### Troubleshooting

**"Failed to check competitions"**
- Make sure your Next.js dev server is running (`bun run dev`)
- Check that the API_URL is correct (default: `http://localhost:3000`)

**Snapshots not happening**
- Check that a competition is actually ACTIVE
- Verify the competition hasn't ended yet
- Look for error messages in the logs

**Manual override**
- You can still manually trigger endpoints even with the cron running
- The cron script is smart enough to not double-trigger

### Stopping the Script

Press `Ctrl+C` in the terminal running the cron script. It will show:
```
👋 [CRON] Shutting down gracefully...
   Total uptime: 1h 5m
   Tracked competitions: 1
```
