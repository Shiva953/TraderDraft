import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const prisma = new PrismaClient();
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

interface TokenHolding {
  ticker: string;
  name: string;
  balance: string;
  mintAddress: string;
  poolAddress?: string;
  tokenPrice?: string;
  priceChange24h?: string;
  priceChange24hPercent?: number;
}

export async function POST(request: Request) {
  try {
    console.log('🔵 [getUserKOLTokenHoldings] POST endpoint called');
    
    const body = await request.json();
    const { userPrivyWalletAddress } = body;
    
    if (!userPrivyWalletAddress) {
      throw new Error('Missing required parameter: userPrivyWalletAddress');
    }

    console.log(`🔍 [getUserKOLTokenHoldings] Fetching token holdings for: ${userPrivyWalletAddress}`);

    // Get all KOLs with token mint addresses
    const kolsWithTokens = await prisma.trader.findMany({
      where: {
        tokenMintAddress: { not: null },
        period: 'DAILY' // Get from daily period as it has the most recent data
      },
      select: {
        name: true,
        ticker: true,
        tokenMintAddress: true,
        poolAddress: true
      }
    });

    console.log(`📊 [getUserKOLTokenHoldings] Found ${kolsWithTokens.length} KOLs with tokens`);

    if (kolsWithTokens.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          holdings: [],
          totalHoldings: 0
        }
      }, { status: 200 });
    }

    const userPublicKey = new PublicKey(userPrivyWalletAddress);
    const holdings: TokenHolding[] = [];

    // Check each KOL token for user's balance
    for (const kol of kolsWithTokens) {
      try {
        if (!kol.tokenMintAddress) continue;

        const mintAddress = new PublicKey(kol.tokenMintAddress);
        const ataAddress = await getAssociatedTokenAddress(mintAddress, userPublicKey);
        
        try {
          const tokenAccount = await getAccount(connection, ataAddress);
          const balance = tokenAccount.amount.toString();
          
          // Only include tokens with non-zero balance
          if (balance !== '0') {
            holdings.push({
              ticker: kol.ticker || 'UNKNOWN',
              name: kol.name,
              balance: balance,
              mintAddress: kol.tokenMintAddress,
              poolAddress: kol.poolAddress || undefined
            });
          }
        } catch (error) {
          // ATA doesn't exist, user doesn't hold this token
          console.log(`ℹ️ [getUserKOLTokenHoldings] No ATA found for ${kol.ticker} (${kol.name})`);
        }
      } catch (error) {
        console.error(`❌ [getUserKOLTokenHoldings] Error checking ${kol.ticker}:`, error);
        // Continue with other tokens
      }
    }

    console.log(`✅ [getUserKOLTokenHoldings] Found ${holdings.length} token holdings`);

    return NextResponse.json({
      success: true,
      data: {
        holdings,
        totalHoldings: holdings.length
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [getUserKOLTokenHoldings] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
