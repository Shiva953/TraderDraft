import { NextResponse } from 'next/server';
import { KOLScanScraper } from '@/lib/scraper';

export async function POST(request: Request) {
	try {
		const contentType = request.headers.get('content-type') || '';
		if (!contentType.includes('application/json')) {
			return NextResponse.json(
				{ error: 'Unsupported Media Type. Use application/json.' },
				{ status: 415 }
			);
		}

		const body = await request.json();
        const scrape = new KOLScanScraper();
        const tradersData = await scrape.scrapeKOLScan();
        const dailyTradersData = tradersData[0];
        const weeklyTradersData = tradersData[1];
        const monthlyTradersData = tradersData[2];

        const topTradersForDay = dailyTradersData.traders;

		return NextResponse.json(
			{ ok: true, message: 'POST request received', topTradersForDay: topTradersForDay },
			{ status: 200 }
		);
	} catch (error) {
		console.error('POST /getTrendingTraderTokens error:', error);
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 }
		);
	}
}
