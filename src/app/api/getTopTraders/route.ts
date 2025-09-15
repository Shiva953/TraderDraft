import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { meteoraClient } from '@/lib/meteoraPriceUtils';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  console.log("🔵 [API] POST /getTopTraders called (optimized)");

  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Unsupported Media Type. Use application/json.' },
        { status: 415 }
      );
    }

    const body = await request.json();
    const { period = 'daily', limit = 20, fetchAll = false } = body;

    console.log(`🔵 [API] Fetching ${period} data with limit ${limit} from database`);

    let response;

    // THIS NEEDS TO BE SORTED BY PNL ON THE BACKEND SIDE, NOT THE FRONTEND
    if (fetchAll) {
      // Fetch all periods (for initial load or when explicitly requested)
      const [dailyData, weeklyData, monthlyData] = await Promise.all([
        fetchTradersData('DAILY', limit),
        fetchTradersData('WEEKLY', limit),
        fetchTradersData('MONTHLY', limit)
      ]);

      console.log("🔵 [API] Daily Traders:", dailyData.traders.length);
      console.log("🔵 [API] Weekly Traders:", weeklyData.traders.length);
      console.log("🔵 [API] Monthly Traders:", monthlyData.traders.length);

      let selectedData;
      let periodLabel;

      switch (period.toLowerCase()) {
        case 'weekly':
          selectedData = weeklyData;
          periodLabel = 'Weekly';
          break;
        case 'monthly':
          selectedData = monthlyData;
          periodLabel = 'Monthly';
          break;
        case 'daily':
        default:
          selectedData = dailyData;
          periodLabel = 'Daily';
          break;
      }

      response = {
        ok: true,
        message: 'All traders data retrieved successfully from database',
        period: periodLabel.toLowerCase(),
        timestamp: new Date().toISOString(),
        topTradersForDay: period === 'daily' ? selectedData.traders : [],
        data: {
          daily: {
            traders: dailyData.traders,
            totalTraders: dailyData.totalTraders,
            lastUpdated: dailyData.lastUpdated,
            period: 'daily'
          },
          weekly: {
            traders: weeklyData.traders,
            totalTraders: weeklyData.totalTraders,
            lastUpdated: weeklyData.lastUpdated,
            period: 'weekly'
          },
          monthly: {
            traders: monthlyData.traders,
            totalTraders: monthlyData.totalTraders,
            lastUpdated: monthlyData.lastUpdated,
            period: 'monthly'
          }
        },
        selected: {
          traders: selectedData.traders,
          totalTraders: selectedData.totalTraders,
          lastUpdated: selectedData.lastUpdated,
          period: periodLabel.toLowerCase()
        }
      };
    } else {
      // Fetch only the requested period
      const periodEnum = period.toUpperCase() as 'DAILY' | 'WEEKLY' | 'MONTHLY';
      const selectedData = await fetchTradersData(periodEnum, limit);

      if (!selectedData.traders || selectedData.traders.length === 0) {
        const hasAnyData = await prisma.trader.count({
          where: { period: periodEnum }
        });
        
        if (hasAnyData === 0) {
          return NextResponse.json(
            { 
              error: `No ${period} data available. Database may need initial population.`,
              suggestion: 'Try calling /api/scrapeAndPushToDB first'
            },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: `No ${period} data available` },
          { status: 404 }
        );
      }

      response = {
        ok: true,
        message: `${period.charAt(0).toUpperCase() + period.slice(1)} traders data retrieved successfully from database`,
        period: period.toLowerCase(),
        timestamp: new Date().toISOString(),
        selected: {
          traders: selectedData.traders,
          totalTraders: selectedData.totalTraders,
          lastUpdated: selectedData.lastUpdated,
          period: period.toLowerCase()
        }
      };
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ [API] POST getTopTraders error:', error);
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
  const period = searchParams.get('period') || 'daily';
  const limit = parseInt(searchParams.get('limit') || '20');
  const fetchAll = searchParams.get('fetchAll') === 'true';

  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period, limit, fetchAll })
  });

  return POST(mockRequest);
}

// Enhanced function with price data fetching
async function fetchTradersData(period: 'DAILY' | 'WEEKLY' | 'MONTHLY', limit: number) {
  try {
    console.log(`🔍 [DB] Fetching ${period} traders with limit ${limit}`);
    const startTime = Date.now();

    // Use a single transaction to fetch both metadata and traders
    const [metadata, traders] = await Promise.all([
      prisma.scrapingMetadata.findFirst({
        where: { 
          period: period,
          isActive: true 
        },
        orderBy: { scrapedAt: 'desc' },
        select: {
          totalTraders: true,
          scrapedAt: true
        }
      }),
      prisma.trader.findMany({
        where: { period: period },
        orderBy: { rank: 'asc' }, // this is where we sort by PNL(rank actually, and rank is already assigned by PnL(high -> low))
        take: limit,
        select: {
          rank: true,
          name: true,
          address: true,
          pnl: true,
          winRate: true,
          avatarUrl: true,
          xUrl: true,
          tokenMintAddress: true,
          poolAddress: true
        }
      })
    ]);

    const endTime = Date.now();
    console.log(`✅ [DB] ${period} query completed in ${endTime - startTime}ms`);

    // Fetch price data for traders with pool addresses
    const tradersWithPriceData = await enrichTradersWithPriceData(traders);

    return {
      traders: tradersWithPriceData,
      totalTraders: metadata?.totalTraders || 0,
      lastUpdated: metadata?.scrapedAt?.toISOString()
    };
  } catch (error) {
    console.error(`❌ Error fetching ${period} data:`, error);
    return {
      traders: [],
      totalTraders: 0,
      lastUpdated: null
    };
  }
}

// New function to enrich traders with price data
async function enrichTradersWithPriceData(traders: any[]) {
  console.log(`💰 [PRICE] Enriching ${traders.length} traders with price data`);
  
  // Filter traders that have pool addresses
  const tradersWithPools = traders.filter(trader => trader.poolAddress);
  
  if (tradersWithPools.length === 0) {
    console.log(`⚠️ [PRICE] No traders with pool addresses found`);
    return traders.map(trader => ({
      ...trader,
      tokenPrice: undefined,
      priceChange24h: undefined,
      priceChange24hPercent: undefined
    }));
  }

  try {
    // Get pool addresses for price fetching
    const poolAddresses = tradersWithPools.map(trader => trader.poolAddress);
    console.log(`🔍 [PRICE] Fetching price data for ${poolAddresses.length} pools`);
    
    // Batch fetch price data
    const priceDataMap = await meteoraClient.batchGetTokenPriceData(poolAddresses);
    console.log(`✅ [PRICE] Retrieved price data for ${priceDataMap.size} pools`);

    // Enrich traders with price data
    return traders.map(trader => {
      if (!trader.poolAddress) {
        return {
          ...trader,
          tokenPrice: undefined,
          priceChange24h: undefined,
          priceChange24hPercent: undefined
        };
      }

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

      return {
        ...trader,
        tokenPrice: priceData.price.toFixed(6),
        priceChange24h: priceData.priceChange24h.toFixed(6),
        priceChange24hPercent: priceData.priceChange24hPercent
      };
    });
  } catch (error) {
    console.error(`❌ [PRICE] Error fetching price data:`, error);
    // Return traders without price data on error
    return traders.map(trader => ({
      ...trader,
      tokenPrice: undefined,
      priceChange24h: undefined,
      priceChange24hPercent: undefined
    }));
  }
}