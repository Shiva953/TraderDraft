/**
 * Test Full Cycle Script
 *
 * Simulates the complete application flow for testing purposes:
 * 1. Pack Sale Phase (7 minutes)
 * 2. Token Creation
 * 3. Pack Reveal Phase (3 minutes)
 * 4. Competition Phase (10 minutes with 2-minute snapshots)
 *
 * Usage:
 * 1. Make sure TESTING_MODE=true in .env
 * 2. Make sure CRON_SECRET is set in .env
 * 3. Start dev server: bun run dev
 * 4. Run this script: bun run scripts/test-full-cycle.ts
 */

const API_BASE = 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET not found in environment variables');
  console.error('   Please set CRON_SECRET in your .env file');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${CRON_SECRET}`
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callEndpoint(path: string, method: string = 'POST') {
  try {
    console.log(`\n🔵 [FETCH] ${method} ${path}`);
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ [ERROR] Response status: ${response.status}`);
      console.error(`   ${JSON.stringify(data, null, 2)}`);
      return { success: false, data };
    }

    console.log(`✅ [SUCCESS] ${response.status}`);
    console.log(`   ${JSON.stringify(data, null, 2)}`);
    return { success: true, data };
  } catch (error) {
    console.error(`❌ [ERROR] Failed to call ${path}:`, error);
    return { success: false, error };
  }
}

async function getCurrentPhase() {
  const response = await fetch(`${API_BASE}/api/getCurrentPhase`);
  const data = await response.json();
  return data;
}

