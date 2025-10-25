import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { meteoraClient } from '@/lib/meteoraPriceUtils';

/**
 * Background job to update market data for all KOL tokens
 * This runs every 2 minutes and caches market data in the database
 * Eliminates the need for individual API calls per trader on leaderboard loads
 */

const BATCH_SIZE = 10; // Process 10 traders at a time to avoid overwhelming the API
const DELAY_BETWEEN_BATCHES = 2000; // 2 second delay between batches

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("🔄 [MARKET DATA UPDATE] Starting market data update job");

  try {
    // Fetch all unique traders with pool addresses across all periods
    const traders = await prisma.trader.findMany({
      where: {
        poolAddress: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        poolAddress: true,
        period: true,
        ticker: true
      },
      orderBy: {
        rank: 'asc'
      }
    });

    console.log(`📊 [MARKET DATA] Found ${traders.length} traders with pool addresses`);

    if (traders.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No traders with pool addresses to update',
        updated: 0,
        timestamp: new Date().toISOString()
      });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ trader: string; error: string }> = [];

    // Process in batches to avoid rate limiting
    for (let i = 0; i < traders.length; i += BATCH_SIZE) {
      const batch = traders.slice(i, i + BATCH_SIZE);
      console.log(`🔄 [BATCH ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(traders.length / BATCH_SIZE)}] Processing traders ${i + 1}-${Math.min(i + BATCH_SIZE, traders.length)}`);

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async (trader) => {
          try {
            if (!trader.poolAddress) {
              throw new Error('No pool address');
            }

            console.log(`💰 [${trader.ticker || trader.name}] Fetching market data from pool ${trader.poolAddress.slice(0, 8)}...`);

            const priceData = await meteoraClient.getTokenPriceData(trader.poolAddress);

            if (!priceData) {
              throw new Error('Failed to fetch price data');
            }

            // Update trader with market data
            await prisma.trader.update({
              where: { id: trader.id },
              data: {
                tokenPrice: priceData.price,
                priceChange24h: priceData.priceChange24h,
                priceChange24hPercent: priceData.priceChange24hPercent,
                marketCap: priceData.marketCap,
                totalSupply: priceData.totalSupply,
                volume24h: priceData.volume24h,
                liquidityUsd: priceData.liquidityUsd,
                marketDataLastUpdated: new Date()
              }
            });

            console.log(`✅ [${trader.ticker || trader.name}] Updated: Price=$${priceData.price.toFixed(6)}, MarketCap=$${priceData.marketCap?.toLocaleString()}, Change24h=${priceData.priceChange24hPercent?.toFixed(2)}%`);

            return { success: true, trader: trader.name };
          } catch (error) {
            console.error(`❌ [${trader.ticker || trader.name}] Error updating market data:`, error);
            throw error;
          }
        })
      );

      // Count successes and failures
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
          errors.push({
            trader: batch[index].name,
            error: result.reason?.message || 'Unknown error'
          });
        }
      });

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < traders.length) {
        console.log(`⏳ [DELAY] Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ [MARKET DATA UPDATE] Job completed in ${duration}s`);
    console.log(`📊 [RESULTS] Success: ${successCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      ok: true,
      message: 'Market data update completed',
      totalTraders: traders.length,
      successCount,
      errorCount,
      duration: `${duration}s`,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [MARKET DATA UPDATE] Critical error:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support GET for manual triggers
export async function GET(request: NextRequest) {
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  return POST(mockRequest);
}
