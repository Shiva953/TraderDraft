import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { meteoraClient } from '@/lib/meteoraPriceUtils';

const prisma = new PrismaClient();

interface PackValueCalculation {
  totalPacks: number;
  totalMarketValue: number;
  averagePackValue: number;
  packBreakdown: Array<{
    packId: string;
    kols: Array<{
      name: string;
      ticker: string;
      tokenPrice: number;
      tokensInPack: number;
      valueInPack: number;
    }>;
    totalValue: number;
  }>;
}

export async function POST(request: Request) {
  try {
    console.log('🔵 [calculatePackValue] POST endpoint called');
    
    const body = await request.json();
    const { userPrivyWalletAddress } = body;
    
    if (!userPrivyWalletAddress) {
      throw new Error('Missing required parameter: userPrivyWalletAddress');
    }

    console.log(`🟡 [calculatePackValue] Calculating pack value for: ${userPrivyWalletAddress}`);

    // Get user's pack holdings
    const user = await prisma.user.findFirst({
      where: { userPrivyWalletAddress }
    });

    if (!user || !user.packHoldings || user.packHoldings === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalPacks: 0,
          totalMarketValue: 0,
          averagePackValue: 0,
          packBreakdown: []
        }
      }, { status: 200 });
    }

    // Get all KOL tokens with their pool addresses
    const kolsWithTokens = await prisma.trader.findMany({
      where: { 
        period: 'DAILY',
        tokenMintAddress: { not: null },
        poolAddress: { not: null }
      },
      select: {
        name: true,
        ticker: true,
        tokenMintAddress: true,
        poolAddress: true
      }
    });

    console.log(`📊 [calculatePackValue] Found ${kolsWithTokens.length} KOL tokens with pools`);

    // Get current prices for all KOL tokens
    const poolAddresses = kolsWithTokens
      .map(kol => kol.poolAddress)
      .filter((addr): addr is string => addr !== null);

    console.log(`💰 [calculatePackValue] Fetching prices for ${poolAddresses.length} pools`);
    const priceData = await meteoraClient.batchGetTokenPriceData(poolAddresses);

    // Calculate pack value
    const TOKENS_PER_KOL = 40000; // 40K tokens per KOL in each pack
    const KOLS_PER_PACK = 4; // 4 KOLs per pack

    let totalMarketValue = 0; // Total market value for all packs
    const packBreakdown: PackValueCalculation['packBreakdown'] = [];

    // For each pack, we need to simulate what KOLs it might contain
    // Since packs are random, we'll calculate an average value based on all available KOLs
    const totalPacks = user.packHoldings;
    
    // Calculate average value per pack based on all KOL tokens
    let totalValuePerPack = 0;
    let validKols = 0;

    for (const kol of kolsWithTokens) {
      if (!kol.poolAddress) continue;
      
      const priceInfo = priceData.get(kol.poolAddress);
      if (priceInfo) {
        const valueInPack = priceInfo.price * TOKENS_PER_KOL;
        totalValuePerPack += valueInPack;
        validKols++;
      }
    }

    // Calculate average pack value
    const averageValuePerPack = validKols > 0 ? totalValuePerPack / validKols : 0;
    const calculatedTotalMarketValue = averageValuePerPack * totalPacks;

    console.log(`✅ [calculatePackValue] Calculated market value: ${calculatedTotalMarketValue} SOL for ${totalPacks} packs`);

    return NextResponse.json({
      success: true,
      data: {
        totalPacks,
        calculatedTotalMarketValue,
        averagePackValue: averageValuePerPack,
        packBreakdown: [] // Simplified for now - could be expanded to show individual pack details
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [calculatePackValue] Error:', error);
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
