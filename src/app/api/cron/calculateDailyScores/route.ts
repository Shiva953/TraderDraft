import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAppUrl } from '@/lib/utils';

const prisma = new PrismaClient();

/**
 * Cron job to calculate daily scores for all active competitions
 *
 * For production (4-day window): Schedule to run daily at 14:00 UTC (2 PM UTC)
 * For testing (1-hour window): Manually trigger every 15 minutes
 *
 * Manual trigger:
 * POST http://localhost:3000/api/cron/calculateDailyScores
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[CRON] Starting daily score calculation for all active competitions');

    // Get all active competitions
    const activeCompetitions = await prisma.competition.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: new Date() // Still within competition window
        }
      },
      select: {
        id: true,
        startDate: true,
        endDate: true
      }
    });

    if (activeCompetitions.length === 0) {
      console.log('[CRON] No active competitions found');
      return NextResponse.json({
        success: true,
        message: 'No active competitions to process',
        processed: 0
      });
    }

    console.log(`[CRON] Found ${activeCompetitions.length} active competition(s)`);

    const results = [];

    // Calculate daily scores for each active competition
    for (const competition of activeCompetitions) {
      try {
        console.log(`[CRON] Processing competition ${competition.id}`);

        // Call the daily score calculation endpoint
        const response = await fetch(`${getAppUrl()}/api/competitions/${competition.id}/dailyUserScore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            competitionId: competition.id,
            success: true,
            data
          });
          console.log(`[CRON] ✅ Successfully calculated scores for competition ${competition.id}`);
        } else {
          const error = await response.text();
          results.push({
            competitionId: competition.id,
            success: false,
            error
          });
          console.error(`[CRON] ❌ Failed to calculate scores for competition ${competition.id}:`, error);
        }
      } catch (error) {
        results.push({
          competitionId: competition.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`[CRON] ❌ Error processing competition ${competition.id}:`, error);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[CRON] Daily score calculation completed: ${successCount} succeeded, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      message: 'Daily score calculation completed',
      processed: activeCompetitions.length,
      succeeded: successCount,
      failed: failCount,
      results
    });

  } catch (error) {
    console.error('[CRON] Error in daily score calculation cron:', error);
    return NextResponse.json(
      { error: 'Failed to run daily score calculation' },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  console.log('[CRON] Manual trigger of daily score calculation (GET)');
  return POST(request);
}
