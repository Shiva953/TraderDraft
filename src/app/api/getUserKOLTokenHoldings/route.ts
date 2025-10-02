import { NextResponse } from 'next/server';
import { Connection, PublicKey, GetMultipleAccountsConfig } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { TokenHolding } from '@/types';
import prisma from '@/lib/prisma';

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Batch size for RPC requests to avoid rate limits
const BATCH_SIZE = 100;

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
        period: 'DAILY'
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
    
    // Pre-compute all ATAs and create mapping
    const ataPromises = kolsWithTokens
      .filter(kol => kol.tokenMintAddress)
      .map(async (kol) => {
        try {
          const mintAddress = new PublicKey(kol.tokenMintAddress!);
          const ataAddress = await getAssociatedTokenAddress(mintAddress, userPublicKey);
          return { kol, ataAddress };
        } catch (error) {
          console.warn(`Invalid mint address for ${kol.ticker}: ${kol.tokenMintAddress}`);
          return null;
        }
      });

    const ataResults = (await Promise.all(ataPromises)).filter(Boolean) as Array<{
      kol: typeof kolsWithTokens[0];
      ataAddress: PublicKey;
    }>;

    // Batch the RPC calls
    const holdings: TokenHolding[] = [];
    
    for (let i = 0; i < ataResults.length; i += BATCH_SIZE) {
      const batch = ataResults.slice(i, i + BATCH_SIZE);
      const ataAddresses = batch.map(item => item.ataAddress);
      
      try {
        // Batch fetch all accounts in this batch
        const accounts = await connection.getMultipleAccountsInfo(
          ataAddresses,
          { commitment: "confirmed" } as GetMultipleAccountsConfig
        );

        // Process results
        for (let j = 0; j < accounts.length; j++) {
          const account = accounts[j];
          const { kol } = batch[j];

          if (account && account.data.length > 0) {
            try {
              // Parse SPL token account data (balance is at bytes 64-72)
              const balanceBuffer = account.data.slice(64, 72);
              const balance = Buffer.from(balanceBuffer).readBigUInt64LE().toString();
              
              if (balance !== '0') {
                holdings.push({
                  ticker: kol.ticker || 'UNKNOWN',
                  name: kol.name,
                  balance: balance,
                  mintAddress: kol.tokenMintAddress!,
                  poolAddress: kol.poolAddress || undefined
                });
              }
            } catch (parseError) {
              console.warn(`Error parsing account data for ${kol.ticker}:`, parseError);
            }
          }
        }
      } catch (batchError) {
        console.error(`Error in batch ${i}-${i + BATCH_SIZE}:`, batchError);
        // Continue with next batch instead of failing entirely
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
  }
}