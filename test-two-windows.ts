// ============================================================================
// ⚠️  DEPRECATED TEST FILE
// ============================================================================
// This test file is DEPRECATED as of the KolHolding table removal.
// The buyKOLToken route no longer exists - token holdings are now tracked
// automatically via on-chain snapshots in the dailyUserScore cron job.
//
// This file is kept for reference only and will not run successfully.
// ============================================================================

const BASE_URL = 'http://localhost:3000';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================
const WINDOW_DURATION_MINUTES = 5;  // Each competition window lasts 5 minutes
const SNAPSHOT_INTERVAL_MINUTES = 1; // Take daily snapshots every 1 minute (simulates daily 14:00 UTC)

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
}

const results: TestResult[] = [];

async function apiCall(
  method: string,
  endpoint: string,
  body?: any
): Promise<any> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API Error (${response.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

function logResult(step: string, success: boolean, data?: any, error?: string) {
  results.push({ step, success, data, error });
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${success ? '✅' : '❌'} ${step}`);
  if (data) console.log('Data:', JSON.stringify(data, null, 2));
  if (error) console.log('Error:', error);
  console.log('='.repeat(70));
}

function logSection(title: string) {
  console.log(`\n\n${'█'.repeat(70)}`);
  console.log(`█ ${title.padEnd(68)}█`);
  console.log(`${'█'.repeat(70)}\n`);
}

const TEST_USER = '2BpDNbd4HBwpkATvndhXwz2K3F1jaBG59Vmn1M78gc7n';
const TEST_USER_2 = '9y3zxJKsL2dcKehnRpJ3MK7hrsRSFwgohk9BLTuZLmR3';
const TEST_USER_3 = 'AnotherTestUserWallet123456789012345678901234567';
const TRADER_1 = 'daily_6';
const TRADER_2 = 'daily_8';
const TRADER_3 = 'daily_10';

async function runTwoWindowTests() {
  console.log('🚀 Starting TWO-WINDOW Competition System Test Flow\n');
  console.log('Test Configuration:');
  console.log(`- Base URL: ${BASE_URL}`);
  console.log(`- Window Duration: ${WINDOW_DURATION_MINUTES} minutes per window`);
  console.log(`- Snapshot Interval: Every ${SNAPSHOT_INTERVAL_MINUTES} minute(s)`);
  console.log(`- Expected Snapshots per Window: ${WINDOW_DURATION_MINUTES / SNAPSHOT_INTERVAL_MINUTES}`);
  console.log(`- Total Test Duration: ~${WINDOW_DURATION_MINUTES * 2 + 2} minutes\n`);
  console.log(`- Test User 1: ${TEST_USER}`);
  console.log(`- Test User 2: ${TEST_USER_2}`);
  console.log(`- Test User 3: ${TEST_USER_3}`);
  console.log(`- Traders: ${TRADER_1}, ${TRADER_2}, ${TRADER_3}\n`);

  let WINDOW_1_COMPETITION_ID = '';
  let WINDOW_2_COMPETITION_ID = '';

  try {
    logSection('WINDOW 1: MON-THU COMPETITION');

    // TEST 1: Create Window 1
    try {
      const competition1 = await apiCall('POST', `/api/competitions/start`);
      WINDOW_1_COMPETITION_ID = competition1.competition.id;
      logResult('Test 1: Create Window 1 Competition (Mon-Thu)', true, {
        id: competition1.competition.id,
        startDate: competition1.competition.startDate,
        endDate: competition1.competition.endDate,
      });
      console.log(`\n📌 Window 1 Competition ID: ${WINDOW_1_COMPETITION_ID}`);
    } catch (error) {
      logResult('Test 1: Create Window 1 competition', false, null, String(error));
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Window 1 Purchases
    console.log('\n💰 WINDOW 1: Initial purchases...\n');
    
    try {
      const buy1 = await apiCall('POST', `/api/competitions/${WINDOW_1_COMPETITION_ID}/buyKOLToken`, {
        userPrivyWalletAddress: TEST_USER,
        traderId: TRADER_1,
        tokenAmount: '100',
        purchasePrice: '10',
        transactionHash: `w1_tx_1_${Date.now()}`,
      });
      logResult(`Test 2: User 1 buys ${TRADER_1} (100 tokens)`, true);
    } catch (error) {
      logResult('Test 2', false, null, String(error));
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const buy2 = await apiCall('POST', `/api/competitions/${WINDOW_1_COMPETITION_ID}/buyKOLToken`, {
        userPrivyWalletAddress: TEST_USER_2,
        traderId: TRADER_1,
        tokenAmount: '150',
        purchasePrice: '15',
        transactionHash: `w1_tx_2_${Date.now()}`,
      });
      logResult(`Test 3: User 2 buys ${TRADER_1} (150 tokens)`, true);
    } catch (error) {
      logResult('Test 3', false, null, String(error));
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const buy3 = await apiCall('POST', `/api/competitions/${WINDOW_1_COMPETITION_ID}/buyKOLToken`, {
        userPrivyWalletAddress: TEST_USER,
        traderId: TRADER_2,
        tokenAmount: '75',
        purchasePrice: '7.5',
        transactionHash: `w1_tx_3_${Date.now()}`,
      });
      logResult(`Test 4: User 1 buys ${TRADER_2} (75 tokens)`, true);
    } catch (error) {
      logResult('Test 4', false, null, String(error));
    }

    // Wait for first snapshot
    console.log(`\n⏱️  Waiting ${SNAPSHOT_INTERVAL_MINUTES} minute(s) for Snapshot #1...\n`);
    await new Promise(resolve => setTimeout(resolve, SNAPSHOT_INTERVAL_MINUTES * 60 * 1000));

    // Snapshot 1
    console.log('\n📸 WINDOW 1: Daily Snapshot #1\n');
    try {
      const snap1 = await apiCall('POST', `/api/competitions/${WINDOW_1_COMPETITION_ID}/dailyUserScore`);
      logResult('Test 5: Window 1 - Snapshot #1', true, { userSummaries: snap1.userSummaries });
    } catch (error) {
      logResult('Test 5', false, null, String(error));
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // More purchases
    console.log('\n💰 WINDOW 1: More trading...\n');
    try {
      const buy4 = await apiCall('POST', `/api/competitions/${WINDOW_1_COMPETITION_ID}/buyKOLToken`, {
        userPrivyWalletAddress: TEST_USER_3,
        traderId: TRADER_2,
        tokenAmount: '200',
        purchasePrice: '20',
        transactionHash: `w1_tx_4_${Date.now()}`,
      });
      logResult(`Test 6: User 3 joins - buys ${TRADER_2} (200 tokens)`, true);
    } catch (error) {
      logResult('Test 6', false, null, String(error));
    }

    // Wait for second snapshot
    console.log(`\n⏱️  Waiting ${SNAPSHOT_INTERVAL_MINUTES} minute(s) for Snapshot #2...\n`);
    await new Promise(resolve => setTimeout(resolve, SNAPSHOT_INTERVAL_MINUTES * 60 * 1000));

    // Snapshot 2
    console.log('\n📸 WINDOW 1: Daily Snapshot #2\n');
    try {
      const snap2 = await apiCall('POST', `/api/competitions/${WINDOW_1_COMPETITION_ID}/dailyUserScore`);
      logResult('Test 7: Window 1 - Snapshot #2', true, { userSummaries: snap2.userSummaries });
    } catch (error) {
      logResult('Test 7', false, null, String(error));
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // More activity
    try {
      const buy5 = await apiCall('POST', `/api/competitions/${WINDOW_1_COMPETITION_ID}/buyKOLToken`, {
        userPrivyWalletAddress: TEST_USER_2,
        traderId: TRADER_2,
        tokenAmount: '80',
        purchasePrice: '8',
        transactionHash: `w1_tx_5_${Date.now()}`,
      });
      logResult(`Test 8: User 2 buys more ${TRADER_2} (80 tokens)`, true);
    } catch (error) {
      logResult('Test 8', false, null, String(error));
    }

    // Wait for third snapshot
    console.log(`\n⏱️  Waiting ${SNAPSHOT_INTERVAL_MINUTES} minute(s) for Snapshot #3...\n`);
    await new Promise(resolve => setTimeout(resolve, SNAPSHOT_INTERVAL_MINUTES * 60 * 1000));

    // Snapshot 3
    console.log('\n📸 WINDOW 1: Daily Snapshot #3\n');
    try {
      const snap3 = await apiCall('POST', `/api/competitions/${WINDOW_1_COMPETITION_ID}/dailyUserScore`);
      logResult('Test 9: Window 1 - Snapshot #3', true, { userSummaries: snap3.userSummaries });
    } catch (error) {
      logResult('Test 9', false, null, String(error));
    }

    // Wait for window to end
    console.log('\n⏳ Waiting for Window 1 to end...\n');
    const comp1 = await apiCall('GET', `/api/competitions/start`);
    const end1 = new Date(comp1.competition.endDate);
    const waitTime1 = end1.getTime() - Date.now() + 2000;
    if (waitTime1 > 0) {
      console.log(`Waiting ${Math.ceil(waitTime1/1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime1));
    }

    // Finalize Window 1
    console.log('\n🏁 FINALIZING WINDOW 1\n');
    try {
      const final1 = await apiCall('POST', `/api/competitions/${WINDOW_1_COMPETITION_ID}/finalize`);
      logResult('Test 10: Finalize Window 1', true, {
        leaderboard: final1.leaderboard.map((u: any) => ({
          rank: u.rank,
          wallet: u.userWallet.slice(0, 15) + '...',
          windowScore: u.windowScore,
          TP: u.tournamentPoints,
        })),
      });
    } catch (error) {
      logResult('Test 10', false, null, String(error));
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // ========================================================================
    // WINDOW 2
    // ========================================================================
    logSection('WINDOW 2: THU-SUN COMPETITION');

    try {
      const competition2 = await apiCall('POST', `/api/competitions/start`);
      WINDOW_2_COMPETITION_ID = competition2.competition.id;
      logResult('Test 11: Create Window 2 Competition (Thu-Sun)', true, {
        id: competition2.competition.id,
      });
      console.log(`\n📌 Window 2 Competition ID: ${WINDOW_2_COMPETITION_ID}`);
    } catch (error) {
      logResult('Test 11', false, null, String(error));
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Window 2 Purchases
    console.log('\n💰 WINDOW 2: Initial purchases...\n');
    
    try {
      await apiCall('POST', `/api/competitions/${WINDOW_2_COMPETITION_ID}/buyKOLToken`, {
        userPrivyWalletAddress: TEST_USER,
        traderId: TRADER_3,
        tokenAmount: '120',
        purchasePrice: '12',
        transactionHash: `w2_tx_1_${Date.now()}`,
      });
      logResult(`Test 12: User 1 (W2) buys ${TRADER_3} (120 tokens)`, true);
    } catch (error) {
      logResult('Test 12', false, null, String(error));
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      await apiCall('POST', `/api/competitions/${WINDOW_2_COMPETITION_ID}/buyKOLToken`, {
        userPrivyWalletAddress: TEST_USER_2,
        traderId: TRADER_2,
        tokenAmount: '180',
        purchasePrice: '18',
        transactionHash: `w2_tx_2_${Date.now()}`,
      });
      logResult(`Test 13: User 2 (W2) buys ${TRADER_2} (180 tokens)`, true);
    } catch (error) {
      logResult('Test 13', false, null, String(error));
    }

    // Wait for snapshot
    console.log(`\n⏱️  Waiting ${SNAPSHOT_INTERVAL_MINUTES} minute(s) for Snapshot #1...\n`);
    await new Promise(resolve => setTimeout(resolve, SNAPSHOT_INTERVAL_MINUTES * 60 * 1000));

    console.log('\n📸 WINDOW 2: Daily Snapshot #1\n');
    try {
      const snap4 = await apiCall('POST', `/api/competitions/${WINDOW_2_COMPETITION_ID}/dailyUserScore`);
      logResult('Test 14: Window 2 - Snapshot #1', true, { userSummaries: snap4.userSummaries });
    } catch (error) {
      logResult('Test 14', false, null, String(error));
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // More purchases
    try {
      await apiCall('POST', `/api/competitions/${WINDOW_2_COMPETITION_ID}/buyKOLToken`, {
        userPrivyWalletAddress: TEST_USER,
        traderId: TRADER_1,
        tokenAmount: '60',
        purchasePrice: '6',
        transactionHash: `w2_tx_3_${Date.now()}`,
      });
      logResult(`Test 15: User 1 (W2) buys ${TRADER_1} (60 tokens)`, true);
    } catch (error) {
      logResult('Test 15', false, null, String(error));
    }

    // Wait for second snapshot
    console.log(`\n⏱️  Waiting ${SNAPSHOT_INTERVAL_MINUTES} minute(s) for Snapshot #2...\n`);
    await new Promise(resolve => setTimeout(resolve, SNAPSHOT_INTERVAL_MINUTES * 60 * 1000));

    console.log('\n📸 WINDOW 2: Daily Snapshot #2\n');
    try {
      const snap5 = await apiCall('POST', `/api/competitions/${WINDOW_2_COMPETITION_ID}/dailyUserScore`);
      logResult('Test 16: Window 2 - Snapshot #2', true, { userSummaries: snap5.userSummaries });
    } catch (error) {
      logResult('Test 16', false, null, String(error));
    }

    // Cross-window verification
    console.log('\n📊 CROSS-WINDOW VERIFICATION\n');
    try {
      const w1h = await apiCall('GET', `/api/competitions/${WINDOW_1_COMPETITION_ID}/buyKOLToken?userWallet=${TEST_USER}`);
      const w2h = await apiCall('GET', `/api/competitions/${WINDOW_2_COMPETITION_ID}/buyKOLToken?userWallet=${TEST_USER}`);
      logResult('Test 17: User 1 holdings in BOTH windows', true, {
        window1Holdings: w1h.holdings.length,
        window2Holdings: w2h.holdings.length,
      });
    } catch (error) {
      logResult('Test 17', false, null, String(error));
    }

    // Wait for window 2 to end
    console.log('\n⏳ Waiting for Window 2 to end...\n');
    const comp2 = await apiCall('GET', `/api/competitions/start`);
    const end2 = new Date(comp2.competition.endDate);
    const waitTime2 = end2.getTime() - Date.now() + 2000;
    if (waitTime2 > 0) {
      console.log(`Waiting ${Math.ceil(waitTime2/1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime2));
    }

    // Finalize Window 2
    console.log('\n🏁 FINALIZING WINDOW 2\n');
    try {
      const final2 = await apiCall('POST', `/api/competitions/${WINDOW_2_COMPETITION_ID}/finalize`);
      logResult('Test 18: Finalize Window 2', true, {
        leaderboard: final2.leaderboard.map((u: any) => ({
          rank: u.rank,
          wallet: u.userWallet.slice(0, 15) + '...',
          TP: u.tournamentPoints,
        })),
      });
    } catch (error) {
      logResult('Test 18', false, null, String(error));
    }

    // Cumulative TP check
    console.log('\n📈 CUMULATIVE TP VERIFICATION\n');
    try {
      const w1r = await apiCall('GET', `/api/competitions/${WINDOW_1_COMPETITION_ID}/finalize`);
      const w2r = await apiCall('GET', `/api/competitions/${WINDOW_2_COMPETITION_ID}/finalize`);
      const u1w1 = w1r.results.find((r: any) => r.userWallet === TEST_USER);
      const u1w2 = w2r.results.find((r: any) => r.userWallet === TEST_USER);
      logResult('Test 19: User 1 cumulative TP', true, {
        window1TP: u1w1?.tournamentPoints || 0,
        window2TP: u1w2?.tournamentPoints || 0,
        totalTP: u1w2?.userTotalTP || 0,
      });
    } catch (error) {
      logResult('Test 19', false, null, String(error));
    }

    // Summary
    logSection('FINAL TEST SUMMARY');
    const successCount = results.filter(r => r.success).length;
    const totalTests = results.length;
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${successCount} ✅`);
    console.log(`Failed: ${totalTests - successCount} ❌`);
    console.log(`Success Rate: ${((successCount / totalTests) * 100).toFixed(2)}%`);
    console.log(`\nWindow 1 ID: ${WINDOW_1_COMPETITION_ID}`);
    console.log(`Window 2 ID: ${WINDOW_2_COMPETITION_ID}`);

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
  }
}

runTwoWindowTests().catch(console.error);
