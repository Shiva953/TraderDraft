import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    console.log(' [getUserPacks] POST endpoint called');
    
    const body = await request.json();
    const { userPrivyWalletAddress } = body;
    
    if (!userPrivyWalletAddress) {
      throw new Error('Missing required parameter: userPrivyWalletAddress');
    }

    console.log(`🟡 [getUserPacks] Fetching user data for: ${userPrivyWalletAddress}`);

    // Find user in database
    const user = await prisma.user.findFirst({
      where: { userPrivyWalletAddress }
    });

    if (!user) {
      console.log('⚠️ [getUserPacks] User not found, returning default values');
      return NextResponse.json({
        success: true,
        data: {
          packHoldings: 0,
          totalValueOfPackHoldings: 0,
          claimedPacks: 0,
          unclaimedPacks: 0,
        }
      }, { status: 200 });
    }

    console.log('✅ [getUserPacks] Found user:', user);

    return NextResponse.json({
      success: true,
      data: {
        packHoldings: user.packHoldings || 0,
        totalValueOfPackHoldings: user.totalValueOfPackHoldings || 0,
        claimedPacks: user.claimedPacks || 0,
        unclaimedPacks: user.unclaimedPacks || 0,
      }
    }, { status: 200 });
  } catch (error) {
    console.error('❌ [getUserPacks] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
