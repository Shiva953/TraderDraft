import { NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import BN from 'bn.js';

const connection = new Connection("https://devnet.helius-rpc.com/?api-key=017f56ed-c6c1-480a-8c11-dbc09ab2358d", "confirmed");
const cpAmm = new CpAmm(connection);

// Fee wallet that receives 5% LP fee from all swaps
const FEE_WALLET = new PublicKey(process.env.FEE_WALLET_ADDRESS || "J44xsPDANdxRCz7NjiX15maK5tBKRJ4fpD7ZvTXFBPyC");

export async function POST(request: Request) {
  console.log("🔄 [SWAP API] POST /swapMeteoraToken invoked");

  try {
    const body = await request.json();
    const { poolAddress, inputTokenMint, outputTokenMint, amountIn, slippage, userWallet } = body;

    console.log("📝 [SWAP] Request params:", {
      poolAddress,
      inputTokenMint,
      outputTokenMint,
      amountIn,
      slippage,
      userWallet
    });

    // Validate required parameters
    if (!poolAddress || !inputTokenMint || !outputTokenMint || !amountIn || slippage === undefined || !userWallet) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameters"
      }, { status: 400 });
    }

    // Convert addresses to PublicKey
    const poolPubkey = new PublicKey(poolAddress);
    const inputMint = new PublicKey(inputTokenMint);
    const outputMint = new PublicKey(outputTokenMint);
    const userPubkey = new PublicKey(userWallet);

    console.log("🔍 [SWAP] Fetching pool state...");
    // Fetch pool state
    const poolState = await cpAmm.fetchPoolState(poolPubkey);
    console.log("✅ [SWAP] Pool state fetched:", {
      tokenAMint: poolState.tokenAMint.toString(),
      tokenBMint: poolState.tokenBMint.toString(),
      tokenAVault: poolState.tokenAVault.toString(),
      tokenBVault: poolState.tokenBVault.toString()
    });

    // Get current slot and block time
    const currentSlot = await connection.getSlot();
    const blockTime = await connection.getBlockTime(currentSlot);

    console.log("💱 [SWAP] Getting quote...");
    // Determine token decimals based on pool configuration
    const tokenADecimal = 6;
    const tokenBDecimal = 9;

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

    console.log("✅ [SWAP] Quote received:", {
      swapInAmount: quote.swapInAmount.toString(),
      swapOutAmount: quote.swapOutAmount.toString(),
      minSwapOutAmount: quote.minSwapOutAmount.toString(),
      totalFee: quote.totalFee.toString(),
      priceImpact: quote.priceImpact
    });

    console.log("🔨 [SWAP] Building swap transaction...");

    // Get fee wallet's ATA for the OUTPUT token (fee is paid in output token)
    const feeWalletATA = await getAssociatedTokenAddress(
      outputMint,
      FEE_WALLET,
      true // allowOwnerOffCurve - allow PDA/program-owned accounts
    );
    console.log("💰 [SWAP] Fee wallet ATA for output token:", feeWalletATA.toString());

    // Check if fee wallet ATA exists, if not create it
    console.log("🔍 [SWAP] Checking if fee wallet ATA exists...");
    const feeWalletATAInfo = await connection.getAccountInfo(feeWalletATA);

    // Build swap transaction with 5% LP fee going to fee wallet
    const swapTx = await cpAmm.swap({
      payer: userPubkey,
      pool: poolPubkey,
      inputTokenMint: inputMint,
      outputTokenMint: outputMint,
      amountIn: new BN(amountIn),
      minimumAmountOut: quote.minSwapOutAmount,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAProgram: TOKEN_PROGRAM_ID,
      tokenBProgram: TOKEN_PROGRAM_ID,
      referralTokenAccount: feeWalletATA, // 5% LP fee goes to fee wallet
    });

    // If fee wallet ATA doesn't exist, prepend create ATA instruction
    if (!feeWalletATAInfo) {
      console.log("⚠️ [SWAP] Fee wallet ATA does not exist, adding create ATA instruction");
      const createATAIx = createAssociatedTokenAccountInstruction(
        userPubkey, // payer
        feeWalletATA, // ata address
        FEE_WALLET, // owner
        outputMint // mint
      );
      swapTx.instructions.unshift(createATAIx);
      console.log("✅ [SWAP] Create ATA instruction added to transaction");
    } else {
      console.log("✅ [SWAP] Fee wallet ATA already exists");
    }

    console.log("✅ [SWAP] Transaction built successfully");

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    swapTx.recentBlockhash = blockhash;
    swapTx.feePayer = userPubkey;

    console.log("📤 [SWAP] Serializing transaction for client signing...");
    // Serialize the transaction
    const serializedTx = swapTx.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');

    console.log("✅ [SWAP] Returning transaction to client");
    return NextResponse.json({
      success: true,
      data: {
        transaction: serializedTx,
        quote: {
          swapInAmount: quote.swapInAmount.toString(),
          swapOutAmount: quote.swapOutAmount.toString(),
          minSwapOutAmount: quote.minSwapOutAmount.toString(),
          totalFee: quote.totalFee.toString(),
          priceImpact: quote.priceImpact
        },
        blockhash,
        lastValidBlockHeight
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
    console.error("❌ [SWAP API] Error:", error);
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
