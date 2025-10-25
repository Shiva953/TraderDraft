import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

/**
 * Phase Manager Cron Job
 *
 * Schedule: Every 1 minute (or every 5 minutes - adjust based on pack sale duration)
 *
 * Manages the ONE-TIME pack sale and reveal phases before starting competition loop:
 * 1. PACK_SALE (X minutes) - Users buy packs
 * 2. PACK_REVEAL (Y minutes) - Users reveal packs
 * 3. COMPETITION_LOOP - Start recurring competitions (handled by startCompetition cron)
 *
 * Environment Variables:
 * - PACK_SALE_DURATION_MINUTES: Duration of pack sale phase (default: 10080 = 7 days)
 * - PACK_REVEAL_DURATION_MINUTES: Duration of pack reveal phase (default: 4320 = 3 days)
 */
export async function GET(request: NextRequest) {
  console.log("🕐 [CRON] Phase manager triggered");

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

    const now = new Date();

    // Get current phase
    const currentPhase = await prisma.appPhase.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    // INITIALIZATION: No phase exists yet - create PACK_SALE phase
    if (!currentPhase) {
      console.log('🎬 [PHASE] No phase found - initializing PACK_SALE phase');

      // Get durations from env (default: 7 days pack sale, 3 days reveal)
      const packSaleDurationMinutes = parseInt(process.env.PACK_SALE_DURATION_MINUTES || '10080'); // 7 days
      const packRevealDurationMinutes = parseInt(process.env.PACK_REVEAL_DURATION_MINUTES || '4320'); // 3 days

      const packSaleEndsAt = new Date(now.getTime() + packSaleDurationMinutes * 60 * 1000);

      const newPhase = await prisma.appPhase.create({
        data: {
          currentPhase: 'PACK_SALE',
          phaseStartedAt: now,
          packSaleEndsAt,
          revealEndsAt: null
        }
      });

      console.log('✅ [PHASE] PACK_SALE phase created:', {
        startsAt: now.toISOString(),
        endsAt: packSaleEndsAt.toISOString(),
        durationMinutes: packSaleDurationMinutes
      });

      return NextResponse.json({
        ok: true,
        action: 'initialized',
        phase: 'PACK_SALE',
        packSaleEndsAt: packSaleEndsAt.toISOString(),
        message: 'Pack sale phase initialized',
        timestamp: now.toISOString()
      });
    }

    // Handle phase transitions
    switch (currentPhase.currentPhase) {
      case 'PACK_SALE': {
        // Check if pack sale has ended
        if (currentPhase.packSaleEndsAt && now >= currentPhase.packSaleEndsAt) {
          console.log('🔄 [PHASE] PACK_SALE ended - transitioning to PACK_REVEAL');

          const packRevealDurationMinutes = parseInt(process.env.PACK_REVEAL_DURATION_MINUTES || '4320'); // 3 days
          const revealEndsAt = new Date(now.getTime() + packRevealDurationMinutes * 60 * 1000);

          const updatedPhase = await prisma.appPhase.create({
            data: {
              currentPhase: 'PACK_REVEAL',
              phaseStartedAt: now,
              packSaleEndsAt: null,
              revealEndsAt
            }
          });

          console.log('✅ [PHASE] PACK_REVEAL phase started:', {
            startsAt: now.toISOString(),
            endsAt: revealEndsAt.toISOString(),
            durationMinutes: packRevealDurationMinutes
          });

          return NextResponse.json({
            ok: true,
            action: 'transitioned',
            fromPhase: 'PACK_SALE',
            toPhase: 'PACK_REVEAL',
            revealEndsAt: revealEndsAt.toISOString(),
            message: 'Transitioned to pack reveal phase',
            timestamp: now.toISOString()
          });
        }

        console.log('⏳ [PHASE] PACK_SALE still active - waiting for end time');
        return NextResponse.json({
          ok: true,
          action: 'no_change',
          phase: 'PACK_SALE',
          endsAt: currentPhase.packSaleEndsAt?.toISOString(),
          message: 'Pack sale phase still active',
          timestamp: now.toISOString()
        });
      }

      case 'PACK_REVEAL': {
        // Check if pack reveal has ended
        if (currentPhase.revealEndsAt && now >= currentPhase.revealEndsAt) {
          console.log('🔄 [PHASE] PACK_REVEAL ended - transitioning to COMPETITION_LOOP');

          const updatedPhase = await prisma.appPhase.create({
            data: {
              currentPhase: 'COMPETITION_LOOP',
              phaseStartedAt: now,
              packSaleEndsAt: null,
              revealEndsAt: null
            }
          });

          console.log('✅ [PHASE] COMPETITION_LOOP phase started - competitions will now be managed by startCompetition cron');

          return NextResponse.json({
            ok: true,
            action: 'transitioned',
            fromPhase: 'PACK_REVEAL',
            toPhase: 'COMPETITION_LOOP',
            message: 'Transitioned to competition loop - competitions can now start',
            timestamp: now.toISOString()
          });
        }

        console.log('⏳ [PHASE] PACK_REVEAL still active - waiting for end time');
        return NextResponse.json({
          ok: true,
          action: 'no_change',
          phase: 'PACK_REVEAL',
          endsAt: currentPhase.revealEndsAt?.toISOString(),
          message: 'Pack reveal phase still active',
          timestamp: now.toISOString()
        });
      }

      case 'COMPETITION_LOOP': {
        // Phase management complete - competitions are now handled by startCompetition cron
        console.log('✅ [PHASE] In COMPETITION_LOOP - phase management complete');
        return NextResponse.json({
          ok: true,
          action: 'no_change',
          phase: 'COMPETITION_LOOP',
          message: 'In competition loop - competitions managed by startCompetition cron',
          timestamp: now.toISOString()
        });
      }

      default: {
        console.error('❌ [PHASE] Unknown phase:', currentPhase.currentPhase);
        return NextResponse.json({
          ok: false,
          error: 'Unknown phase',
          phase: currentPhase.currentPhase,
          timestamp: now.toISOString()
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('❌ [CRON] Error executing phase manager:', error);
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
