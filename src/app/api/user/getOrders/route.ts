import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    console.log('🔵 [getOrders] POST endpoint called');
    
    const body = await request.json();
    const { userPrivyWalletAddress } = body;
    
    if (!userPrivyWalletAddress) {
      throw new Error('Missing required parameter: userPrivyWalletAddress');
    }

    console.log(`🟡 [getOrders] Fetching orders for: ${userPrivyWalletAddress}`);

    // Find orders for user, ordered by most recent first
    const orders = await prisma.order.findMany({
      where: { userPrivyWalletAddress },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`✅ [getOrders] Found ${orders.length} orders`);

    return NextResponse.json({
      success: true,
      data: orders,
    }, { status: 200 });
  } catch (error) {
    console.error('❌ [getOrders] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
