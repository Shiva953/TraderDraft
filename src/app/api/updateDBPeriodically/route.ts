import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { KOLScanScraper } from '@/lib/scraper';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  console.log("⚡ [UPDATE-API] Background update started");

  try {
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'your-secret-token';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      console.log("❌ [UPDATE-API] Unauthorized access attempt");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    console.log(`⚡ [UPDATE-API] Scraping completed, got ${tradersData.length} periods of data`);
    
    tradersData.forEach((data, idx) => {
      console.log(`Period ${idx}: ${data.period}, traders: ${data.traders?.length || 0}`);
    });

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < tradersData.length; i++) {
        const periodData = tradersData[i];
        if (!periodData || !periodData.traders) {
          console.log(`⚠️ [UPDATE-API] Skipping empty period data at index ${i}`);
          continue;
        }

        const period = periodData.period.toUpperCase();
        
        console.log(`🔄 [UPDATE-API] Processing ${period} data (${periodData.traders.length} traders)`);
        
        await tx.scrapingMetadata.updateMany({
          where: { period: period as any, isActive: true },
          data: { isActive: false }
        });

        await tx.scrapingMetadata.create({
          data: {
            period: period as any,
            totalTraders: periodData.totalTraders,
            isActive: true,
          }
        });

        const deletedCount = await tx.trader.deleteMany({
          where: { period: period as any }
        });
        
        console.log(`🗑️ [UPDATE-API] Deleted ${deletedCount.count} old ${period} traders`);

        const tradersToInsert = periodData.traders.map((trader, index: number) => ({
          id: `${period.toLowerCase()}_${index + 1}`,
          rank: index + 1,
          name: trader.walletName || `Trader ${index + 1}`,
          address: trader.walletAddress,
          pnl: trader.pnlSol || '',
          winRate: (Number(trader.wins) * 100) / (Number(trader.wins) + Number(trader.losses)),
          avatarUrl: trader.walletAvatar,
          xUrl: trader.twitter,
          period: period as any,
        }));

        await tx.trader.createMany({
          data: tradersToInsert,
          skipDuplicates: true
        });

        console.log(`✅ [UPDATE-API] Updated ${tradersToInsert.length} ${period.toLowerCase()} traders`);
      }
    }, {timeout: 70000});

    await setUpdatingFlag(false);

    console.log("✅ [UPDATE-API] Background update completed successfully");

    return NextResponse.json({
      ok: true,
      message: 'Background update completed successfully',
      timestamp: new Date().toISOString(),
      periods: tradersData.map(data => data.period.toLowerCase()),
      totalRecords: tradersData.reduce((sum, data) => sum + (data?.traders?.length || 0), 0),
      periodBreakdown: tradersData.map(data => ({
        period: data.period,
        count: data.traders?.length || 0
      }))
    });

  } catch (error) {
    console.error('❌ [UPDATE-API] Background update error:', error);
    await setUpdatingFlag(false);
    
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

async function checkIfUpdating(): Promise<boolean> {
  try {
    const updateStatus = await prisma.scrapingMetadata.findFirst({
      where: {
        period: 'DAILY',
        scrapedAt: {
          gt: new Date(Date.now() - 10 * 60 * 1000)
        }
      },
      orderBy: { scrapedAt: 'desc' }
    });
    
    return false;
  } catch {
    return false;
  }
}

async function setUpdatingFlag(isUpdating: boolean): Promise<void> {
  console.log(`⚡ [UPDATE-API] Setting update flag to: ${isUpdating}`);
}

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