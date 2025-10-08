/**
 * Test Mode API - Frontend-driven competition testing
 * Allows founders to test competitions with accelerated timeline via UI
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { getAppUrl } from '@/lib/utils';

// Test mode configuration
const TEST_COMPETITION_DURATION = 10 * 60 * 1000; // 10 minutes
const TEST_SNAPSHOT_INTERVAL = 2 * 60 * 1000; // 2 minutes
const POST_FINALIZATION_GAP = 1.5 * 60 * 1000; // 1.5 minutes

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    const host = request.headers.get('host') || undefined;

    switch (action) {
      case 'start':
        return await startTestCompetition(host);

      case 'snapshot':
        return await takeTestSnapshot(host);

      case 'finalize':
        return await finalizeTestCompetition(host);

      case 'status':
        return await getTestStatus();

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[TEST-MODE] Error:', error);
    return NextResponse.json(
      { error: 'Test mode error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return await getTestStatus();
}

async function startTestCompetition(host?: string) {
  const now = new Date();

  // Check for existing active competition
  const activeCompetition = await prisma.competition.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' }
  });

  if (activeCompetition) {
    return NextResponse.json(
      {
        error: 'Active competition already exists',
        competition: {
          id: activeCompetition.id,
          startDate: activeCompetition.startDate.toISOString(),
          endDate: activeCompetition.endDate.toISOString(),
          status: activeCompetition.status
        }
      },
      { status: 409 }
    );
  }

  // Check if we need to wait after last finalization
  const lastFinalized = await prisma.competition.findFirst({
    where: { status: 'FINALIZED' },
    orderBy: { updatedAt: 'desc' }
  });

  if (lastFinalized) {
    const timeSinceFinalization = now.getTime() - lastFinalized.updatedAt.getTime();
    if (timeSinceFinalization < POST_FINALIZATION_GAP) {
      const remainingMs = POST_FINALIZATION_GAP - timeSinceFinalization;
      return NextResponse.json({
        error: 'Waiting for gap period',
        remainingMs,
        message: `Please wait ${Math.ceil(remainingMs / 1000)}s before starting next competition`
      }, { status: 425 }); // Too Early
    }
  }

  // Create test competition
  const startDate = new Date(now);
  const endDate = new Date(now.getTime() + TEST_COMPETITION_DURATION);

  const competition = await prisma.competition.create({
    data: {
      startDate,
      endDate,
      status: 'ACTIVE',
      tpPool: 10000,
    }
  });

  console.log(`🧪 [TEST-MODE] Competition started: ${competition.id}`);

  // Take immediate first snapshot
  setTimeout(async () => {
    await fetch(`${getAppUrl(host)}/api/cron/calculateDailyScores`, {
      method: 'POST',
    });
  }, 1000);

  return NextResponse.json({
    success: true,
    action: 'started',
    competition: {
      id: competition.id,
      startDate: competition.startDate.toISOString(),
      endDate: competition.endDate.toISOString(),
      status: competition.status,
      durationMs: TEST_COMPETITION_DURATION,
      snapshotIntervalMs: TEST_SNAPSHOT_INTERVAL
    }
  });
}

async function takeTestSnapshot(host?: string) {
  const activeCompetition = await prisma.competition.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' }
  });

  if (!activeCompetition) {
    return NextResponse.json(
      { error: 'No active competition found' },
      { status: 404 }
    );
  }

  try {
    // Call the daily score calculation endpoint
    const url = `${getAppUrl(host)}/api/cron/calculateDailyScores`;
    console.log('[TEST-MODE] Calling snapshot URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TEST-MODE] Snapshot failed:', response.status, errorText);
      throw new Error(`Snapshot API returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      action: 'snapshot',
      competitionId: activeCompetition.id,
      result: data
    });
  } catch (error) {
    console.error('[TEST-MODE] Snapshot error:', error);
    return NextResponse.json({
      error: 'Snapshot failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

async function finalizeTestCompetition(host?: string) {
  const activeCompetition = await prisma.competition.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' }
  });

  if (!activeCompetition) {
    return NextResponse.json(
      { error: 'No active competition found' },
      { status: 404 }
    );
  }

  try {
    // Call finalize endpoint
    const url = `${getAppUrl(host)}/api/competitions/${activeCompetition.id}/finalize`;
    console.log('[TEST-MODE] Calling finalize URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TEST-MODE] Finalize failed:', response.status, errorText);
      throw new Error(`Finalize API returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      action: 'finalized',
      competitionId: activeCompetition.id,
      result: data
    });
  } catch (error) {
    console.error('[TEST-MODE] Finalize error:', error);
    return NextResponse.json({
      error: 'Finalization failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

async function getTestStatus() {
  const activeCompetition = await prisma.competition.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' }
  });

  const lastFinalized = await prisma.competition.findFirst({
    where: { status: 'FINALIZED' },
    orderBy: { updatedAt: 'desc' }
  });

  const now = new Date();
  let timeUntilNextAllowed = 0;

  if (lastFinalized && !activeCompetition) {
    const timeSinceFinalization = now.getTime() - lastFinalized.updatedAt.getTime();
    if (timeSinceFinalization < POST_FINALIZATION_GAP) {
      timeUntilNextAllowed = POST_FINALIZATION_GAP - timeSinceFinalization;
    }
  }

  return NextResponse.json({
    hasActive: !!activeCompetition,
    competition: activeCompetition ? {
      id: activeCompetition.id,
      startDate: activeCompetition.startDate.toISOString(),
      endDate: activeCompetition.endDate.toISOString(),
      status: activeCompetition.status,
      timeRemaining: Math.max(0, activeCompetition.endDate.getTime() - now.getTime())
    } : null,
    lastFinalized: lastFinalized ? {
      id: lastFinalized.id,
      endDate: lastFinalized.endDate.toISOString(),
      finalizedAt: lastFinalized.updatedAt.toISOString()
    } : null,
    timeUntilNextAllowed,
    config: {
      competitionDurationMs: TEST_COMPETITION_DURATION,
      snapshotIntervalMs: TEST_SNAPSHOT_INTERVAL,
      postFinalizationGapMs: POST_FINALIZATION_GAP
    }
  });
}
