import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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

// Optimized function with better error handling and performance
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
        orderBy: { rank: 'asc' },
        take: limit,
        select: {
          rank: true,
          name: true,
          address: true,
          pnl: true,
          winRate: true,
          avatarUrl: true,
          xUrl: true
        }
      })
    ]);

    const endTime = Date.now();
    console.log(`✅ [DB] ${period} query completed in ${endTime - startTime}ms`);

    return {
      traders: traders,
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