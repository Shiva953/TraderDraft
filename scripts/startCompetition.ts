/**
 * Script to start a new competition
 *
 * Usage:
 *   bun run scripts/startCompetition.ts
 *
 * This will create a new 1-hour competition for testing.
 * For production, the competition will run for the full bi-weekly period.
 */

async function startCompetition() {
  try {
    console.log('🏁 Starting new competition...');

    const response = await fetch('http://localhost:3000/api/competitions/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        console.log('⚠️  Competition already exists:');
        console.log('   Competition ID:', data.competitionId);
        console.log('   Start Date:', new Date(data.startDate).toLocaleString());
        console.log('   End Date:', new Date(data.endDate).toLocaleString());
        return;
      }
      throw new Error(data.error || 'Failed to create competition');
    }

    console.log('✅ Competition started successfully!');
    console.log('   Competition ID:', data.competition.id);
    console.log('   Start Date:', new Date(data.competition.startDate).toLocaleString());
    console.log('   End Date:', new Date(data.competition.endDate).toLocaleString());
    console.log('   Status:', data.competition.status);
    console.log('   TP Pool:', data.competition.tpPool);
    console.log('\n🎮 Competition is now LIVE! Check the frontend to see the banner.');

  } catch (error) {
    console.error('❌ Error starting competition:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  startCompetition();
}

export { startCompetition };