async function main() {
  console.log('🚀 ========================================');
  console.log('🚀 FULL CYCLE TEST - STARTING');
  console.log('🚀 ========================================');
  console.log('');
  console.log('⚙️  Configuration:');
  console.log(`   API Base: ${API_BASE}`);
  console.log(`   CRON_SECRET: ${CRON_SECRET ? '***' + CRON_SECRET.slice(-4) : 'NOT SET'}`);
  console.log(`   Testing Mode: ${process.env.TESTING_MODE}`);
  console.log('');
  console.log('📋 Timeline:');
  console.log('   [00:00-07:00] Pack Sale Phase');
  console.log('   [07:00]       Token Creation');
  console.log('   [07:00-10:00] Pack Reveal Phase');
  console.log('   [10:00]       Competition Starts');
  console.log('   [12:00]       Snapshot #1');
  console.log('   [14:00]       Snapshot #2');
  console.log('   [16:00]       Snapshot #3');
  console.log('   [18:00]       Snapshot #4');
  console.log('   [20:00]       Competition Finalizes');
  console.log('');
  console.log('⚠️  NOTE: This script takes ~20 minutes to complete');
  console.log('');

  // Check if TESTING_MODE is enabled
  if (process.env.TESTING_MODE !== 'true') {
    console.warn('⚠️  WARNING: TESTING_MODE is not enabled in .env');
    console.warn('   Set TESTING_MODE=true for shortened durations');
    console.warn('   Otherwise this will run with production timings (7 days + 3 days)');
    console.warn('');
    console.warn('   Continue anyway? (Ctrl+C to cancel)');
    await sleep(5000);
  }

  const startTime = Date.now();

  // ===============================
  // PHASE 1: PACK SALE
  // ===============================
  console.log('\n');
  console.log('🟡 ========================================');
  console.log('🟡 PHASE 1: PACK SALE (7 minutes)');
  console.log('🟡 ========================================');

  await callEndpoint('/api/cron/phaseManager');

  const phase1 = await getCurrentPhase();
  console.log('\n📊 Current Phase:', phase1.phase);
  console.log('   Message:', phase1.message);

  console.log('\n⏳ Waiting 7 minutes for pack sale phase...');
  console.log('   (In production, this would be 7 days)');

  // Wait 7 minutes
  for (let i = 1; i <= 7; i++) {
    await sleep(60 * 1000); // 1 minute
    const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60);
    console.log(`   ⏱️  ${i}/7 minutes elapsed (total: ${elapsed}m)`);
  }

  // ===============================
  // PHASE 2: TOKEN CREATION
  // ===============================
  console.log('\n');
  console.log('🟢 ========================================');
  console.log('🟢 PHASE 2: TOKEN CREATION');
  console.log('🟢 ========================================');

  await callEndpoint('/api/cron/phaseManager');

  const phase2 = await getCurrentPhase();
  console.log('\n📊 Current Phase:', phase2.phase);
  console.log('   Message:', phase2.message);

  // ===============================
  // PHASE 3: PACK REVEAL
  // ===============================
  console.log('\n');
  console.log('🔵 ========================================');
  console.log('🔵 PHASE 3: PACK REVEAL (3 minutes)');
  console.log('🔵 ========================================');

  console.log('\n⏳ Waiting 3 minutes for pack reveal phase...');
  console.log('   (In production, this would be 3 days)');

  // Wait 3 minutes
  for (let i = 1; i <= 3; i++) {
    await sleep(60 * 1000); // 1 minute
    const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60);
    console.log(`   ⏱️  ${i}/3 minutes elapsed (total: ${elapsed}m)`);
  }

  await callEndpoint('/api/cron/phaseManager');

  const phase3 = await getCurrentPhase();
  console.log('\n📊 Current Phase:', phase3.phase);

  // ===============================
  // PHASE 4: COMPETITION
  // ===============================
  console.log('\n');
  console.log('🟡 ========================================');
  console.log('🟡 PHASE 4: COMPETITION (10 minutes)');
  console.log('🟡 ========================================');

  // Start competition
  await callEndpoint('/api/cron/startCompetition');

  const phase4 = await getCurrentPhase();
  console.log('\n📊 Current Phase:', phase4.phase);
  console.log('   Competition ID:', phase4.competition?.id);

  // Setup snapshot intervals
  console.log('\n⏳ Running competition with 2-minute snapshots...');
  console.log('   Snapshots will occur at: 2min, 4min, 6min, 8min');
  console.log('   Competition will finalize at: 10min');

  let snapshotCount = 0;
  const competitionStartTime = Date.now();

  // Run for 10 minutes with snapshots every 2 minutes
  for (let minute = 1; minute <= 10; minute++) {
    await sleep(60 * 1000); // 1 minute
    const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60);
    const compElapsed = Math.floor((Date.now() - competitionStartTime) / 1000 / 60);

    console.log(`   ⏱️  Competition: ${compElapsed}/10 minutes (total: ${elapsed}m)`);

    // Take snapshot every 2 minutes
    if (minute % 2 === 0 && minute < 10) {
      snapshotCount++;
      console.log(`\n   📸 Taking Snapshot #${snapshotCount}...`);
      await callEndpoint('/api/cron/calculateDailyScores');
    }
  }

  // ===============================
  // PHASE 5: FINALIZE
  // ===============================
  console.log('\n');
  console.log('🟢 ========================================');
  console.log('🟢 PHASE 5: FINALIZE COMPETITION');
  console.log('🟢 ========================================');

  await callEndpoint('/api/cron/finalizeCompetition');

  const finalPhase = await getCurrentPhase();
  console.log('\n📊 Current Phase:', finalPhase.phase);
  console.log('   Message:', finalPhase.message);

  // ===============================
  // SUMMARY
  // ===============================
  const totalTime = Math.floor((Date.now() - startTime) / 1000 / 60);

  console.log('\n');
  console.log('✅ ========================================');
  console.log('✅ FULL CYCLE TEST - COMPLETED');
  console.log('✅ ========================================');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Total Time: ${totalTime} minutes`);
  console.log(`   Snapshots Taken: ${snapshotCount}`);
  console.log(`   Final Phase: ${finalPhase.phase}`);
  console.log('');
  console.log('🎉 All phases completed successfully!');
  console.log('');
  console.log('📝 Next Steps:');
  console.log('   1. Check competition results in frontend');
  console.log('   2. Verify TP distribution in database');
  console.log('   3. Test pack claiming with earned TP');
  console.log('');
}

main().catch(error => {
  console.error('\n❌ Test script failed:', error);
  process.exit(1);
});
