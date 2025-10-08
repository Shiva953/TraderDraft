import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '20', 10);

    console.log(`🔍 [getRandomKOLImages] Fetching ${count} random KOL images`);

    // Fetch random KOLs with avatarUrl from the database
    // We'll prioritize DAILY period KOLs for freshness
    const kols = await prisma.trader.findMany({
      where: {
        period: 'DAILY',
        avatarUrl: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        ticker: true
      },
      take: 100, // Get a larger pool to randomize from
    });

    // Shuffle and take the requested count
    const shuffled = kols
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map(kol => ({
        id: kol.id,
        name: kol.name,
        avatarUrl: kol.avatarUrl!,
        ticker: kol.ticker || kol.name
      }));

    console.log(`✅ [getRandomKOLImages] Returning ${shuffled.length} KOL images`);

    return NextResponse.json({
      success: true,
      data: shuffled
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [getRandomKOLImages] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

