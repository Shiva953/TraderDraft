import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { KOLScanScraper } from '@/lib/scraper';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  console.log("🟡 [SCRAPE-API] POST /scrapeAndPushToDB called");

  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Unsupported Media Type. Use application/json.' },
        { status: 415 }
      );
    }

    const body = await request.json();
    const { force = false } = body;

    console.log("🟡 [SCRAPE-API] Starting scraping process...");
    
    const scraper = new KOLScanScraper();
    const tradersData = await scraper.scrapeKOLScan();
    
    if (!tradersData || tradersData.length === 0) {
      return NextResponse.json(
        { error: 'No data retrieved from scraper' },
        { status: 404 }
      );
    }

    console.log(`🟡 [SCRAPE-API] Scraping completed, got ${tradersData.length} periods of data`);
    
    tradersData.forEach((data, idx) => {
      console.log(`Period ${idx}: ${data.period}, traders: ${data.traders?.length || 0}`);
    });

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < tradersData.length; i++) {
        const periodData = tradersData[i];
        if (!periodData || !periodData.traders) {
          console.log(`⚠️ [SCRAPE-API] Skipping empty period data at index ${i}`);
          continue;
        }

        const period = periodData.period.toUpperCase() as 'DAILY' | 'WEEKLY' | 'MONTHLY';
        
        console.log(`🔄 [SCRAPE-API] Processing ${period} data (${periodData.traders.length} traders)`);
        
        await tx.scrapingMetadata.updateMany({
          where: { period: period, isActive: true },
          data: { isActive: false }
        });

        await tx.scrapingMetadata.create({
          data: {
            period: period,
            totalTraders: periodData.totalTraders,
            isActive: true,
          }
        });

        const deletedCount = await tx.trader.deleteMany({
          where: { period: period }
        });
        
        console.log(`🗑️ [SCRAPE-API] Deleted ${deletedCount.count} old ${period} traders`);

        const tradersToInsert = periodData.traders.map((trader, index: number) => ({
          id: `${period.toLowerCase()}_${index + 1}`,
          rank: trader.rank || 0,
          name: trader.walletName || `Trader ${index + 1}`,
          address: trader.walletAddress,
          pnl: trader.pnlSol || '',
          winRate: (Number(trader.wins) * 100) / (Number(trader.wins) + Number(trader.losses)),
          avatarUrl: trader.walletAvatar,
          xUrl: trader.twitter,
          period: period,
        }));

        await tx.trader.createMany({
          data: tradersToInsert,
          skipDuplicates: true
        });

        console.log(`✅ [SCRAPE-API] Inserted ${tradersToInsert.length} ${period.toLowerCase()} traders`);
      }
    }, {timeout: 70000});

    console.log("✅ [SCRAPE-API] Database update completed successfully");

    return NextResponse.json({
      ok: true,
      message: 'Data scraped and stored successfully',
      timestamp: new Date().toISOString(),
      periods: tradersData.map(data => data.period.toLowerCase()),
      totalRecords: tradersData.reduce((sum, data) => sum + (data?.traders?.length || 0), 0),
      periodBreakdown: tradersData.map(data => ({
        period: data.period,
        count: data.traders?.length || 0
      }))
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [SCRAPE-API] Error:', error);
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
  const force = searchParams.get('force') === 'true';

  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force })
  });

  return POST(mockRequest);
}