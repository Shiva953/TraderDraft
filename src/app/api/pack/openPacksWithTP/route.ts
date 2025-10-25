import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export interface OpenPacksWithTPRequest {
  userWallet: string;
  packType: 'PRO' | 'EPIC' | 'LEGENDARY';
  numberOfPacks: number;
}

const PACK_PRICES = {
  PRO: 125,
  EPIC: 500,
  LEGENDARY: 2000
} as const;

export async function POST(request: Request) {
  console.log('🎁 [API] /openPacksWithTP called at', new Date().toISOString());

  try {
    const body: OpenPacksWithTPRequest = await request.json();
    const { userWallet, packType, numberOfPacks } = body;

    if (!userWallet) {
      return NextResponse.json(
        { success: false, error: 'userWallet is required' },
        { status: 400 }
      );
    }

    if (!packType || !['PRO', 'EPIC', 'LEGENDARY'].includes(packType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid pack type' },
        { status: 400 }
      );
    }

    if (!numberOfPacks || numberOfPacks < 1) {
      return NextResponse.json(
        { success: false, error: 'numberOfPacks must be at least 1' },
        { status: 400 }
      );
    }

    // Get user's current TP and claimedPacks
    const user = await prisma.user.findUnique({
      where: { userPrivyWalletAddress: userWallet },
      select: {
        id: true,
        totalTournamentPoints: true,
        claimedPacks: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const currentTP = parseFloat(user.totalTournamentPoints.toString());
    const packPrice = PACK_PRICES[packType];
    const totalCost = packPrice * numberOfPacks;

    console.log(`🎁 User ${userWallet} attempting to open ${numberOfPacks} ${packType} pack(s)`);
    console.log(`💰 Current TP: ${currentTP}, Total Cost: ${totalCost}`);

    // Check if user has enough TP
    if (currentTP < totalCost) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient Tournament Points',
          currentTP,
          required: totalCost
        },
        { status: 400 }
      );
    }

    // Deduct TP from user AND increment claimedPacks count
    // IMPORTANT: Handle NULL claimedPacks by ensuring it's initialized first
    const currentClaimedPacks = user.claimedPacks || 0;
    const updatedUser = await prisma.user.update({
      where: { userPrivyWalletAddress: userWallet },
      data: {
        totalTournamentPoints: {
          decrement: totalCost
        },
        claimedPacks: currentClaimedPacks + numberOfPacks // ← Direct set instead of increment to handle NULL
      },
      select: {
        totalTournamentPoints: true,
        claimedPacks: true
      }
    });

    const newTP = parseFloat(updatedUser.totalTournamentPoints.toString());
    const newClaimedPacks = updatedUser.claimedPacks || 0;

    console.log(`✅ Successfully deducted ${totalCost} TP from user. New balance: ${newTP}`);
    console.log(`✅ Incremented claimedPacks by ${numberOfPacks}. New count: ${newClaimedPacks}`);

    return NextResponse.json({
      success: true,
      message: `Successfully opened ${numberOfPacks} ${packType} pack(s)`,
      data: {
        packType,
        numberOfPacks,
        totalCost,
        previousTP: currentTP,
        newTP,
        deducted: totalCost,
        claimedPacks: newClaimedPacks
      }
    });

  } catch (error) {
    console.error('❌ Error in openPacksWithTP:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
