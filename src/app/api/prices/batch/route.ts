import { NextResponse } from 'next/server';
import { meteoraClient } from '@/lib/meteoraPriceUtils';

/**
 * Optimized batch price fetching endpoint
 * Much faster than individual getTokenPriceData calls
 *
 * POST /api/prices/batch
 * Body: { poolAddresses: string[], mintAddresses?: string[] }
 */
export async function POST(request: Request) {
  try {
    console.log('🔵 [api/prices/batch] POST endpoint called');

    const body = await request.json();
    const { poolAddresses, mintAddresses } = body;

    if (!poolAddresses || !Array.isArray(poolAddresses)) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid poolAddresses array'
      }, { status: 400 });
    }

    if (poolAddresses.length === 0) {
      return NextResponse.json({
        success: true,
        data: {}
      }, { status: 200 });
    }

    console.log(`💹 [api/prices/batch] Fetching prices for ${poolAddresses.length} pools`);

    // Use optimized batch fetching
    const priceMap = await meteoraClient.batchGetTokenPriceData(poolAddresses, mintAddresses);

    // Convert Map to object for JSON serialization
    const priceData: Record<string, any> = {};
    priceMap.forEach((value, key) => {
      priceData[key] = value;
    });

    console.log(`✅ [api/prices/batch] Successfully fetched ${Object.keys(priceData).length} prices`);

    return NextResponse.json({
      success: true,
      data: priceData,
      count: Object.keys(priceData).length
    }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Cache for 5 minutes on the client side
        'Cache-Control': 'public, max-age=300, s-maxage=300'
      }
    });

  } catch (error) {
    console.error('❌ [api/prices/batch] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
