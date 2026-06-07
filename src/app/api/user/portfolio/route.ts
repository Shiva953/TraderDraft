import { NextResponse } from 'next/server';
import { TokenHolding } from '@/types';
import prisma from '@/lib/prisma';
import { meteoraClient } from '@/lib/meteoraPriceUtils';

// Use Helius RPC for much faster responses
const HELIUS_RPC_URL = "https://devnet.helius-rpc.com/?api-key=017f56ed-c6c1-480a-8c11-dbc09ab2358d";

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

    // ⚡ OPTIMIZATION: Parallelize independent data fetching operations
    console.log(`⚡ [OPTIMIZATION] Fetching token accounts, KOL data, and SOL price in parallel...`);

    const [tokenAccountsResponse, kolsWithTokens, solPriceUSD] = await Promise.all([
      // 1. Get all user's token accounts - Try V2 first, fallback to V1
      (async () => {
        try {
          // Try getTokenAccountsByOwnerV2 first
          console.log(`🔄 [FETCH] Attempting getTokenAccountsByOwnerV2...`);
          const v2Response = await fetch(HELIUS_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 'portfolio-holdings-v2',
              method: 'getTokenAccountsByOwnerV2',
              params: [
                userPrivyWalletAddress,
                { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                {
                  encoding: 'jsonParsed',
                  limit: 10000
                }
              ]
            })
          });

          const v2Json = await v2Response.json();
          console.log(`🔍 [FETCH DEBUG V2] Response status: ${v2Response.status}`);

          // Direct array check
          const resultValue = v2Json?.result?.value;
          console.log(`🔍 [FETCH DEBUG V2] resultValue exists:`, !!resultValue);
          console.log(`🔍 [FETCH DEBUG V2] resultValue type:`, typeof resultValue);
          console.log(`🔍 [FETCH DEBUG V2] resultValue is Array:`, Array.isArray(resultValue));
          console.log(`🔍 [FETCH DEBUG V2] resultValue length:`, resultValue?.length);

          // Check if it has array methods
          if (resultValue) {
            console.log(`🔍 [FETCH DEBUG V2] Has forEach:`, typeof resultValue.forEach === 'function');
            console.log(`🔍 [FETCH DEBUG V2] Has map:`, typeof resultValue.map === 'function');
            console.log(`🔍 [FETCH DEBUG V2] Constructor:`, resultValue.constructor?.name);

            // Check first item
            if (resultValue.length > 0) {
              console.log(`🔍 [FETCH DEBUG V2] First item exists:`, !!resultValue[0]);
              console.log(`🔍 [FETCH DEBUG V2] First item keys:`, resultValue[0] ? Object.keys(resultValue[0]) : 'none');
            }
          }

          // Check for JSON-RPC error (method not found, etc.)
          if (v2Json.error) {
            console.warn(`⚠️ [V2 FAILED] Error: ${v2Json.error.message || JSON.stringify(v2Json.error)}`);
            console.log(`🔄 [FALLBACK] Trying getTokenAccountsByOwner (V1)...`);

            // Fallback to V1
            const v1Response = await fetch(HELIUS_RPC_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'portfolio-holdings-v1',
                method: 'getTokenAccountsByOwner',
                params: [
                  userPrivyWalletAddress,
                  { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                  { encoding: 'jsonParsed' }
                ]
              })
            });

            const v1Json = await v1Response.json();
            console.log(`✅ [V1 FALLBACK] Response status: ${v1Response.status}`);

            if (v1Json.error) {
              console.error('❌ [V1 ERROR]:', v1Json.error);
              return { result: null, error: v1Json.error };
            }

            return v1Json;
          }

          console.log(`✅ [V2 SUCCESS] Got response`);
          return v2Json;
        } catch (err) {
          console.error('❌ [FETCH ERROR]:', err);
          return { result: null };
        }
      })(),

      // 2. Get all KOLs with token mint addresses from database
      prisma.trader.findMany({
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
      }),

      // 3. Get SOL price for USD calculations
      meteoraClient.getSOLPriceUSD()
    ]);

    console.log(`📊 [api/user/portfolio] Found ${kolsWithTokens.length} KOLs with tokens`);

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

    // Create a map of mint address to KOL data for fast lookups
    const mintToKolMap = new Map<string, typeof kolsWithTokens[0]>();
    kolsWithTokens.forEach(kol => {
      if (kol.tokenMintAddress) {
        mintToKolMap.set(kol.tokenMintAddress, kol);
      }
    });

    // Parse token accounts response and filter for KOL tokens only
    const holdings: TokenHolding[] = [];

    // FIXED: result.value.accounts contains the array, not result.value directly!
    if (tokenAccountsResponse.result?.value?.accounts && Array.isArray(tokenAccountsResponse.result.value.accounts)) {
      const accountsArray = tokenAccountsResponse.result.value.accounts;

      console.log(`📊 [TOKEN PARSE] Processing ${accountsArray.length} token accounts from result.value.accounts`);

      accountsArray.forEach((account: any) => {
        try {
          const parsedInfo = account.account.data.parsed.info;
          const tokenAmount = parsedInfo.tokenAmount;
          const mintAddress = parsedInfo.mint;

          // Only include if it's a KOL token and has non-zero balance
          const kolInfo = mintToKolMap.get(mintAddress);
          if (kolInfo && tokenAmount.amount !== '0') {
            holdings.push({
              ticker: kolInfo.ticker || 'UNKNOWN',
              name: kolInfo.name,
              balance: tokenAmount.amount,
              mintAddress: mintAddress,
              poolAddress: kolInfo.poolAddress || undefined,
              avatarUrl: kolInfo.avatarUrl || undefined
            });
          }
        } catch (parseError) {
          console.warn(`⚠️ [TOKEN PARSE] Error parsing token account:`, parseError);
        }
      });
    } else {
      console.error(`❌ [TOKEN PARSE] No result.value.accounts array in response!`);
      if (tokenAccountsResponse.error) {
        console.error(`❌ [TOKEN PARSE] API Error:`, tokenAccountsResponse.error);
      }
    }

    console.log(`✅ [api/user/portfolio] Found ${holdings.length} KOL token holdings`);

    if (holdings.length === 0) {
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

    // ⚡ OPTIMIZATION: Use batchGetTokenPriceData for parallel price fetching
    // NOTE: Don't pass mintAddresses to skip expensive holders count calculation (takes ~500ms per token!)
    const poolAddresses = holdings
      .filter(h => h.poolAddress)
      .map(h => h.poolAddress!);

    console.log(`💹 [api/user/portfolio] Fetching prices for ${poolAddresses.length} tokens in parallel (skipping holders count)...`);

    const priceDataMap = await meteoraClient.batchGetTokenPriceData(poolAddresses);

    // Process results and calculate totals
    const enrichedHoldings: EnrichedTokenHolding[] = [];
    let totalValueUSD = 0;
    let totalValueSOL = 0;

    for (const holding of holdings) {
      if (!holding.poolAddress) {
        enrichedHoldings.push(holding);
        continue;
      }

      const priceData = priceDataMap.get(holding.poolAddress);

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
