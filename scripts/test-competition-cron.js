/**
 * Background Cron Job for Testing Competition
 *
 * This script runs alongside your Next.js dev server and automatically:
 * - Starts a competition if none exists (10 minute duration)
 * - Takes snapshots every 3 minutes during active competitions
 * - Finalizes competitions when they end
 *
 * Usage: node scripts/test-competition-cron.js
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Check interval: every 30 seconds (more frequent for 10-min competitions)
const CHECK_INTERVAL = 30 * 1000; // 30 seconds

// Snapshot interval: every 3 minutes
const SNAPSHOT_INTERVAL = 3 * 60 * 1000; // 3 minutes

let activeCompetitions = new Map();
let lastSnapshotTimes = new Map();
let hasAttemptedStart = false; // Track if we've tried starting a competition

async function checkActiveCompetitions() {
  try {
    console.log('\n🔍 [CRON] Checking for active competitions...');

    const response = await fetch(`${API_URL}/api/competitions/start`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('❌ [CRON] Failed to check competitions');
      return;
    }

    const data = await response.json();

    if (data.success && data.competition) {
      const comp = data.competition;
      const compId = comp.id;
      const endDate = new Date(comp.endDate);
      const now = new Date();

      // Reset the start attempt flag since we found a competition
      hasAttemptedStart = false;

      // Check if competition is still active
      if (comp.status === 'ACTIVE' && now < endDate) {
        if (!activeCompetitions.has(compId)) {
          console.log(`✅ [CRON] Found new active competition: ${compId}`);
          console.log(`   Start: ${comp.startDate}`);
          console.log(`   End: ${comp.endDate}`);
          console.log(`   Duration: 10 minutes`);
          console.log(`   Time remaining: ${Math.round((endDate - now) / 60000)} minutes`);

          activeCompetitions.set(compId, comp);
          lastSnapshotTimes.set(compId, null);

          // Take immediate snapshot for new competition
          await takeSnapshot(compId);
        } else {
          // Check if it's time for a snapshot
          await checkAndTakeSnapshot(compId);
        }
      } else if (comp.status === 'ACTIVE' && now >= endDate) {
        // Competition ended but not finalized
        console.log(`⏰ [CRON] Competition ${compId} has ended, attempting finalization...`);
        await finalizeCompetition(compId);
      } else {
        // Competition is not active, remove from tracking
        if (activeCompetitions.has(compId)) {
          console.log(`🏁 [CRON] Competition ${compId} is no longer active (status: ${comp.status})`);
          activeCompetitions.delete(compId);
          lastSnapshotTimes.delete(compId);
        }
      }
    } else {
      // No active competition found
      if (activeCompetitions.size > 0) {
        console.log('ℹ️  [CRON] No active competitions found, clearing tracked competitions');
        activeCompetitions.clear();
        lastSnapshotTimes.clear();
      }

      // Try to start a competition if we haven't already attempted
      if (!hasAttemptedStart) {
        console.log('🚀 [CRON] No active competition found. Attempting to start one...');
        await startCompetition();
      }
    }
  } catch (error) {
    console.error('❌ [CRON] Error checking competitions:', error.message);
  }
}

async function startCompetition() {
  try {
    hasAttemptedStart = true; // Mark that we've attempted

    console.log('📝 [START] Calling start competition endpoint...');

    const response = await fetch(`${API_URL}/api/competitions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.success && data.competition) {
      console.log(`✅ [START] Competition started successfully!`);
      console.log(`   Competition ID: ${data.competition.id}`);
      console.log(`   Duration: 10 minutes (test mode)`);
      console.log(`   Snapshot interval: 3 minutes`);
      console.log(`   Status: ${data.competition.status}`);
      console.log(`   Start: ${data.competition.startDate}`);
      console.log(`   End: ${data.competition.endDate}`);

      // Reset the flag so we can check normally now
      hasAttemptedStart = false;
    } else {
      console.warn('⚠️  [START] Unexpected response:', data);
    }
  } catch (error) {
    console.error('❌ [START] Error starting competition:', error.message);
    
    // If it's a 409 (competition already exists), reset the flag
    if (error.message.includes('409')) {
      hasAttemptedStart = false;
      console.log('ℹ️  [START] Competition already exists, will check on next cycle');
    }
  }
}

async function checkAndTakeSnapshot(competitionId) {
  const now = new Date();
  const lastSnapshot = lastSnapshotTimes.get(competitionId);

  if (!lastSnapshot) {
    // No snapshot taken yet, take one now
    await takeSnapshot(competitionId);
    return;
  }

  const timeSinceLastSnapshot = now - lastSnapshot;

  if (timeSinceLastSnapshot >= SNAPSHOT_INTERVAL) {
    await takeSnapshot(competitionId);
  } else {
    const timeUntilNext = SNAPSHOT_INTERVAL - timeSinceLastSnapshot;
    const minutesRemaining = Math.round(timeUntilNext / 60000);
    const secondsRemaining = Math.round((timeUntilNext % 60000) / 1000);
    console.log(`⏱️  [CRON] Next snapshot for ${competitionId} in ${minutesRemaining}m ${secondsRemaining}s`);
  }
}

async function takeSnapshot(competitionId) {
  try {
    console.log(`\n📸 [SNAPSHOT] Taking snapshot for competition ${competitionId}...`);

    const response = await fetch(`${API_URL}/api/cron/calculateDailyScores`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      console.log(`✅ [SNAPSHOT] Successfully calculated scores:`);
      console.log(`   Competitions processed: ${data.processed}`);
      console.log(`   Succeeded: ${data.succeeded}`);
      console.log(`   Failed: ${data.failed}`);

      lastSnapshotTimes.set(competitionId, new Date());

      if (data.results && data.results.length > 0) {
        data.results.forEach(result => {
          if (result.success && result.data?.userSummaries) {
            console.log(`   Users updated: ${result.data.userSummaries.length}`);
          }
        });
      }
    } else {
      console.warn('⚠️  [SNAPSHOT] Snapshot completed but returned unsuccessful status');
    }
  } catch (error) {
    console.error(`❌ [SNAPSHOT] Error taking snapshot:`, error.message);
  }
}

async function finalizeCompetition(competitionId) {
  try {
    console.log(`\n🏆 [FINALIZE] Finalizing competition ${competitionId}...`);

    const response = await fetch(`${API_URL}/api/competitions/${competitionId}/finalize`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.success) {
      console.log(`✅ [FINALIZE] Competition finalized successfully!`);
      console.log(`   Participants: ${data.finalization.participants}`);
      console.log(`   TP Pool: ${data.finalization.tpPool}`);
      console.log(`   Total distributed: ${data.leaderboard.reduce((sum, r) => sum + parseFloat(r.tournamentPoints), 0).toFixed(2)} TP`);

      if (data.leaderboard && data.leaderboard.length > 0) {
        console.log('\n🏅 Top 3:');
        data.leaderboard.slice(0, 3).forEach(result => {
          console.log(`   ${result.rank}. ${result.userWallet.substring(0, 8)}... - ${result.tournamentPoints} TP`);
        });
      }

      // Remove from tracking
      activeCompetitions.delete(competitionId);
      lastSnapshotTimes.delete(competitionId);
    } else {
      console.warn('⚠️  [FINALIZE] Finalization completed but returned unsuccessful status');
    }
  } catch (error) {
    console.error(`❌ [FINALIZE] Error finalizing competition:`, error.message);
    // Don't remove from tracking in case of error, will retry next check
  }
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Main loop
console.log('🚀 [CRON] Competition cron job started');
console.log(`   API URL: ${API_URL}`);
console.log(`   Check interval: ${CHECK_INTERVAL / 1000}s`);
console.log(`   Snapshot interval: ${SNAPSHOT_INTERVAL / 60000} minutes`);
console.log(`   Competition duration: 10 minutes`);
console.log('\nWill automatically start a competition if none exists...');
console.log('Monitoring for active competitions...\n');

const startTime = Date.now();

// Run immediately on start
checkActiveCompetitions();

// Then run periodically
setInterval(() => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`⏰ [CRON] Periodic check (uptime: ${formatUptime(Date.now() - startTime)})`);
  checkActiveCompetitions();
}, CHECK_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 [CRON] Shutting down gracefully...');
  console.log(`   Total uptime: ${formatUptime(Date.now() - startTime)}`);
  console.log(`   Tracked competitions: ${activeCompetitions.size}`);
  process.exit(0);
});