import { NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import prisma from '@/lib/prisma';
import { MeteoraAPIClient } from '@/lib/meteoraPriceUtils';

// Use Helius devnet RPC for better performance (same as getPortfolioValue)
const HELIUS_RPC_URL = "https://devnet.helius-rpc.com/?api-key=017f56ed-c6c1-480a-8c11-dbc09ab2358d";
const connection = new Connection(HELIUS_RPC_URL, "confirmed");
const meteoraClient = new MeteoraAPIClient();

interface TokenBalance {
  mint: string;
  amount: string;
  decimals: number;
}

export async function POST(request: Request) {
  try {
    console.log('🔵 [updatePortfolio] POST endpoint called');

    const body = await request.json();
    const { userPrivyWalletAddress } = body;

    if (!userPrivyWalletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const userPublicKey = new PublicKey(userPrivyWalletAddress);

    // Step 1: Get SOL price in USD (exact same source)
    const solPriceUSD = await meteoraClient.getSOLPriceUSD();

    // Step 2: Get SOL balance and USD value
    const solBalanceLamports = await connection.getBalance(userPublicKey);
    const solAmount = solBalanceLamports / LAMPORTS_PER_SOL;
    const solValueUSD = solAmount * solPriceUSD;

    // Step 3: Get all token accounts (Helius DAS API, same method)
    let tokenBalances: TokenBalance[] = [];
    try {
      const response = await fetch(HELIUS_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'portfolio-update',
          method: 'getTokenAccountsByOwner',
          params: [
            userPrivyWalletAddress,
            { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
            { encoding: 'jsonParsed' }
          ]
        })
      });
      const data = await response.json();
      if (data.result?.value) {
        tokenBalances = data.result.value
          .map((account: any) => {
            const parsedInfo = account.account.data.parsed.info;
            return {
              mint: parsedInfo.mint,
              amount: parsedInfo.tokenAmount.amount,
              decimals: parsedInfo.tokenAmount.decimals,
            } as TokenBalance;
          })
          .filter((token: TokenBalance) => token.amount !== '0');
      }
    } catch (err) {
      console.error('❌ [updatePortfolio] Error fetching token accounts:', err);
    }

    // Step 4: Map KOL tokens from DB (same query/shape)
    const kolsWithTokens = await prisma.trader.findMany({
      where: { tokenMintAddress: { not: null }, period: 'DAILY' },
      select: { name: true, ticker: true, tokenMintAddress: true, poolAddress: true }
    });

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

    // Step 5: Fetch price data for held KOL tokens (same batch method)
    const poolAddresses = tokenBalances
      .map(token => mintToPoolMap.get(token.mint)?.poolAddress)
      .filter(Boolean) as string[];

    const priceDataMap = await meteoraClient.batchGetTokenPriceData(poolAddresses);

    // Step 6: Calculate total portfolio USD value identically
    let totalValueUSD = solAmount * solPriceUSD;
    for (const token of tokenBalances) {
      const kolInfo = mintToPoolMap.get(token.mint);
      if (!kolInfo) continue;
      const priceData = priceDataMap.get(kolInfo.poolAddress);
      if (!priceData || priceData.price <= 0) continue;
      const tokenAmount = Number(token.amount) / Math.pow(10, token.decimals);
      const tokenPriceUSD = priceData.price; // already USD
      const tokenValueUSD = tokenAmount * tokenPriceUSD;
      if (tokenValueUSD > 0) {
        totalValueUSD += tokenValueUSD;
      }
    }

    // Step 7: Persist to user portfolio (same upsert shape as prior implementation)
    const user = await prisma.user.upsert({
      where: { userPrivyWalletAddress },
      update: { portfolio: totalValueUSD },
      create: { userPrivyWalletAddress, portfolio: totalValueUSD }
    });

    console.log(`✅ Updated portfolio for ${userPrivyWalletAddress}: $${totalValueUSD.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      portfolio: totalValueUSD,
      userId: user.id
    });
  } catch (error: any) {
    console.error('❌ [updatePortfolio] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
