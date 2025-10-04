import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const finalizedCompetitions = await prisma.competition.findMany({
      where: {
        status: 'FINALIZED'
      },
      orderBy: {
        endDate: 'desc'
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        tpPool: true
      }
    });

    const formattedCompetitions = finalizedCompetitions.map(comp => ({
      id: comp.id,
      startDate: comp.startDate.toISOString(),
      endDate: comp.endDate.toISOString(),
      status: comp.status,
      tpPool: comp.tpPool.toString()
    }));

    return NextResponse.json({
      success: true,
      competitions: formattedCompetitions
    });

  } catch (error) {
    console.error('Error fetching finalized competitions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch finalized competitions' },
      { status: 500 }
    );
  }
}
