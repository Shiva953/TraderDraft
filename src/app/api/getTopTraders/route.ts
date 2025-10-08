import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { meteoraClient } from '@/lib/meteoraPriceUtils';



// Cache for price data to avoid repeated API calls
const priceDataCache = new Map<string, {
  data: any;
  timestamp: number;
  ttl: number;
}>();

const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CONCURRENT_PRICE_REQUESTS = 5;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("🔵 [API] POST /getTopTraders called (optimized v2)");

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
      limit = 20, 
      fetchAll = false,
      includePriceData = true // Allow disabling price data fetching
    } = body;

    console.log(`🔵 [API] Params: period=${period}, limit=${limit}, fetchAll=${fetchAll}, includePriceData=${includePriceData}`);

    let response;

    if (fetchAll) {
      // Fetch all periods (for initial load or when explicitly requested)
      const [dailyData, weeklyData, monthlyData] = await Promise.all([
        fetchTradersData('DAILY', limit, includePriceData),
        fetchTradersData('WEEKLY', limit, includePriceData),
        fetchTradersData('MONTHLY', limit, includePriceData)
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
      const selectedData = await fetchTradersData(periodEnum, limit, includePriceData);

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
  const limit = parseInt(searchParams.get('limit') || '20');
  const fetchAll = searchParams.get('fetchAll') === 'true';
  const includePriceData = searchParams.get('includePriceData') !== 'false';

  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period, limit, fetchAll, includePriceData })
  });

  return POST(mockRequest);
}

// Optimized function with better caching and concurrency control
async function fetchTradersData(period: 'DAILY' | 'WEEKLY' | 'MONTHLY', limit: number, includePriceData: boolean = true) {
  try {
    console.log(`🔍 [DB] Fetching ${period} traders with limit ${limit}, includePriceData: ${includePriceData}`);
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
          poolAddress: true
        }
      })
    ]);

    const dbEndTime = Date.now();
    console.log(`✅ [DB] ${period} query completed in ${dbEndTime - startTime}ms, found ${traders.length} traders`);

    if (!includePriceData) {
      console.log(`⚠️ [PRICE] Skipping price data fetching for ${period}`);
      return {
        traders: traders.map(trader => ({
          ...trader,
          tokenPrice: undefined,
          priceChange24h: undefined,
          priceChange24hPercent: undefined
        })),
        totalTraders: metadata?.totalTraders || 0,
        lastUpdated: metadata?.scrapedAt?.toISOString()
      };
    }

    // Fetch price data with optimizations
    const tradersWithPriceData = await enrichTradersWithPriceDataOptimized(traders, period);

    const totalEndTime = Date.now();
    console.log(`✅ [TOTAL] ${period} processing completed in ${totalEndTime - startTime}ms`);

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

async function enrichTradersWithPriceDataOptimized(traders: any[], period: string) {
  console.log(`💰 [PRICE] Enriching ${traders.length} traders with price data (optimized)`);
  
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
    const now = Date.now();
    const poolAddresses = [...new Set(tradersWithPools.map(trader => trader.poolAddress))]; // Remove duplicates
    
    console.log(`🔍 [PRICE] Fetching price data for ${poolAddresses.length} unique pools`);
    
    // Check cache first and separate cached vs uncached pools
    const cachedPools = new Map();
    const uncachedPools = [];
    
    for (const poolAddress of poolAddresses) {
      const cacheKey = `${period}-${poolAddress}`;
      const cached = priceDataCache.get(cacheKey);
      
      if (cached && (now - cached.timestamp) < cached.ttl) {
        cachedPools.set(poolAddress, cached.data);
        console.log(`📂 [CACHE] Using cached data for pool ${poolAddress}`);
      } else {
        uncachedPools.push(poolAddress);
      }
    }
    
    let priceDataMap = new Map(cachedPools);
    
    // Fetch uncached data with concurrency control
    if (uncachedPools.length > 0) {
      console.log(`🌐 [PRICE] Fetching fresh data for ${uncachedPools.length} uncached pools`);
      
      // Process in batches to avoid overwhelming the API
      const batches = [];
      for (let i = 0; i < uncachedPools.length; i += MAX_CONCURRENT_PRICE_REQUESTS) {
        batches.push(uncachedPools.slice(i, i + MAX_CONCURRENT_PRICE_REQUESTS));
      }
      
      for (const batch of batches) {
        try {
          const batchPriceData = await meteoraClient.batchGetTokenPriceData(batch);
          
          // Merge batch results and update cache
          for (const [poolAddress, priceData] of batchPriceData.entries()) {
            priceDataMap.set(poolAddress, priceData);
            
            // Update cache
            const cacheKey = `${period}-${poolAddress}`;
            priceDataCache.set(cacheKey, {
              data: priceData,
              timestamp: now,
              ttl: PRICE_CACHE_TTL
            });
          }
        } catch (batchError) {
          console.error(`❌ [PRICE] Error fetching batch:`, batchError);
        }
      }
    }
    
    console.log(`✅ [PRICE] Retrieved price data for ${priceDataMap.size} pools total`);

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

// Cleanup function to remove expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of priceDataCache.entries()) {
    if ((now - cached.timestamp) > cached.ttl) {
      priceDataCache.delete(key);
    }
  }
}, 10 * 60 * 1000); // Clean up every 10 minutes