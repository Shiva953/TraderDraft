import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

// Helper function to calculate average daily PnL based on period
function calculateAvgDailyPnl(pnl: string, period: string): string {
  const pnlValue = parseFloat(pnl);
  if (isNaN(pnlValue)) return pnl;

  let divisor = 1;
  switch (period) {
    case 'DAILY':
      divisor = 1;
      break;
    case 'WEEKLY':
      divisor = 7;
      break;
    case 'MONTHLY':
      divisor = 30;
      break;
    default:
      divisor = 1;
  }

  const avgDailyPnl = pnlValue / divisor;
  // Preserve the sign and format
  const sign = avgDailyPnl >= 0 ? '+' : '';
  return `${sign}${avgDailyPnl.toFixed(2)}`;
}

// Helper function to sort traders by avgDailyPnl and reassign ranks
function sortAndRerankByAvgDailyPnl(traders: any[]): any[] {
  console.log(`🔄 [RANK] Re-ranking ${traders.length} traders by avgDailyPnl (was ranked by total PnL)`);
  
  // Log top 3 BEFORE re-ranking
  const topBeforeRanking = traders
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);
  console.log(`📊 [BEFORE] Top 3 by total PnL: ${topBeforeRanking.map(t => `#${t.rank} ${t.name} (${t.avgDailyPnl})`).join(', ')}`);
  
  // Sort by avgDailyPnl (descending - highest first)
  const sorted = [...traders].sort((a, b) => {
    const pnlA = parseFloat(a.avgDailyPnl || '0');
    const pnlB = parseFloat(b.avgDailyPnl || '0');
    return pnlB - pnlA; // Descending order
  });

  // Reassign ranks
  const reranked = sorted.map((trader, index) => ({
    ...trader,
    rank: index + 1 // New rank based on avgDailyPnl
  }));

  console.log(`✅ [AFTER] Top 3 by avg daily PnL: ${reranked.slice(0, 3).map(t => `#${t.rank} ${t.name} (${t.avgDailyPnl})`).join(', ')}`);
  
  return reranked;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("🔵 [API] POST /getTopTraders called (OPTIMIZED - Single DB query with cached market data)");

  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Unsupported Media Type. Use application/json.' },
        { status: 415 }
      );
    }

    const body = await request.json();
    const {
      period = 'daily',
      limit = 50, // Changed default from 20 to 50
      fetchAll = false
    } = body;

    console.log(`🔵 [API] Params: period=${period}, limit=${limit}, fetchAll=${fetchAll}`);

    let response;

    if (fetchAll) {
      // Fetch all periods (for initial load or when explicitly requested)
      const [dailyData, weeklyData, monthlyData] = await Promise.all([
        fetchTradersData('DAILY', limit),
        fetchTradersData('WEEKLY', limit),
        fetchTradersData('MONTHLY', limit)
      ]);

      console.log(`🔵 [API] Fetched data - Daily: ${dailyData.traders.length}, Weekly: ${weeklyData.traders.length}, Monthly: ${monthlyData.traders.length}`);

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

    const endTime = Date.now();
    console.log(`✅ [API] Request completed in ${endTime - startTime}ms`);

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
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'daily';
  const limit = parseInt(searchParams.get('limit') || '50'); // Changed default from 20 to 50
  const fetchAll = searchParams.get('fetchAll') === 'true';

  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period, limit, fetchAll })
  });

  return POST(mockRequest);
}

// Optimized function - Now uses cached market data from database (updated every 2 mins by cron)
async function fetchTradersData(period: 'DAILY' | 'WEEKLY' | 'MONTHLY', limit: number) {
  try {
    console.log(`🔍 [DB] Fetching ${period} traders with limit ${limit} (using cached market data)`);
    const startTime = Date.now();

    // Fetch both metadata and traders with ALL market data in a single query
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
        orderBy: { rank: 'asc' }, // Sort by rank (which is based on PnL)
        take: limit,
        select: {
          rank: true,
          name: true,
          ticker: true,
          address: true,
          pnl: true,
          winRate: true,
          avatarUrl: true,
          xUrl: true,
          tokenMintAddress: true,
          poolAddress: true,
          // Include cached market data fields
          tokenPrice: true,
          priceChange24h: true,
          priceChange24hPercent: true,
          marketCap: true,
          totalSupply: true,
          volume24h: true,
          liquidityUsd: true,
          marketDataLastUpdated: true
        }
      })
    ]);

    const dbEndTime = Date.now();
    console.log(`✅ [DB] ${period} query completed in ${dbEndTime - startTime}ms, found ${traders.length} traders`);

    // Check if market data is stale (older than 5 minutes)
    if (traders.length > 0 && traders[0].marketDataLastUpdated) {
      const ageMinutes = (Date.now() - traders[0].marketDataLastUpdated.getTime()) / 1000 / 60;
      if (ageMinutes > 5) {
        console.warn(`⚠️ [MARKET DATA] Cache is ${ageMinutes.toFixed(1)} minutes old - consider running /api/updateMarketData`);
      } else {
        console.log(`✅ [MARKET DATA] Using fresh cache (${ageMinutes.toFixed(1)} minutes old)`);
      }
    }

    // Calculate avgDailyPnl for each trader
    const tradersWithAvgPnl = traders.map(trader => ({
      ...trader,
      avgDailyPnl: calculateAvgDailyPnl(trader.pnl, period)
    }));

    // Sort and re-rank by avgDailyPnl
    const rerankedTraders = sortAndRerankByAvgDailyPnl(tradersWithAvgPnl);

    const totalEndTime = Date.now();
    console.log(`✅ [TOTAL] ${period} processing completed in ${totalEndTime - startTime}ms (NO external API calls!)`);

    return {
      traders: rerankedTraders,
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

// NOTE: Price data enrichment is now handled by the background cron job at /api/cron/updateMarketData
// This runs every 2 minutes and updates the Trader table with fresh market data
// No need for runtime API calls or complex caching logic here!