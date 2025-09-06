// app/api/updateTradersData/route.ts (Background Job)
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { KOLScanScraper } from '@/lib/scraper';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  console.log("⚡ [UPDATE-API] Background update started");

  try {
    // Optional: Add authentication to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'your-secret-token';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      console.log("❌ [UPDATE-API] Unauthorized access attempt");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if we're already running an update to prevent overlapping jobs
    const isUpdating = await checkIfUpdating();
    if (isUpdating) {
      console.log("⚠️ [UPDATE-API] Update already in progress, skipping");
      return NextResponse.json({
        ok: true,
        message: 'Update already in progress',
        skipped: true,
        timestamp: new Date().toISOString()
      });
    }

    // Mark as updating
    await setUpdatingFlag(true);

    console.log("⚡ [UPDATE-API] Starting background scrape...");
    const scraper = new KOLScanScraper();
    const tradersData = await scraper.scrapeKOLScan();
    
    if (!tradersData || tradersData.length === 0) {
      await setUpdatingFlag(false);
      return NextResponse.json(
        { error: 'No data retrieved from scraper' },
        { status: 404 }
      );
    }

    console.log("⚡ [UPDATE-API] Scraping completed, updating database...");

    // Update database with new data
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < tradersData.length; i++) {
        const periodData = tradersData[i];
        if (!periodData || !periodData.traders) continue;

        const period = i === 0 ? 'DAILY' : i === 1 ? 'WEEKLY' : 'MONTHLY';
        
        // Deactivate previous metadata
        await tx.scrapingMetadata.updateMany({
          where: { period: period as any, isActive: true },
          data: { isActive: false }
        });

        // Create new metadata
        await tx.scrapingMetadata.create({
          data: {
            period: period as any,
            totalTraders: periodData.totalTraders,
            isActive: true,
          }
        });

        // Delete old traders
        await tx.trader.deleteMany({
          where: { period: period as any }
        });

        // Insert new traders
        const tradersToInsert = periodData.traders.map((trader: any, index: number) => ({
          rank: index + 1,
          name: trader.name || `Trader ${index + 1}`,
          address: trader.address,
          pnl: trader.pnl || 0,
          roi: trader.roi,
          winRate: trader.winRate,
          trades: trader.trades,
          volume: trader.volume,
          period: period as any,
        }));

        await tx.trader.createMany({
          data: tradersToInsert,
          skipDuplicates: true
        });

        console.log(`✅ [UPDATE-API] Updated ${tradersToInsert.length} ${period.toLowerCase()} traders`);
      }
    });

    // Clear updating flag
    await setUpdatingFlag(false);

    console.log("✅ [UPDATE-API] Background update completed successfully");

    return NextResponse.json({
      ok: true,
      message: 'Background update completed successfully',
      timestamp: new Date().toISOString(),
      periods: ['daily', 'weekly', 'monthly'],
      totalRecords: tradersData.reduce((sum, data) => sum + (data?.traders?.length || 0), 0)
    });

  } catch (error) {
    console.error('❌ [UPDATE-API] Background update error:', error);
    await setUpdatingFlag(false); // Clear flag on error
    
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
    console.log("⚡ [UPDATE-API] Background job completed");
  }
}

// Helper function to check if an update is in progress
async function checkIfUpdating(): Promise<boolean> {
  try {
    // You could use Redis or a simple database flag
    // For simplicity, we'll use a database approach
    const updateStatus = await prisma.scrapingMetadata.findFirst({
      where: {
        // Use a special period to track updating status
        period: 'DAILY',
        // Check if last update was less than 10 minutes ago (overlap protection)
        scrapedAt: {
          gt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes
        }
      },
      orderBy: { scrapedAt: 'desc' }
    });
    
    return false; // For now, allow overlaps but you can implement proper locking
  } catch {
    return false;
  }
}

// Helper function to set updating flag
async function setUpdatingFlag(isUpdating: boolean): Promise<void> {
  // Implement your locking mechanism here
  // Could be Redis, database flag, or file system flag
  console.log(`⚡ [UPDATE-API] Setting update flag to: ${isUpdating}`);
}

// GET endpoint for manual trigger
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET || 'your-secret-token';
  
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const mockRequest = new Request(request.url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': authHeader 
    },
    body: JSON.stringify({})
  });

  return POST(mockRequest);
}