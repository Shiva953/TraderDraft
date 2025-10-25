import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/utils';
import prisma from '@/lib/prisma';

/**
 * Cron job to automatically start competitions
 *
 * Schedule: Mondays and Thursdays at midnight UTC (0 0 * * 1,4)
 *
 * This wraps the existing /api/competitions/start endpoint for Vercel Cron compatibility.
 *
 * IMPORTANT: Only runs during COMPETITION_LOOP phase (after PACK_SALE and PACK_REVEAL)
 */
export async function GET(request: NextRequest) {
  console.log("🕐 [CRON] Start competition triggered");

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

    // Check current phase - ONLY run during COMPETITION_LOOP
    const currentPhase = await prisma.appPhase.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!currentPhase || currentPhase.currentPhase !== 'COMPETITION_LOOP') {
      console.log(`⏭️  [CRON] Skipping - not in COMPETITION_LOOP phase (current: ${currentPhase?.currentPhase || 'none'})`);
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: `Not in COMPETITION_LOOP phase (current: ${currentPhase?.currentPhase || 'none'})`,
        message: 'Competition start skipped - waiting for COMPETITION_LOOP phase',
        timestamp: new Date().toISOString()
      });
    }

    // Call the existing competition start endpoint
    const startUrl = `${getAppUrl()}/api/competitions/start`;
    console.log(`🔄 [CRON] Calling ${startUrl}`);

    const response = await fetch(startUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Competition start failed: ${JSON.stringify(data)}`);
    }

    console.log("✅ [CRON] Competition start completed successfully");

    return NextResponse.json({
      ok: true,
      message: 'Competition start executed successfully',
      result: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [CRON] Error starting competition:', error);
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
