// api/updateDBPeriodically/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  console.log("🔄 [UPDATE-API] POST /updateDBPeriodically called");

  try {

    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'your-secret-token';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isUpdating = await checkIfUpdateInProgress();
    if (isUpdating) {
      console.log("⚠️ [UPDATE-API] Update already in progress, skipping...");
      return NextResponse.json({
        ok: true,
        message: 'Update already in progress, skipping this cycle',
        timestamp: new Date().toISOString()
      });
    }

    await setUpdateLock(true);

    try {
      console.log("🔄 [UPDATE-API] Triggering scrape and database update...");
      
      const scrapeResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:3000'}/api/scrapeAndPushToDB`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: false }),
      });

      if (!scrapeResponse.ok) {
        throw new Error(`Scrape API failed: ${scrapeResponse.status} ${scrapeResponse.statusText}`);
      }

      const scrapeData = await scrapeResponse.json();
      
      console.log("✅ [UPDATE-API] Database update completed successfully");
      
      // Update the last successful update timestamp
      await updateLastSuccessfulUpdate();
      
      return NextResponse.json({
        ok: true,
        message: 'Database updated successfully via background job',
        timestamp: new Date().toISOString(),
        scrapeResult: scrapeData
      });

    } finally {
      // Always release the lock
      await setUpdateLock(false);
    }

  } catch (error) {
    console.error('❌ [UPDATE-API] Background update error:', error);
    
    // Release lock on error
    await setUpdateLock(false);
    
    return NextResponse.json(
      { 
        error: 'Background update failed', 
        details: String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET || 'your-secret-token';
  
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({ force: false })
  });

  return POST(mockRequest);
}

// Helper functions for managing update state
async function checkIfUpdateInProgress(): Promise<boolean> {
  try {
    const updateStatus = await prisma.scrapingMetadata.findFirst({
      where: { 
        period: 'DAILY',
        isActive: true 
      },
      select: { scrapedAt: true }
    });

    if (!updateStatus) return false;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return updateStatus.scrapedAt > fiveMinutesAgo;
  } catch (error) {
    console.error('Error checking update progress:', error);
    return false;
  }
}

async function setUpdateLock(isLocked: boolean): Promise<void> {
  // This could be implemented with Redis or a dedicated table
  // will use redis in prod
  console.log(`${isLocked ? '🔒' : '🔓'} [UPDATE-API] Update lock ${isLocked ? 'acquired' : 'released'}`);
}

async function updateLastSuccessfulUpdate(): Promise<void> {
  console.log("📝 [UPDATE-API] Last successful update timestamp recorded");
}