import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

/**
 * Get Current Phase API
 *
 * Returns the current application phase for frontend state management.
 * Frontend polls this endpoint every 30 seconds to update UI accordingly.
 *
 * Phases:
 * - PACK_SALE: Users can buy packs
 * - PACK_REVEAL: Users can reveal bought packs
 * - COMPETITION_ACTIVE: Competition is running
 * - COMPETITION_RESULTS: Competition ended, viewing results
 * - WAITING_FOR_NEXT_COMPETITION: Cooldown period
 * - INITIALIZING: No phase set yet (waiting for first cron run)
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();

    // Get current app phase
    const appPhase = await prisma.appPhase.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    // No phase initialized yet
    if (!appPhase) {
      return NextResponse.json({
        success: true,
        phase: 'INITIALIZING',
        message: 'Application initializing - waiting for first cron run'
      });
    }

    // Handle different phases
    switch (appPhase.currentPhase) {
      case 'PACK_SALE': {
        if (!appPhase.packSaleEndsAt) {
          return NextResponse.json({
            success: true,
            phase: 'PACK_SALE',
            message: 'Pack sale is live!',
            phaseStartedAt: appPhase.phaseStartedAt.toISOString()
          });
        }

        const timeRemaining = Math.max(0, appPhase.packSaleEndsAt.getTime() - now.getTime());
        const endsIn = {
          days: Math.floor(timeRemaining / (1000 * 60 * 60 * 24)),
          hours: Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((timeRemaining % (1000 * 60)) / 1000)
        };

        return NextResponse.json({
          success: true,
          phase: 'PACK_SALE',
          message: 'Pack sale is live! Buy packs now!',
          phaseStartedAt: appPhase.phaseStartedAt.toISOString(),
          endsAt: appPhase.packSaleEndsAt.toISOString(),
          timeRemainingMs: timeRemaining,
          endsIn
        });
      }

      case 'PACK_REVEAL': {
        if (!appPhase.revealEndsAt) {
          return NextResponse.json({
            success: true,
            phase: 'PACK_REVEAL',
            message: 'Pack reveal is live!',
            phaseStartedAt: appPhase.phaseStartedAt.toISOString()
          });
        }

        const timeRemaining = Math.max(0, appPhase.revealEndsAt.getTime() - now.getTime());
        const endsIn = {
          days: Math.floor(timeRemaining / (1000 * 60 * 60 * 24)),
          hours: Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((timeRemaining % (1000 * 60)) / 1000)
        };

        return NextResponse.json({
          success: true,
          phase: 'PACK_REVEAL',
          message: 'Pack reveal is live! Open your packs now!',
          phaseStartedAt: appPhase.phaseStartedAt.toISOString(),
          endsAt: appPhase.revealEndsAt.toISOString(),
          timeRemainingMs: timeRemaining,
          endsIn
        });
      }

      case 'COMPETITION_LOOP': {
        // Check for active competition
        const activeCompetition = await prisma.competition.findFirst({
          where: {
            status: 'ACTIVE'
          },
          orderBy: {
            startDate: 'desc'
          }
        });

        if (activeCompetition) {
          const timeRemaining = Math.max(0, activeCompetition.endDate.getTime() - now.getTime());
          const endsIn = {
            days: Math.floor(timeRemaining / (1000 * 60 * 60 * 24)),
            hours: Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((timeRemaining % (1000 * 60)) / 1000)
          };

          return NextResponse.json({
            success: true,
            phase: 'COMPETITION_ACTIVE',
            message: 'Competition is live! Trade KOL tokens now!',
            competition: {
              id: activeCompetition.id,
              startDate: activeCompetition.startDate.toISOString(),
              endDate: activeCompetition.endDate.toISOString(),
              status: activeCompetition.status,
              tpPool: activeCompetition.tpPool.toString()
            },
            timeRemainingMs: timeRemaining,
            endsIn
          });
        }

        // Check for finalized competition (results phase)
        const finalizedCompetition = await prisma.competition.findFirst({
          where: {
            status: 'FINALIZED'
          },
          orderBy: {
            endDate: 'desc'
          }
        });

        if (finalizedCompetition) {
          const cooldownEnd = new Date(finalizedCompetition.endDate);
          cooldownEnd.setHours(cooldownEnd.getHours() + 12); // 12h cooldown

          if (now < cooldownEnd) {
            const timeRemaining = Math.max(0, cooldownEnd.getTime() - now.getTime());
            const nextCompetitionIn = {
              hours: Math.floor(timeRemaining / (1000 * 60 * 60)),
              minutes: Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)),
              seconds: Math.floor((timeRemaining % (1000 * 60)) / 1000)
            };

            return NextResponse.json({
              success: true,
              phase: 'COMPETITION_RESULTS',
              message: 'Competition ended! View results and claim rewards!',
              competition: {
                id: finalizedCompetition.id,
                startDate: finalizedCompetition.startDate.toISOString(),
                endDate: finalizedCompetition.endDate.toISOString(),
                status: finalizedCompetition.status,
                tpPool: finalizedCompetition.tpPool.toString()
              },
              nextCompetitionAt: cooldownEnd.toISOString(),
              timeUntilNextMs: timeRemaining,
              nextCompetitionIn
            });
          }
        }

        // No active or recent competition - waiting for next one
        return NextResponse.json({
          success: true,
          phase: 'WAITING_FOR_NEXT_COMPETITION',
          message: 'Next competition starting soon!',
          schedule: {
            description: 'Bi-weekly competitions',
            windows: [
              'Monday 00:00 UTC → Wednesday 12:00 UTC',
              'Thursday 00:00 UTC → Saturday 12:00 UTC'
            ]
          }
        });
      }

      default: {
        return NextResponse.json({
          success: false,
          error: 'Unknown phase',
          currentPhase: appPhase.currentPhase
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('Error fetching current phase:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch current phase',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
