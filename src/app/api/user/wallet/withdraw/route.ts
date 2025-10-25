import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

// CORS headers
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { toAddress, amount, userWalletAddress } = body;

    // Trim addresses to remove whitespace
    toAddress = toAddress?.trim();
    userWalletAddress = userWalletAddress?.trim();

    console.log(`💸 [WITHDRAW] Request:`, {
      toAddress,
      amount,
      userWalletAddress,
    });

    // Validate inputs
    if (!toAddress || !amount || !userWalletAddress) {
      return NextResponse.json(
        { error: "Missing required fields: toAddress, amount, userWalletAddress" },
        { status: 400, headers }
      );
    }

    // Validate Solana addresses
    let toPubkey: PublicKey;
    let fromPubkey: PublicKey;

    try {
      toPubkey = new PublicKey(toAddress);
      fromPubkey = new PublicKey(userWalletAddress);
    } catch (error: any) {
      console.error("❌ [WITHDRAW] Invalid address error:", error);
      return NextResponse.json(
        { error: `Invalid Solana address: ${error.message}` },
        { status: 400, headers }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400, headers }
      );
    }

    // Convert SOL to lamports
    const lamports = Math.floor(amountNum * LAMPORTS_PER_SOL);

    // Initialize connection
    const connection = new Connection(
      "https://devnet.helius-rpc.com/?api-key=017f56ed-c6c1-480a-8c11-dbc09ab2358d",
      "confirmed"
    );

    // Check user balance
    const balance = await connection.getBalance(fromPubkey);
    console.log(`💰 [WITHDRAW] User balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    if (balance < lamports) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL` },
        { status: 400, headers }
      );
    }

    // Create transfer transaction FROM user's wallet TO withdrawal address
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey, // User's wallet
        toPubkey,   // Withdrawal destination
        lamports,
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey; // User pays the fee

    // Serialize transaction for client-side signing
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    console.log(`📝 [WITHDRAW] Transaction prepared for user signature`);

    // Return serialized transaction for user to sign on client
    return NextResponse.json(
      {
        success: true,
        transaction: Buffer.from(serializedTransaction).toString("base64"),
        message: "Transaction ready for signing",
      },
      { headers }
    );
  } catch (error: any) {
    console.error("❌ [WITHDRAW] Error:", error);
    return NextResponse.json(
      { error: error.message || "Withdrawal failed" },
      { status: 500, headers }
    );
  }
}
