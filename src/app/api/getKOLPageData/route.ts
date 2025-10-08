import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import prisma from '@/lib/prisma';
import { meteoraClient } from '@/lib/meteoraPriceUtils';

const connection = new Connection("https://devnet.helius-rpc.com/?api-key=017f56ed-c6c1-480a-8c11-dbc09ab2358d", "confirmed");

export async function POST(request: Request) {
  console.log("🔵 [getKOLPageData] POST endpoint called");

  try {
    const body = await request.json();
    const { kolTicker, userWalletAddress } = body;

    if (!kolTicker) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameter: kolTicker"
      }, { status: 400 });
    }

    console.log(`🔍 [getKOLPageData] Fetching data for ticker: ${kolTicker}, User: ${userWalletAddress || 'none'}`);

    // Fetch KOL data from all periods in parallel using ticker
    const [dailyData, weeklyData, monthlyData] = await Promise.all([
      prisma.trader.findFirst({
        where: {
          ticker: { equals: kolTicker, mode: 'insensitive' },
          period: 'DAILY'
        }
      }),
      prisma.trader.findFirst({
        where: {
          ticker: { equals: kolTicker, mode: 'insensitive' },
          period: 'WEEKLY'
        }
      }),
      prisma.trader.findFirst({
        where: {
          ticker: { equals: kolTicker, mode: 'insensitive' },
          period: 'MONTHLY'
        }
      })
    ]);

    if (!dailyData && !weeklyData && !monthlyData) {
      return NextResponse.json({
        success: false,
        error: `No data found for ticker: ${kolTicker}`
      }, { status: 404 });
    }

    const kolName = (dailyData || weeklyData || monthlyData)?.name || kolTicker;
    console.log(`✅ [getKOLPageData] Found KOL data for ${kolName} (ticker: ${kolTicker})`);

    // Fetch live price data from Meteora if pool exists
    const currentData = dailyData || weeklyData || monthlyData;
    let priceData = null;

    if (currentData?.poolAddress) {
      try {
        console.log(`💰 [getKOLPageData] Fetching live price for pool: ${currentData.poolAddress}`);
        priceData = await meteoraClient.getTokenPriceData(currentData.poolAddress);

        if (priceData) {
          console.log(`✅ [getKOLPageData] Got live price: $${priceData.price.toFixed(6)}`);
        }
      } catch (priceError) {
        console.warn(`⚠️ [getKOLPageData] Could not fetch price data:`, priceError);
      }
    }

    // Helper function to format very small prices - show actual number, not scientific notation
    const formatPrice = (price: number): string => {
      if (price === 0) return '0';

      // Always show actual number with enough decimals to see non-zero value
      if (price < 0.0000001) {
        return price.toFixed(10); // 10 decimals for very small
      } else if (price < 0.00001) {
        return price.toFixed(8); // 8 decimals for small
      } else if (price < 0.01) {
        return price.toFixed(6); // 6 decimals for normal
      } else {
        return price.toFixed(4); // 4 decimals for larger prices
      }
    };

    // Enrich trader data with live price
    const enrichedDaily = dailyData && priceData ? {
      ...dailyData,
      tokenPrice: formatPrice(priceData.price),
      priceChange24h: formatPrice(priceData.priceChange24h),
      priceChange24hPercent: priceData.priceChange24hPercent
    } : dailyData;

    const enrichedWeekly = weeklyData && priceData ? {
      ...weeklyData,
      tokenPrice: formatPrice(priceData.price),
      priceChange24h: formatPrice(priceData.priceChange24h),
      priceChange24hPercent: priceData.priceChange24hPercent
    } : weeklyData;

    const enrichedMonthly = monthlyData && priceData ? {
      ...monthlyData,
      tokenPrice: formatPrice(priceData.price),
      priceChange24h: formatPrice(priceData.priceChange24h),
      priceChange24hPercent: priceData.priceChange24hPercent
    } : monthlyData;

    // Prepare response object
    const responseData: any = {
      kolData: {
        name: kolName,
        daily: enrichedDaily,
        weekly: enrichedWeekly,
        monthly: enrichedMonthly
      },
      userShares: "0",
      userHoldings: []
    };

    // Fetch user's holdings for this specific KOL if wallet provided
    if (userWalletAddress && userWalletAddress !== "YOUR_USER_WALLET_ADDRESS") {
      const currentData = dailyData || weeklyData || monthlyData;

      if (currentData?.tokenMintAddress) {
        try {
          const userPublicKey = new PublicKey(userWalletAddress);
          const mintAddress = new PublicKey(currentData.tokenMintAddress);

          // Get the user's token account for this specific KOL
          const ataAddress = await getAssociatedTokenAddress(mintAddress, userPublicKey);

          console.log(`🔍 [getKOLPageData] Checking token account: ${ataAddress.toBase58()}`);

          // Fetch the account
          const accountInfo = await connection.getAccountInfo(ataAddress, { commitment: "confirmed" });

          if (accountInfo && accountInfo.data.length > 0) {
            // Parse SPL token account data (balance is at bytes 64-72)
            const balanceBuffer = accountInfo.data.slice(64, 72);
            const balance = Buffer.from(balanceBuffer).readBigUInt64LE().toString();

            if (balance !== '0') {
              const decimals = 6;
              const balanceNum = parseInt(balance);
              const formattedBalance = (balanceNum / Math.pow(10, decimals)).toLocaleString();

              responseData.userShares = formattedBalance;
              responseData.userHoldings = [{
                ticker: currentData.ticker || 'UNKNOWN',
                name: currentData.name,
                balance: balance,
                mintAddress: currentData.tokenMintAddress,
                poolAddress: currentData.poolAddress || undefined
              }];

              console.log(`✅ [getKOLPageData] User holds ${formattedBalance} tokens`);
            } else {
              console.log(`ℹ️ [getKOLPageData] User has 0 balance for this KOL`);
            }
          } else {
            console.log(`ℹ️ [getKOLPageData] No token account found for user`);
          }
        } catch (tokenError) {
          console.warn(`⚠️ [getKOLPageData] Error fetching user token balance:`, tokenError);
          // Don't fail the whole request, just set to 0
          responseData.userShares = "0";
        }
      } else {
        console.log(`ℹ️ [getKOLPageData] KOL has no token mint address`);
      }
    } else {
      console.log(`ℹ️ [getKOLPageData] No user wallet provided, skipping holdings fetch`);
    }

    console.log(`✅ [getKOLPageData] Request completed successfully`);

    return NextResponse.json({
      success: true,
      data: responseData
    }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('❌ [getKOLPageData] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : 'No stack trace'
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
