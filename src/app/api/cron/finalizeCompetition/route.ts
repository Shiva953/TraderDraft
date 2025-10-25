import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAppUrl } from '@/lib/utils';

const prisma = new PrismaClient();

/**
 * Cron job to automatically finalize competitions
 *
 * Schedule: Sundays and Wednesdays at noon UTC (0 12 * * 0,3)
 *
 * This checks for competitions that have ended and need finalization,
 * then calls the finalize endpoint for each one.
 */
export async function GET(request: NextRequest) {
  console.log("🕐 [CRON] Finalize competition triggered");

  try {
    // Verify cron secret if provided (recommended for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("❌ [CRON] Unauthorized: Invalid or missing cron secret");
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find competitions that have ended but not yet finalized
    const competitionsToFinalize = await prisma.competition.findMany({
      where: {
        status: 'ENDED',
        endDate: {
          lte: new Date() // End date has passed
        }
      },
      select: {
        id: true,
        startDate: true,
        endDate: true
      }
    });

    if (competitionsToFinalize.length === 0) {
      console.log('[CRON] No competitions to finalize');
      return NextResponse.json({
        ok: true,
        message: 'No competitions to finalize',
        processed: 0,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[CRON] Found ${competitionsToFinalize.length} competition(s) to finalize`);

    const results = [];

    // Finalize each competition
    for (const competition of competitionsToFinalize) {
      try {
        console.log(`[CRON] Finalizing competition ${competition.id}`);

        const finalizeUrl = `${getAppUrl()}/api/competitions/${competition.id}/finalize`;
        const response = await fetch(finalizeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (response.ok) {
          results.push({
            competitionId: competition.id,
            success: true,
            data
          });
          console.log(`[CRON] ✅ Successfully finalized competition ${competition.id}`);
        } else {
          results.push({
            competitionId: competition.id,
            success: false,
            error: data
          });
          console.error(`[CRON] ❌ Failed to finalize competition ${competition.id}:`, data);
        }
      } catch (error) {
        results.push({
          competitionId: competition.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`[CRON] ❌ Error finalizing competition ${competition.id}:`, error);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[CRON] Finalization completed: ${successCount} succeeded, ${failCount} failed`);

    return NextResponse.json({
      ok: true,
      message: 'Competition finalization completed',
      processed: competitionsToFinalize.length,
      succeeded: successCount,
      failed: failCount,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [CRON] Error executing competition finalization:', error);
    return NextResponse.json({
      error: 'Cron job failed',
      details: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
