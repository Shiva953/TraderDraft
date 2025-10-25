/**
 * Local Cron Runner for Development
 *
 * Simulates Vercel cron jobs locally by scheduling HTTP requests
 * to your local dev server.
 *
 * Usage:
 *   Terminal 1: bun run dev
 *   Terminal 2: bun run scripts/local-cron-runner.ts
 */

import cron from 'node-cron';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET not found in environment variables!');
  console.error('   Make sure .env has CRON_SECRET defined');
  process.exit(1);
}

console.log('🚀 Local Cron Runner Started');
console.log('============================');
console.log(`📍 Base URL: ${BASE_URL}`);
console.log(`🔑 Using CRON_SECRET from .env`);
console.log('');

// Helper function to call cron endpoints
async function callCron(name: string, path: string) {
  try {
    console.log(`\n⏰ [${new Date().toISOString()}] Triggering ${name}...`);

    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ [${name}] Success:`, JSON.stringify(data, null, 2));
    } else {
      console.error(`❌ [${name}] Error:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error(`❌ [${name}] Failed:`, error instanceof Error ? error.message : 'Unknown error');
  }
}

// Schedule crons (using production schedules)
console.log('📅 Scheduling crons...\n');

// 1. Phase Manager - Every 5 minutes
console.log('✅ Scheduled: phaseManager (*/5 * * * *)');
cron.schedule('*/5 * * * *', () => {
  callCron('phaseManager', '/api/cron/phaseManager');
});

// 2. Update DB - Every 6 hours
console.log('✅ Scheduled: updateDB (0 */6 * * *)');
cron.schedule('0 */6 * * *', () => {
  callCron('updateDB', '/api/cron/updateDB');
});

// 3. Start Competition - Mon & Thu at 00:00
console.log('✅ Scheduled: startCompetition (0 0 * * 1,4)');
cron.schedule('0 0 * * 1,4', () => {
  callCron('startCompetition', '/api/cron/startCompetition');
});

// 4. Calculate Daily Scores - Mon/Tue/Thu/Fri at 14:00
console.log('✅ Scheduled: calculateDailyScores (0 14 * * 1,2,4,5)');
cron.schedule('0 14 * * 1,2,4,5', () => {
  callCron('calculateDailyScores', '/api/cron/calculateDailyScores');
});

// 5. Finalize Competition - Wed & Sat at 12:00
console.log('✅ Scheduled: finalizeCompetition (0 12 * * 3,6)');
cron.schedule('0 12 * * 3,6', () => {
  callCron('finalizeCompetition', '/api/cron/finalizeCompetition');
});

console.log('\n🎯 All crons scheduled! Waiting for next execution...');
console.log('   (Press Ctrl+C to stop)\n');

// Trigger phaseManager immediately on startup
console.log('🚀 Running phaseManager immediately on startup...');
callCron('phaseManager', '/api/cron/phaseManager');

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping local cron runner...');
  process.exit(0);
});
