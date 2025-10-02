// app/api/competitions/[id]/end/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const competitionId = params.id;

    // Check if competition exists and is ACTIVE
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    if (competition.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Competition is already ${competition.status}` },
        { status: 400 }
      );
    }

    // Update status to ENDED
    const updatedCompetition = await prisma.competition.update({
      where: { id: competitionId },
      data: { status: 'ENDED' },
    });

    return NextResponse.json({
      success: true,
      competition: {
        id: updatedCompetition.id,
        status: updatedCompetition.status,
        endDate: updatedCompetition.endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error ending competition:', error);
    return NextResponse.json(
      { error: 'Failed to end competition' },
      { status: 500 }
    );
  }
}