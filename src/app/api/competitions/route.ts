// app/api/competitions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const competitions = await prisma.competition.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'ENDED'], // Only non-finalized
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      competitions: competitions.map(comp => ({
        id: comp.id,
        startDate: comp.startDate.toISOString(),
        endDate: comp.endDate.toISOString(),
        status: comp.status,
        tpPool: comp.tpPool.toString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching competitions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitions' },
      { status: 500 }
    );
  }
}