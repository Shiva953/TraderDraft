import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import prisma from '@/lib/prisma';

const connection = new Connection("https://devnet.helius-rpc.com/?api-key=017f56ed-c6c1-480a-8c11-dbc09ab2358d", "confirmed");

export async function POST(request: Request) {
  console.log("🔵 [getKOLPageData] POST endpoint called");

  try {
    const body = await request.json();
    const { kolName, userWalletAddress } = body;

    if (!kolName) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameter: kolName"
      }, { status: 400 });
    }

    console.log(`🔍 [getKOLPageData] Fetching data for KOL: ${kolName}, User: ${userWalletAddress || 'none'}`);

    // Fetch KOL data from all periods in parallel
    const [dailyData, weeklyData, monthlyData] = await Promise.all([
      prisma.trader.findFirst({
        where: {
          name: { equals: kolName, mode: 'insensitive' },
          period: 'DAILY'
        }
      }),
      prisma.trader.findFirst({
        where: {
          name: { equals: kolName, mode: 'insensitive' },
          period: 'WEEKLY'
        }
      }),
      prisma.trader.findFirst({
        where: {
          name: { equals: kolName, mode: 'insensitive' },
          period: 'MONTHLY'
        }
      })
    ]);

    if (!dailyData && !weeklyData && !monthlyData) {
      return NextResponse.json({
        success: false,
        error: `No data found for KOL: ${kolName}`
      }, { status: 404 });
    }

    console.log(`✅ [getKOLPageData] Found KOL data for ${kolName}`);

    // Prepare response object
    const responseData: any = {
      kolData: {
        name: kolName,
        daily: dailyData,
        weekly: weeklyData,
        monthly: monthlyData
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
