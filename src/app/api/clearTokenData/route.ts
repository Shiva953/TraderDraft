import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  console.log("🗑️ [API] POST /clearTokenData invoked");

  try {
    // Clear ONLY tokenMintAddress, poolAddress, and ticker columns
    // Does NOT touch any other data (name, rank, pnl, winRate, rarity, etc.)
    const result = await prisma.trader.updateMany({
      data: {
        tokenMintAddress: null,
        poolAddress: null,
        ticker: null
      }
    });

    console.log(`✅ [CLEAR] Cleared token data for ${result.count} traders`);

    return NextResponse.json({
      success: true,
      message: `Successfully cleared token data (tokenMintAddress, poolAddress, ticker) for ${result.count} traders`,
      clearedCount: result.count
    }, { status: 200 });

  } catch (error) {
    console.error("❌ [API] Clear token data error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  } finally {
    console.log("🔌 [DB] Disconnecting Prisma client");
    await prisma.$disconnect();
  }
}
