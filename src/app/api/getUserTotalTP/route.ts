import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWallet = searchParams.get('userWallet');

    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet query parameter is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { userPrivyWalletAddress: userWallet },
      select: {
        totalTournamentPoints: true
      }
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        totalTP: 0,
        message: 'User not found'
      });
    }

    return NextResponse.json({
      success: true,
      totalTP: parseFloat(user.totalTournamentPoints.toString())
    });

  } catch (error) {
    console.error('Error fetching user total TP:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user total TP' },
      { status: 500 }
    );
  }
}
