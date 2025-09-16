import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { meteoraClient } from '@/lib/meteoraPriceUtils';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  console.log("🔵 [API] POST /getIndividualKOLData called");

  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Unsupported Media Type. Use application/json.' },
        { status: 415 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'KOL name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    console.log(`🔵 [API] Fetching data for KOL: ${name}`);

    // Fetch trader data across all periods
    const [dailyData, weeklyData, monthlyData] = await Promise.all([
      fetchTraderDataByName(name, 'DAILY'),
      fetchTraderDataByName(name, 'WEEKLY'),
      fetchTraderDataByName(name, 'MONTHLY')
    ]);

    // Check if any data was found
    const hasAnyData = dailyData || weeklyData || monthlyData;
    
    if (!hasAnyData) {
      return NextResponse.json(
        { 
          error: `No data found for KOL: ${name}`,
          suggestion: 'Please check the KOL name and try again'
        },
        { status: 404 }
      );
    }

    // Enrich data with price information
    const enrichedData = {
      name: name,
      daily: dailyData ? await enrichTraderWithPriceData(dailyData) : null,
      weekly: weeklyData ? await enrichTraderWithPriceData(weeklyData) : null,
      monthly: monthlyData ? await enrichTraderWithPriceData(monthlyData) : null
    };

    const response = {
      ok: true,
      message: `KOL data retrieved successfully for ${name}`,
      timestamp: new Date().toISOString(),
      data: enrichedData
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ [API] POST getIndividualKOLData error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        details: String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
    console.log("🔵 [API] Request completed");
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json(
      { error: 'KOL name is required as query parameter' },
      { status: 400 }
    );
  }

  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });

  return POST(mockRequest);
}

// Function to fetch trader data by name for a specific period
async function fetchTraderDataByName(name: string, period: 'DAILY' | 'WEEKLY' | 'MONTHLY') {
  try {
    console.log(`🔍 [DB] Fetching ${period} data for trader: ${name}`);
    
    const trader = await prisma.trader.findFirst({
      where: { 
        name: {
          equals: name,
          mode: 'insensitive' // Case-insensitive search
        },
        period: period
      },
      select: {
        id: true,
        rank: true,
        name: true,
        address: true,
        pnl: true,
        winRate: true,
        avatarUrl: true,
        xUrl: true,
        tokenMintAddress: true,
        poolAddress: true,
        period: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!trader) {
      console.log(`⚠️ [DB] No ${period} data found for trader: ${name}`);
      return null;
    }

    console.log(`✅ [DB] Found ${period} data for trader: ${name}`);
    return trader;
  } catch (error) {
    console.error(`❌ Error fetching ${period} data for ${name}:`, error);
    return null;
  }
}

// Function to enrich trader data with price information
async function enrichTraderWithPriceData(trader: any) {
  if (!trader.poolAddress) {
    console.log(`⚠️ [PRICE] No pool address for trader: ${trader.name}`);
    return {
      ...trader,
      tokenPrice: undefined,
      priceChange24h: undefined,
      priceChange24hPercent: undefined
    };
  }

  try {
    console.log(`💰 [PRICE] Fetching price data for trader: ${trader.name}`);
    
    const priceDataMap = await meteoraClient.batchGetTokenPriceData([trader.poolAddress]);
    const priceData = priceDataMap.get(trader.poolAddress);
    
    if (!priceData) {
      console.log(`⚠️ [PRICE] No price data found for pool ${trader.poolAddress}`);
      return {
        ...trader,
        tokenPrice: undefined,
        priceChange24h: undefined,
        priceChange24hPercent: undefined
      };
    }

    console.log(`✅ [PRICE] Retrieved price data for trader: ${trader.name}`);
    return {
      ...trader,
      tokenPrice: priceData.price.toFixed(6),
      priceChange24h: priceData.priceChange24h.toFixed(6),
      priceChange24hPercent: priceData.priceChange24hPercent
    };
  } catch (error) {
    console.error(`❌ [PRICE] Error fetching price data for ${trader.name}:`, error);
    return {
      ...trader,
      tokenPrice: undefined,
      priceChange24h: undefined,
      priceChange24hPercent: undefined
    };
  }
}
