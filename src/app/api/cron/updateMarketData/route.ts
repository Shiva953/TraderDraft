import { NextRequest, NextResponse } from 'next/server';

/**
 * Cron endpoint for updating market data every 2 minutes
 *
 * This should be configured in your deployment platform (Vercel, etc.) to run every 2 minutes:
 *
 * Vercel Cron (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/updateMarketData",
 *     "schedule": "every 2 minutes"
 *   }]
 * }
 *
 * Or call this endpoint from an external cron service like:
 * - Vercel Cron (built-in, recommended)
 * - GitHub Actions
 * - Cron-job.org
 * - EasyCron
 */

export async function GET(request: NextRequest) {
  console.log("🕐 [CRON] Market data update cron triggered");

  try {
    // Verify cron secret if provided (recommended for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("❌ [CRON] Unauthorized: Invalid or missing cron secret");
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call the update market data endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000';

    const updateUrl = `${baseUrl}/api/updateMarketData`;
    console.log(`🔄 [CRON] Calling ${updateUrl}`);

    const response = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Update failed: ${JSON.stringify(data)}`);
    }

    console.log("✅ [CRON] Market data update completed successfully");

    return NextResponse.json({
      ok: true,
      message: 'Cron job executed successfully',
      result: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [CRON] Error executing market data update:', error);
    return NextResponse.json({
      error: 'Cron job failed',
      details: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
