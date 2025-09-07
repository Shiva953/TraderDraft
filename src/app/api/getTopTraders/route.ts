import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  console.log("🔵 [API] POST /getTopTraders called (DB-optimized)");

  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Unsupported Media Type. Use application/json.' },
        { status: 415 }
      );
    }

    const body = await request.json();
    const { period = 'daily', limit = 20 } = body;

    console.log(`🔵 [API] Fetching ${period} data with limit ${limit} from database`);

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

    if (!selectedData.traders || selectedData.traders.length === 0) {
      const hasAnyData = await prisma.trader.count();
      
      if (hasAnyData === 0) {
        return NextResponse.json(
          { 
            error: 'No data available. Database may need initial population.',
            suggestion: 'Try calling /api/scrapeAndPushToDB first'
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `No ${periodLabel.toLowerCase()} data available` },
        { status: 404 }
      );
    }

    const response = {
      ok: true,
      message: 'Traders data retrieved successfully from database',
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

  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period, limit })
  });

  return POST(mockRequest);
}

async function fetchTradersData(period: 'DAILY' | 'WEEKLY' | 'MONTHLY', limit: number) {
  try {
    const metadata = await prisma.scrapingMetadata.findFirst({
      where: { 
        period: period,
        isActive: true 
      },
      orderBy: { scrapedAt: 'desc' }
    });

    const traders = await prisma.trader.findMany({
      where: { period: period },
      orderBy: { rank: 'asc' },
      take: limit
    });

    return {
      traders: traders.map(trader => ({
        rank: trader.rank,
        name: trader.name,
        address: trader.address,
        pnl: trader.pnl,
        winRate: trader.winRate,
        avatarUrl: trader.avatarUrl,
        xUrl: trader.xUrl
      })),
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