import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';
import BN from 'bn.js';

const connection = new Connection("https://devnet.helius-rpc.com/?api-key=017f56ed-c6c1-480a-8c11-dbc09ab2358d", "confirmed");
const cpAmm = new CpAmm(connection);

export async function POST(request: Request) {
  console.log("💱 [QUOTE API] POST /getMeteoraQuote invoked");

  try {
    const body = await request.json();
    const { poolAddress, inputTokenMint, outputTokenMint, amountIn, slippage } = body;

    console.log("📝 [QUOTE] Request params:", {
      poolAddress,
      inputTokenMint,
      outputTokenMint,
      amountIn,
      slippage
    });

    // Validate required parameters
    if (!poolAddress || !inputTokenMint || !outputTokenMint || !amountIn || slippage === undefined) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameters"
      }, { status: 400 });
    }

    // Convert addresses to PublicKey
    const poolPubkey = new PublicKey(poolAddress);
    const inputMint = new PublicKey(inputTokenMint);
    const outputMint = new PublicKey(outputTokenMint);

    console.log("🔍 [QUOTE] Fetching pool state...");
    // Fetch pool state
    const poolState = await cpAmm.fetchPoolState(poolPubkey);
    console.log("✅ [QUOTE] Pool state fetched");
    console.log("🔍 [QUOTE] Pool token mints:", {
      tokenAMint: poolState.tokenAMint.toString(),
      tokenBMint: poolState.tokenBMint.toString(),
      inputTokenMint: inputMint.toString(),
      outputTokenMint: outputMint.toString()
    });

    // Get current slot and block time
    const currentSlot = await connection.getSlot();
    const blockTime = await connection.getBlockTime(currentSlot);

    // Determine token decimals based on pool configuration
    // Check which token is SOL (9 decimals) and which is KOL (6 decimals)
    const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";
    const isSolTokenA = poolState.tokenAMint.toString() === NATIVE_SOL_MINT;

    const tokenADecimal = isSolTokenA ? 9 : 6;
    const tokenBDecimal = isSolTokenA ? 6 : 9;

    console.log("💱 [QUOTE] Token decimals:", { tokenADecimal, tokenBDecimal });
    console.log("💱 [QUOTE] Calculating quote...");

    // Get swap quote
    const quote = await cpAmm.getQuote({
      inAmount: new BN(amountIn),
      inputTokenMint: inputMint,
      slippage: slippage,
      poolState,
      currentTime: blockTime!,
      currentSlot,
      tokenADecimal,
      tokenBDecimal
    });

    console.log("✅ [QUOTE] Quote calculated:", {
      swapInAmount: quote.swapInAmount.toString(),
      swapOutAmount: quote.swapOutAmount.toString(),
      minSwapOutAmount: quote.minSwapOutAmount.toString(),
      totalFee: quote.totalFee.toString(),
      priceImpact: quote.priceImpact
    });

    return NextResponse.json({
      success: true,
      data: {
        quote: {
          swapInAmount: quote.swapInAmount.toString(),
          swapOutAmount: quote.swapOutAmount.toString(),
          minSwapOutAmount: quote.minSwapOutAmount.toString(),
          totalFee: quote.totalFee.toString(),
          priceImpact: quote.priceImpact
        }
      }
    }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error("❌ [QUOTE API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
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
