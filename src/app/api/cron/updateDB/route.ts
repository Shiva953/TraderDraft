import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/utils';

// /**
//  * Cron job to update database periodically
//  *
//  * Schedule: Every 6 hours (0 */6 * * *)
//  *
//  * This wraps the existing /api/updateDBPeriodically endpoint for Vercel Cron compatibility.
//  */
export async function GET(request: NextRequest) {
  console.log("🕐 [CRON] Database update triggered");

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

    // Call the existing updateDBPeriodically endpoint
    const updateUrl = `${getAppUrl()}/api/updateDBPeriodically`;
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

    console.log("✅ [CRON] Database update completed successfully");

    return NextResponse.json({
      ok: true,
      message: 'Database update executed successfully',
      result: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [CRON] Error executing database update:', error);
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
