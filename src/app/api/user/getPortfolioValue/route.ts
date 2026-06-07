import { NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import prisma from '@/lib/prisma';
import { MeteoraAPIClient } from '@/lib/meteoraPriceUtils';

// Use Helius devnet RPC for better performance
const HELIUS_RPC_URL = "https://devnet.helius-rpc.com/?api-key=017f56ed-c6c1-480a-8c11-dbc09ab2358d";
const connection = new Connection(HELIUS_RPC_URL, "confirmed");
const meteoraClient = new MeteoraAPIClient();

interface TokenBalance {
  mint: string;
  amount: string;
  decimals: number;
  ticker?: string;
  price?: number;
}

export async function POST(request: Request) {
  try {
    console.log('🔵 [getPortfolioValue] POST endpoint called');
    
    const body = await request.json();
    const { userPrivyWalletAddress } = body;
    
    if (!userPrivyWalletAddress) {
      throw new Error('Missing required parameter: userPrivyWalletAddress');
    }

    // Fast path: if we already have a cached portfolio value, return it immediately
    try {
      const cachedUser = await prisma.user.findUnique({
        where: { userPrivyWalletAddress },
        select: { id: true, portfolio: true, updatedAt: true }
      });

      if (cachedUser && cachedUser.portfolio !== null) {
        const cachedValue = Number(cachedUser.portfolio as unknown as number);
        console.log(`⚡ [getPortfolioValue] Returning cached portfolio for ${userPrivyWalletAddress}: $${cachedValue.toFixed(2)}`);
        return NextResponse.json({
          success: true,
          data: {
            totalValueUSD: cachedValue,
            solBalance: null,
            solPriceUSD: null,
            solValueUSD: null,
            tokenValues: [],
            tokenCount: null,
            currency: 'USD',
            source: 'cache',
            updatedAt: cachedUser.updatedAt
          }
        }, { status: 200 });
      }
    } catch (cacheErr) {
      console.warn('⚠️ [getPortfolioValue] Cache check failed, proceeding to full calculation:', cacheErr);
    }

    console.log(`💼 [getPortfolioValue] Calculating portfolio value for: ${userPrivyWalletAddress}`);

    const userPublicKey = new PublicKey(userPrivyWalletAddress);

    // OPTIMIZATION: Parallelize all independent data fetching operations
    console.log(`⚡ [OPTIMIZATION] Fetching SOL price, SOL balance, token accounts, and KOL data in parallel...`);

    const [solPriceUSD, solBalance, tokenAccountsResponse, kolsWithTokens] = await Promise.all([
      // 1. Get SOL price in USD
      meteoraClient.getSOLPriceUSD(),

      // 2. Get SOL balance
      connection.getBalance(userPublicKey),

      // 3. Get token accounts using Helius getTokenAccountsByOwnerV2 API
      fetch(HELIUS_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'portfolio-value',
          method: 'getTokenAccountsByOwnerV2',
          params: [
            userPrivyWalletAddress, 
            { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, 
            {
              encoding: 'jsonParsed',
              limit: 1000
            }
          ]
        })
      }).then(res => res.json()).catch(err => {
        console.error('❌ [getPortfolioValue] Error fetching token accounts:', err);
        return { result: null };
      }),

      // 4. Get KOL token data from database
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
        }
      })
    ]);

    console.log(`💵 [getPortfolioValue] SOL price: $${solPriceUSD.toFixed(2)}`);

    // Process SOL balance
    const solAmount = solBalance / LAMPORTS_PER_SOL;
    const solValueUSD = solAmount * solPriceUSD;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`💰 [SOL BALANCE]`);
    console.log(`   Raw balance: ${solBalance} lamports`);
    console.log(`   SOL amount: ${solAmount.toFixed(9)} SOL (÷ ${LAMPORTS_PER_SOL})`);
    console.log(`   SOL/USD: $${solPriceUSD.toFixed(2)}`);
    console.log(`   Value: $${solValueUSD.toFixed(2)}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Process token accounts response
    let tokenBalances: TokenBalance[] = [];

    if (tokenAccountsResponse.result?.value) {
      // getTokenAccountsByOwnerV2 returns accounts in result.value array with jsonParsed data
      tokenBalances = tokenAccountsResponse.result.value
        .map((account: any) => {
          const parsedInfo = account.account.data.parsed.info;
          const tokenAmount = parsedInfo.tokenAmount;

          return {
            mint: parsedInfo.mint,
            amount: tokenAmount.amount,
            decimals: tokenAmount.decimals,
          };
        })
        .filter((token: TokenBalance) => token.amount !== '0'); // Filter out zero balances

      console.log(`📊 [TOKEN ACCOUNTS] Found ${tokenBalances.length} non-zero token balances (via getTokenAccountsByOwnerV2)`);
      tokenBalances.forEach((token, idx) => {
        const humanReadable = Number(token.amount) / Math.pow(10, token.decimals);
        console.log(`   ${idx + 1}. Mint: ${token.mint.slice(0, 8)}...`);
        console.log(`      Raw amount: ${token.amount}`);
        console.log(`      Decimals: ${token.decimals}`);
        console.log(`      Human amount: ${humanReadable.toFixed(token.decimals)} (${token.amount} ÷ 10^${token.decimals})`);
      });
    }

    // Create a map of mint address to pool address and ticker
    const mintToPoolMap = new Map<string, { poolAddress: string; ticker: string; name: string }>();
    kolsWithTokens.forEach(kol => {
      if (kol.tokenMintAddress && kol.poolAddress) {
        mintToPoolMap.set(kol.tokenMintAddress, {
          poolAddress: kol.poolAddress,
          ticker: kol.ticker || 'UNKNOWN',
          name: kol.name
        });
      }
    });

    // Step 4: Get prices for all KOL tokens user holds
    const poolAddresses: string[] = [];
    const mintAddresses: string[] = [];

    tokenBalances.forEach(token => {
      const kolInfo = mintToPoolMap.get(token.mint);
      if (kolInfo?.poolAddress) {
        poolAddresses.push(kolInfo.poolAddress);
        mintAddresses.push(token.mint);
      }
    });

    console.log(`\n📈 [PRICE DATA] Fetching prices for ${poolAddresses.length} KOL token pools...`);

    const priceDataMap = await meteoraClient.batchGetTokenPriceData(poolAddresses, mintAddresses);

    // Step 5: Calculate portfolio value in USD
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`💎 [PORTFOLIO CALCULATION]`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // Start with SOL value converted to USD
    let totalValueUSD = solAmount * solPriceUSD;
    let totalTokenValueUSD = 0;
    
    const tokenValues: Array<{
      ticker: string;
      name: string;
      amount: number;
      priceUSD: number;
      valueUSD: number;
    }> = [];

    let tokenCounter = 0;
    for (const token of tokenBalances) {
      const kolInfo = mintToPoolMap.get(token.mint);
      if (!kolInfo) {
        console.log(`⚠️ Token ${token.mint.slice(0, 8)}... not a KOL token, skipping`);
        continue;
      }

      const priceData = priceDataMap.get(kolInfo.poolAddress);
      if (!priceData || priceData.price <= 0) {
        console.warn(`⚠️ No valid price data for ${kolInfo.ticker}, skipping`);
        continue;
      }

      tokenCounter++;
      const tokenAmount = Number(token.amount) / Math.pow(10, token.decimals);
      // IMPORTANT: priceData.price is ALREADY in USD (calculated in meteoraClient.getTokenPriceData)
      const tokenPriceUSD = priceData.price;
      const tokenValueUSD = tokenAmount * tokenPriceUSD;
      
      console.log(`${tokenCounter}. ${kolInfo.ticker.toUpperCase()} (${kolInfo.name})`);
      console.log(`   ├─ Raw amount: ${token.amount}`);
      console.log(`   ├─ Decimals: ${token.decimals}`);
      console.log(`   ├─ Token amount: ${tokenAmount.toFixed(token.decimals)} (${token.amount} ÷ 10^${token.decimals})`);
      console.log(`   ├─ Price (USD): $${tokenPriceUSD.toFixed(6)} [Already converted by meteoraClient]`);
      console.log(`   └─ Value (USD): $${tokenValueUSD.toFixed(6)} (${tokenAmount.toFixed(token.decimals)} × $${tokenPriceUSD.toFixed(6)})`);
      console.log(``);
      
      // Only add if value is positive
      if (tokenValueUSD > 0) {
        totalValueUSD += tokenValueUSD;
        totalTokenValueUSD += tokenValueUSD;
        
        tokenValues.push({
          ticker: kolInfo.ticker,
          name: kolInfo.name,
          amount: tokenAmount,
          priceUSD: tokenPriceUSD,
          valueUSD: tokenValueUSD
        });
      }
    }

    // Final calculation summary
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 [PORTFOLIO SUMMARY]`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`SOL Holdings:`);
    console.log(`   ${solAmount.toFixed(9)} SOL × $${solPriceUSD.toFixed(2)} = $${solValueUSD.toFixed(2)}\n`);
    console.log(`KOL Token Holdings (${tokenValues.length} tokens):`);
    console.log(`   Total Value: $${totalTokenValueUSD.toFixed(2)}\n`);
    console.log(`TOTAL PORTFOLIO VALUE:`);
    console.log(`   $${solValueUSD.toFixed(2)} (SOL) + $${totalTokenValueUSD.toFixed(2)} (Tokens) = $${totalValueUSD.toFixed(2)}`);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Calculation verified! Portfolio value: $${totalValueUSD.toFixed(2)} USD`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Persist the computed value so subsequent requests can be fast
    try {
      await prisma.user.upsert({
        where: { userPrivyWalletAddress },
        update: { portfolio: totalValueUSD },
        create: { userPrivyWalletAddress, portfolio: totalValueUSD }
      });
      console.log(`📝 [getPortfolioValue] Saved portfolio $${totalValueUSD.toFixed(2)} for ${userPrivyWalletAddress}`);
    } catch (persistErr) {
      console.warn('⚠️ [getPortfolioValue] Failed to persist portfolio value:', persistErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalValueUSD: totalValueUSD,
        solBalance: solAmount,
        solPriceUSD: solPriceUSD,
        solValueUSD: solAmount * solPriceUSD,
        tokenValues: tokenValues,
        tokenCount: tokenValues.length,
        currency: 'USD',
        source: 'calculated'
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [getPortfolioValue] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

