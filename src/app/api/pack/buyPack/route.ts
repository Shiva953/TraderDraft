import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { VersionedTransaction, Keypair, Connection, PublicKey, LAMPORTS_PER_SOL, TransactionMessage } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Pnlpackprogram, IDL } from '@/lib/idl';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { BN } from 'bn.js';
import prisma from "@/lib/prisma";

const connection = new Connection("https://api.devnet.solana.com", {commitment: "confirmed"})


export async function POST(request: Request) {
  const debugPrefix = '[buyPack]';
  try {
    console.log(`${debugPrefix} 🔵 POST endpoint called`);
    
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log(`${debugPrefix} 🟢 Parsed request body:`, body);
    } catch (parseErr) {
      console.error(`${debugPrefix} ❌ Failed to parse request body:`, parseErr);
      throw new Error('Invalid JSON in request body');
    }

    const { userPrivyWalletAddress, amount, walletId } = body;
    if (!userPrivyWalletAddress || !amount) {
      console.error(`${debugPrefix} ❌ Missing required parameters: userPrivyWalletAddress and amount`);
      throw new Error('Missing required parameters: userPrivyWalletAddress and amount');
    }
    console.log(`${debugPrefix} 🟡 userPrivyWalletAddress: ${userPrivyWalletAddress}, amount: ${amount}, walletId: ${walletId}`);

    // Privy client instantiation
    try {
      if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
        console.error(`${debugPrefix} ❌ Privy env variables missing`);
        throw new Error('Privy environment variables not set');
      }
    } catch (privyEnvErr) {
      console.error(`${debugPrefix} ❌ Error with Privy env variables:`, privyEnvErr);
      throw privyEnvErr;
    }
    const privy = new PrivyClient(process.env.NEXT_PUBLIC_PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);

    // Admin keypair
    const adminPrivateKey = process.env.ADMIN_KEYPAIR;
    if (!adminPrivateKey) {
      console.error(`${debugPrefix} ❌ ADMIN_KEYPAIR env variable missing`);
      throw new Error('ADMIN_KEYPAIR environment variable not set');
    }

    let secretKey: Uint8Array;
    try {
      const arr = JSON.parse(adminPrivateKey);
      if (!Array.isArray(arr) || arr.some(n => typeof n !== 'number')) {
        throw new Error('ADMIN_KEYPAIR must be a JSON array of numbers');
      }
      secretKey = Uint8Array.from(arr);
      console.log(`${debugPrefix} 🟢 Parsed ADMIN_KEYPAIR successfully`);
    } catch (e) {
      console.error(`${debugPrefix} ❌ Failed to parse ADMIN_KEYPAIR:`, e);
      throw new Error('ADMIN_KEYPAIR must be a JSON array string, e.g. "[1,2,3,...]"');
    }

    let adminKeypair;
    try {
      adminKeypair = Keypair.fromSecretKey(secretKey);
      console.log(`${debugPrefix} 🔑 Loaded admin keypair. Pubkey: ${adminKeypair.publicKey.toBase58()}`);
    } catch (e) {
      console.error(`${debugPrefix} ❌ Error loading admin keypair:`, e);
      throw e;
    }

    let adminWallet, provider, program;
    try {
      adminWallet = new NodeWallet(adminKeypair);
      provider = new AnchorProvider(connection, adminWallet, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      });
      program = new Program<Pnlpackprogram>(IDL, provider);
      console.log(`${debugPrefix} 🟢 Anchor provider and program initialized`);
    } catch (e) {
      console.error(`${debugPrefix} ❌ Error initializing Anchor provider/program:`, e);
      throw e;
    }

    // Use hardcoded global pack pool address
    const globalPackPool = new PublicKey("4AjtpSua4zndvhs4y3zCxyLSvQm1SFpZqD5W76PEkmid");
    console.log(`${debugPrefix} 🟡 globalPackPool PDA: ${globalPackPool.toBase58()}`);
    
    // Calculate amounts
    const amountInLamports = amount * LAMPORTS_PER_SOL;
    const numberOfPacksBought = Math.floor(amount / 0.1);
    console.log(`${debugPrefix} 🟠 amount: ${amount}, amountInLamports: ${amountInLamports}, numberOfPacksBought: ${numberOfPacksBought}`);

    // Create the instruction for transferring to pack pool
    let buyIxn;
    try {
      buyIxn = await program.methods.transferToPackPool(new BN(amountInLamports))
        .accountsPartial({
          globalPackPool: globalPackPool,
          user: new PublicKey(userPrivyWalletAddress),
        })
        .instruction();
      console.log(`${debugPrefix} 🟣 Created transferToPackPool instruction`);
    } catch (e) {
      console.error(`${debugPrefix} ❌ Error creating transferToPackPool instruction:`, e);
      throw e;
    }

    // Create the transaction message
    let recentBlockhash;
    try {
      recentBlockhash = (await connection.getLatestBlockhash({commitment: "confirmed"})).blockhash;
      console.log(`${debugPrefix} 🔵 Recent blockhash: ${recentBlockhash}`);
    } catch (e) {
      console.error(`${debugPrefix} ❌ Error fetching recent blockhash:`, e);
      throw e;
    }
    
    let message;
    try {
      message = new TransactionMessage({
        payerKey: new PublicKey(userPrivyWalletAddress),
        instructions: [buyIxn],
        recentBlockhash,
      });
      console.log(`${debugPrefix} 🟢 TransactionMessage created`);
    } catch (e) {
      console.error(`${debugPrefix} ❌ Error creating TransactionMessage:`, e);
      throw e;
    }

    let buyTx;
    try {
      buyTx = new VersionedTransaction(message.compileToV0Message());
      console.log(`${debugPrefix} 🟢 Compiled VersionedTransaction`);
    } catch (e) {
      console.error(`${debugPrefix} ❌ Error compiling VersionedTransaction:`, e);
      throw e;
    }

    // Serialize transaction to base64 for easier transmission
    let serializedTx;
    try {
      serializedTx = Buffer.from(buyTx.serialize()).toString('base64');
      console.log(`${debugPrefix} 🔄 Serialized transaction to base64, length: ${serializedTx.length}`);
    } catch (e) {
      console.error(`${debugPrefix} ❌ Error serializing transaction:`, e);
      throw e;
    }

    // Return the transaction for frontend signing
    const responseData = {
      success: true,
      message: 'Transaction created successfully',
      data: {
        buyPackTransaction: serializedTx, // Changed from 'transaction' to match frontend expectation
        numberOfPacksBought,
        totalValue: amount,
        userPrivyWalletAddress,
      },
    };
    console.log(`${debugPrefix} ✅ Returning response:`, {
      numberOfPacksBought,
      totalValue: amount,
      userPrivyWalletAddress,
      txLength: serializedTx.length,
    });
    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('[buyPack] ❌ Error in POST handler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}