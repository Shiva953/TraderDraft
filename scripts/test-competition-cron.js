/**
 * Background Cron Job for Testing Competition
 *
 * This script runs alongside your Next.js dev server and automatically:
 * - Starts a competition if none ACTIVE exists (10 minute duration)
 * - Takes snapshots every 2 minutes during active competitions
 * - Finalizes competitions when they end (with retry logic)
 * - Waits 1.5 minutes after finalization before starting next competition
 *
 * MAIN APP FLOW (Scaled to 10 min test):
 * - Competition Duration: 10 minutes (vs 2.5 days in prod)
 * - Snapshot Interval: 2 minutes (vs 14 hours in prod)
 * - Gap after finalization: 1.5 minutes (vs 12 hours in prod)
 *
 * Usage: node scripts/test-competition-cron.js
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Check interval: every 20 seconds
const CHECK_INTERVAL = 20 * 1000; // 20 seconds

// Snapshot interval: every 2 minutes
const SNAPSHOT_INTERVAL = 2 * 60 * 1000; // 2 minutes

// Gap after finalization before starting new competition: 1.5 minutes
const POST_FINALIZATION_GAP = 1.5 * 60 * 1000; // 1.5 minutes

let activeCompetitions = new Map();
let lastSnapshotTimes = new Map();
let lastFinalizationTime = null;
let finalizeRetryCount = new Map();
const MAX_FINALIZE_RETRIES = 3;

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

      // STRICT CHECK: Competition status must be ACTIVE
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
        // STRICT CHECK: Competition MUST be ACTIVE and ended to finalize
        console.log(`⏰ [CRON] Competition ${compId} has ended (status: ACTIVE), attempting finalization...`);
        await finalizeCompetition(compId);
      } else if (comp.status === 'FINALIZED') {
        // Competition already finalized
        console.log(`🏁 [CRON] Competition ${compId} is finalized, waiting for gap period...`);
        activeCompetitions.delete(compId);
        lastSnapshotTimes.delete(compId);
        finalizeRetryCount.delete(compId);
      } else {
        console.warn(`⚠️  [CRON] Competition ${compId} has unexpected status: ${comp.status}`);
      }
    } else {
      // No active competition found
      if (activeCompetitions.size > 0) {
        console.log('ℹ️  [CRON] No active competitions found, clearing tracked competitions');
        activeCompetitions.clear();
        lastSnapshotTimes.clear();
      }

      // Check if we should start a new competition
      const now = new Date();
      if (lastFinalizationTime) {
        const timeSinceFinalization = now - lastFinalizationTime;
        if (timeSinceFinalization < POST_FINALIZATION_GAP) {
          const remainingMs = POST_FINALIZATION_GAP - timeSinceFinalization;
          const remainingMin = Math.round(remainingMs / 60000);
          const remainingSec = Math.round((remainingMs % 60000) / 1000);
          console.log(`⏳ [CRON] Waiting ${remainingMin}m ${remainingSec}s before starting next competition`);
          return;
        }
      }

      // Try to start a competition
      console.log('🚀 [CRON] No active competition found. Attempting to start one...');
      await startCompetition();
    }
  } catch (error) {
    console.error('❌ [CRON] Error checking competitions:', error.message);
  }
}

async function startCompetition(retryCount = 0) {
  const MAX_RETRIES = 3;

  try {
    console.log(`📝 [START] Calling start competition endpoint (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

    const response = await fetch(`${API_URL}/api/competitions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 409) {
        // Competition already exists - this is expected
        console.log('ℹ️  [START] Active competition already exists');
        return;
      }

      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.success && data.competition) {
      console.log(`✅ [START] Competition started successfully!`);
      console.log(`   Competition ID: ${data.competition.id}`);
      console.log(`   Duration: 10 minutes (test mode)`);
      console.log(`   Snapshot interval: 2 minutes`);
      console.log(`   Status: ${data.competition.status}`);
      console.log(`   Start: ${data.competition.startDate}`);
      console.log(`   End: ${data.competition.endDate}`);

      // Verify status is ACTIVE
      if (data.competition.status !== 'ACTIVE') {
        console.error(`❌ [START] Competition status is not ACTIVE: ${data.competition.status}`);
      }
    } else {
      console.warn('⚠️  [START] Unexpected response:', data);
    }
  } catch (error) {
    console.error(`❌ [START] Error starting competition (attempt ${retryCount + 1}):`, error.message);

    // Retry logic
    if (retryCount < MAX_RETRIES && !error.message.includes('409')) {
      console.log(`🔄 [START] Retrying in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return startCompetition(retryCount + 1);
    } else {
      console.error(`❌ [START] Max retries reached or competition exists`);
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
    const retries = finalizeRetryCount.get(competitionId) || 0;

    console.log(`\n🏆 [FINALIZE] Finalizing competition ${competitionId} (attempt ${retries + 1}/${MAX_FINALIZE_RETRIES})...`);

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

      if (data.finalization.participants === 0) {
        console.log('   ℹ️  No participants in this competition');
      } else {
        console.log(`   Total distributed: ${data.leaderboard.reduce((sum, r) => sum + parseFloat(r.tournamentPoints), 0).toFixed(2)} TP`);

        if (data.leaderboard && data.leaderboard.length > 0) {
          console.log('\n🏅 Top 3:');
          data.leaderboard.slice(0, 3).forEach(result => {
            console.log(`   ${result.rank}. ${result.userWallet.substring(0, 8)}... - ${result.tournamentPoints} TP`);
          });
        }
      }

      // Mark finalization time
      lastFinalizationTime = new Date();
      console.log(`⏰ [FINALIZE] Starting ${POST_FINALIZATION_GAP / 60000}min gap before next competition`);

      // Remove from tracking
      activeCompetitions.delete(competitionId);
      lastSnapshotTimes.delete(competitionId);
      finalizeRetryCount.delete(competitionId);
    } else {
      console.warn('⚠️  [FINALIZE] Finalization completed but returned unsuccessful status');
    }
  } catch (error) {
    console.error(`❌ [FINALIZE] Error finalizing competition:`, error.message);

    // Retry logic
    const retries = finalizeRetryCount.get(competitionId) || 0;
    if (retries < MAX_FINALIZE_RETRIES - 1) {
      finalizeRetryCount.set(competitionId, retries + 1);
      console.log(`🔄 [FINALIZE] Will retry on next check cycle (${retries + 1}/${MAX_FINALIZE_RETRIES} attempts so far)`);
    } else {
      console.error(`❌ [FINALIZE] Max retries (${MAX_FINALIZE_RETRIES}) reached for competition ${competitionId}`);
      // Force remove from tracking after max retries
      activeCompetitions.delete(competitionId);
      lastSnapshotTimes.delete(competitionId);
      finalizeRetryCount.delete(competitionId);
    }
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
console.log(`   Post-finalization gap: ${POST_FINALIZATION_GAP / 60000} minutes`);
console.log('\nFlow:');
console.log('  1. Start competition (10min duration)');
console.log('  2. Take snapshots every 2min');
console.log('  3. Finalize at end (with retry)');
console.log('  4. Wait 1.5min gap');
console.log('  5. Repeat\n');
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