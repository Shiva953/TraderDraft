import { NextResponse } from 'next/server';

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

		return NextResponse.json(
			{ ok: true, message: 'POST request received' },
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
