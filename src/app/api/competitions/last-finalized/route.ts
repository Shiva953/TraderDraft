import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const lastFinalizedCompetition = await prisma.competition.findFirst({
      where: {
        status: 'FINALIZED'
      },
      orderBy: {
        endDate: 'desc'
      }
    });

    if (!lastFinalizedCompetition) {
      return NextResponse.json({
        success: true,
        competition: null,
        message: 'No finalized competition found'
      });
    }

    return NextResponse.json({
      success: true,
      competition: {
        id: lastFinalizedCompetition.id,
        startDate: lastFinalizedCompetition.startDate.toISOString(),
        endDate: lastFinalizedCompetition.endDate.toISOString(),
        status: lastFinalizedCompetition.status,
        tpPool: lastFinalizedCompetition.tpPool.toString()
      }
    });

  } catch (error) {
    console.error('Error fetching last finalized competition:', error);
    return NextResponse.json(
      { error: 'Failed to fetch last finalized competition' },
      { status: 500 }
    );
  }
}
