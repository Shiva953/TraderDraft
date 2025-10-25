/**
 * Local Cron Runner - FAST MODE (For Testing)
 *
 * Runs crons on accelerated schedule for local testing.
 * Use this to test the full lifecycle quickly.
 *
 * Fast Schedule (Matching Your Test Requirements):
 * - phaseManager: Every 30 seconds
 * - updateDB: Every 2 minutes
 * - startCompetition: Every 1 minute (guards enforce 5-min window)
 * - calculateDailyScores: Every 2 minutes (snapshots during active competition)
 * - finalizeCompetition: Every 2 minutes (catches competitions that have ended)
 *
 * Timeline:
 * Phase 1: Pack Sale (5 minutes)
 * Phase 2: Pack Reveal (3 minutes)
 * Phase 3: Competition Loop (forever):
 *   - Minute 8: FIRST competition starts immediately (10 min duration)
 *   - Minute 10, 12, 14, 16: Daily scores snapshots
 *   - Minute 18: Competition ends
 *   - Minute 18/20: Finalize runs → SHOW RESULTS
 *   - Minute 18-23: 5-minute finalized results display window
 *   - Minute 23: Next competition starts (15-min cycle)
 *   - Minute 25, 27, 29, 31: Snapshots
 *   - Minute 33: Competition ends
 *   - Minute 38: Next competition starts
 *   - ...repeats (15-minute cycles)
 *
 * IMPORTANT: Make sure TESTING_MODE=true in .env!
 * Testing durations:
 * - Pack Sale: 5 minutes
 * - Pack Reveal: 3 minutes
 * - Competition: 10 minutes each
 *
 * Usage:
 *   Terminal 1: bun run dev
 *   Terminal 2: bun run scripts/local-cron-runner-fast.ts
 */

import cron from 'node-cron';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET not found in environment variables!');
  console.error('   Make sure .env has CRON_SECRET defined');
  process.exit(1);
}

console.log('🚀 Local Cron Runner - FAST MODE');
console.log('=================================');
console.log(`📍 Base URL: ${BASE_URL}`);
console.log(`🔑 Using CRON_SECRET from .env`);
console.log('⚡ Running on ACCELERATED schedule for testing');
console.log('⚠️  Make sure TESTING_MODE=true in .env!');
console.log('');

// Helper function to call cron endpoints
async function callCron(name: string, path: string) {
  try {
    const timestamp = new Date().toISOString();
    console.log(`\n⏰ [${timestamp}] Triggering ${name}...`);

    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ [${name}] Success`);
      console.log(`   Phase: ${data.phase || data.currentPhase || 'N/A'}`);
      console.log(`   Action: ${data.action || data.message || 'N/A'}`);
      if (data.skipped) {
        console.log(`   ⚠️  Skipped: ${data.reason}`);
      }
    } else {
      console.error(`❌ [${name}] Error:`, data.error || 'Unknown error');
    }
  } catch (error) {
    console.error(`❌ [${name}] Failed:`, error instanceof Error ? error.message : 'Unknown error');
  }
}

// Schedule crons (FAST MODE)
console.log('📅 Scheduling crons (FAST MODE)...\n');

// 1. Phase Manager - Every 30 seconds (instead of 5 mins)
console.log('✅ Scheduled: phaseManager (every 30 seconds)');
cron.schedule('*/30 * * * * *', () => {
  callCron('phaseManager', '/api/cron/phaseManager');
}, { timezone: 'UTC' });

// 2. Update DB - Every 2 minutes (instead of 6 hours)
console.log('✅ Scheduled: updateDB (every 2 minutes)');
cron.schedule('*/2 * * * *', () => {
  callCron('updateDB', '/api/cron/updateDB');
}, { timezone: 'UTC' });

// 3. Start Competition - Runs every minute, guards ensure 5-min window after finalization
// NOTE: First competition starts immediately when COMPETITION_LOOP phase begins (triggered by phaseManager)
// Guards prevent starting too early - ensures 5-minute finalization display window
console.log('✅ Scheduled: startCompetition (every 1 minute, guards enforce timing)');
cron.schedule('* * * * *', () => {
  callCron('startCompetition', '/api/cron/startCompetition');
}, { timezone: 'UTC' });

// 4. Calculate Daily Scores - Every 2 minutes (during active competition)
console.log('✅ Scheduled: calculateDailyScores (every 2 minutes)');
cron.schedule('*/2 * * * *', () => {
  callCron('calculateDailyScores', '/api/cron/calculateDailyScores');
}, { timezone: 'UTC' });

// 5. Finalize Competition - Runs every 2 minutes to catch competitions that have ended
// Competition ends after 10 minutes, this will catch it within 2 minutes
console.log('✅ Scheduled: finalizeCompetition (every 2 minutes to catch ended competitions)');
cron.schedule('*/2 * * * *', () => {
  callCron('finalizeCompetition', '/api/cron/finalizeCompetition');
}, { timezone: 'UTC' });

console.log('\n🎯 All crons scheduled! Running fast for testing...');
console.log('   (Press Ctrl+C to stop)\n');

// Trigger phaseManager immediately on startup
console.log('🚀 Running phaseManager immediately on startup...');
callCron('phaseManager', '/api/cron/phaseManager');

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping local cron runner...');
  process.exit(0);
});
