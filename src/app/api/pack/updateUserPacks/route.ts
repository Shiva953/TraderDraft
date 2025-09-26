import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    console.log('🔵 [updateUserPacks] POST endpoint called');
    
    const body = await request.json();
    console.log('🟢 [updateUserPacks] Request body:', body);
    const { userPrivyWalletAddress, packsBought, totalValue, transactionHash } = body;
    
    if (!userPrivyWalletAddress || packsBought === undefined || totalValue === undefined) {
      throw new Error('Missing required parameters: userPrivyWalletAddress, packsBought, and totalValue');
    }

    console.log(`🟡 [updateUserPacks] Updating user: ${userPrivyWalletAddress} with ${packsBought} packs worth ${totalValue} SOL`);

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { userPrivyWalletAddress }
    });

    let userId: number;

    if (existingUser) {
      // Update existing user
      
      const totalValueOfPackHoldings = (existingUser.packHoldings! * 0.1) + (packsBought*0.1);
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          packHoldings: (existingUser.packHoldings || 0) + packsBought,
          totalValueOfPackHoldings: totalValueOfPackHoldings,
          unclaimedPacks: (existingUser.unclaimedPacks || 0) + packsBought,
        }
      });
      userId = updatedUser.id;
      console.log('✅ [updateUserPacks] Updated existing user:', updatedUser);
    } else {
      // Create new user
      // this has to be moved inside privy wallet creation api endpoint, ONLY UPDATING THE PACKS FIELD SHOULD HAPPEN HERE
      const newUser = await prisma.user.create({
        data: {
          userPrivyWalletAddress,
          packHoldings: packsBought,
          totalValueOfPackHoldings: totalValue,
          unclaimedPacks: packsBought,
          claimedPacks: 0,
        }
      });
      userId = newUser.id;
      console.log('✅ [updateUserPacks] Created new user:', newUser);
    }

    // Create order record
    const order = await prisma.order.create({
      data: {
        userPrivyWalletAddress,
        userId,
        packsBought,
        totalValue,
        transactionHash: transactionHash || null,
      }
    });
    console.log('✅ [updateUserPacks] Created order record:', order);

    return NextResponse.json({
      success: true,
      message: 'User packs updated successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('❌ [updateUserPacks] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
