import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    console.log('🔵 [resetUserPackHoldings] POST endpoint called');
    
    const body = await request.json();
    const { userPrivyWalletAddress } = body;
    
    if (!userPrivyWalletAddress) {
      throw new Error('Missing required parameter: userPrivyWalletAddress');
    }

    console.log(`�� [resetUserPackHoldings] Resetting pack holdings for user: ${userPrivyWalletAddress}`);

    // Find user and reset pack holdings to 0
    const existingUser = await prisma.user.findFirst({
      where: { userPrivyWalletAddress }
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Reset pack holdings to 0 and update claimed packs
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        packHoldings: 0,
        totalValueOfPackHoldings: 0,
        claimedPacks: (existingUser.claimedPacks || 0) + (existingUser.packHoldings || 0),
        unclaimedPacks: 0,
      }
    });

    console.log('✅ [resetUserPackHoldings] Reset pack holdings for user:', updatedUser);

    return NextResponse.json({
      success: true,
      message: 'User pack holdings reset successfully',
      data: {
        packHoldings: updatedUser.packHoldings,
        totalValueOfPackHoldings: updatedUser.totalValueOfPackHoldings,
        claimedPacks: updatedUser.claimedPacks,
        unclaimedPacks: updatedUser.unclaimedPacks,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [resetUserPackHoldings] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
