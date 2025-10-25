import { NextResponse } from 'next/server';
import { Connection, PublicKey, GetMultipleAccountsConfig } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { TokenHolding } from '@/types';
import prisma from '@/lib/prisma';
import { meteoraClient } from '@/lib/meteoraPriceUtils';

// Use Helius RPC for much faster responses
const connection = new Connection(
  "https://devnet.helius-rpc.com/?api-key=017f56ed-c6c1-480a-8c11-dbc09ab2358d",
  "confirmed"
);

// Batch size for RPC requests to avoid rate limits
const BATCH_SIZE = 100;

interface EnrichedTokenHolding extends TokenHolding {
  valueSOL?: number;
  valueUSD?: number;
}

export async function POST(request: Request) {
  try {
    console.log('🔵 [api/user/portfolio] POST endpoint called');

    const body = await request.json();
    const { userPrivyWalletAddress } = body;

    if (!userPrivyWalletAddress) {
      throw new Error('Missing required parameter: userPrivyWalletAddress');
    }

    console.log(`🔍 [api/user/portfolio] Fetching enriched holdings for: ${userPrivyWalletAddress}`);

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
        poolAddress: true,
        avatarUrl: true
      }
    });

    console.log(`📊 [api/user/portfolio-holdings] Found ${kolsWithTokens.length} KOLs with tokens`);

    if (kolsWithTokens.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          holdings: [],
          totalHoldings: 0,
          totalValueUSD: 0,
          totalValueSOL: 0
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

    // Batch the RPC calls to get balances
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
                  poolAddress: kol.poolAddress || undefined,
                  avatarUrl: kol.avatarUrl || undefined
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

    console.log(`✅ [api/user/portfolio] Found ${holdings.length} token holdings`);

    // ⚡ PERFORMANCE FIX: Batch ALL price fetches in parallel instead of sequential
    const enrichedHoldings: EnrichedTokenHolding[] = [];
    let totalValueUSD = 0;
    let totalValueSOL = 0;

    // Get SOL price once for all calculations
    const solPriceUSD = await meteoraClient.getSOLPriceUSD();

    // Fetch ALL prices in parallel
    const pricePromises = holdings.map(async (holding) => {
      if (!holding.poolAddress) {
        return { holding, priceData: null };
      }

      try {
        const priceData = await meteoraClient.getTokenPriceData(
          holding.poolAddress,
          holding.mintAddress
        );
        return { holding, priceData };
      } catch (err) {
        console.warn(`Failed to fetch price for ${holding.ticker}:`, err);
        return { holding, priceData: null };
      }
    });

    // Wait for ALL price fetches to complete
    const priceResults = await Promise.all(pricePromises);

    // Process results and calculate totals
    for (const { holding, priceData } of priceResults) {
      if (priceData) {
        // Calculate value based on balance (assuming 6 decimals for KOL tokens)
        const balance = parseFloat(holding.balance) / 1_000_000;
        const valueUSD = balance * priceData.price;
        const valueSOL = valueUSD / solPriceUSD;

        enrichedHoldings.push({
          ...holding,
          tokenPrice: priceData.price.toString(),
          priceChange24h: priceData.priceChange24h.toString(),
          priceChange24hPercent: priceData.priceChange24hPercent,
          valueUSD,
          valueSOL
        });

        totalValueUSD += valueUSD;
        totalValueSOL += valueSOL;

        console.log(`💰 [${holding.ticker}] Balance: ${balance.toFixed(2)} | Price: $${priceData.price.toFixed(6)} | Value: $${valueUSD.toFixed(2)}`);
      } else {
        enrichedHoldings.push(holding);
      }
    }

    console.log(`✅ [api/user/portfolio] Total portfolio value: $${totalValueUSD.toFixed(2)} (${totalValueSOL.toFixed(4)} SOL)`);

    return NextResponse.json({
      success: true,
      data: {
        holdings: enrichedHoldings,
        totalHoldings: enrichedHoldings.length,
        totalValueUSD,
        totalValueSOL
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [api/user/portfolio] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
