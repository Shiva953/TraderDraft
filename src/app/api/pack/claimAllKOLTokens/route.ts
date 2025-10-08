import { NextResponse } from 'next/server';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  TransactionInstruction,
} from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress
} from '@solana/spl-token';
import { Pnlpackprogram, IDL } from '../../../../lib/idl';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { PrismaClient } from '@prisma/client';
import { ClaimAllTokensRequest, TransferResult } from '@/types';
import { ConsolidatedKolData } from '@/types';
import { determineRarity, RARITY_CONFIG } from '@/lib/rarity';
import { Rarity } from '@prisma/client';

const connection = new Connection("https://api.devnet.solana.com", { commitment: "confirmed" });
const prisma = new PrismaClient();

const MAX_TRANSFERS_PER_TX = 5; // Conservative limit for vault-to-user transfers
const PROGRAM_ID = new PublicKey('4nSNt5ed3cqPWRpwFf8SRvTfLyZvJRgUhwahc8jZQGG2');


export async function POST(request: Request) {
  const debugPrefix = '[claimAllKOLTokens-DirectVault]';
  
  try {
    console.log(`${debugPrefix} POST endpoint called at ${new Date().toISOString()}`);

    // Parse request body
    let body: ClaimAllTokensRequest;
    try {
      body = await request.json();
      console.log(`${debugPrefix} Parsed request body with ${body.consolidatedKols?.length || 0} KOLs`);
    } catch (parseErr) {
      console.error(`${debugPrefix} Failed to parse request body:`, parseErr);
      throw new Error('Invalid JSON in request body');
    }

    const { userPrivyWalletAddress, consolidatedKols } = body;
    if (!userPrivyWalletAddress || !consolidatedKols || !Array.isArray(consolidatedKols) || consolidatedKols.length === 0) {
      console.error(`${debugPrefix} Missing required parameters`, { userPrivyWalletAddress, kolsCount: consolidatedKols?.length });
      throw new Error('Missing required parameters: userPrivyWalletAddress and consolidatedKols (array)');
    }

    console.log(`${debugPrefix} Processing ${consolidatedKols.length} consolidated KOLs for user: ${userPrivyWalletAddress}`);

    // Admin keypair setup
    const adminPrivateKey = process.env.ADMIN_KEYPAIR;
    if (!adminPrivateKey) {
      throw new Error('ADMIN_KEYPAIR environment variable not set');
    }

    let secretKey: Uint8Array;
    try {
      const arr = JSON.parse(adminPrivateKey);
      secretKey = Uint8Array.from(arr);
    } catch (e) {
      throw new Error('ADMIN_KEYPAIR must be a JSON array string');
    }

    const adminKeypair = Keypair.fromSecretKey(secretKey);
    const adminWallet = new NodeWallet(adminKeypair);
    const provider = new AnchorProvider(connection, adminWallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
    const program = new Program<Pnlpackprogram>(IDL, provider);

    console.log(`${debugPrefix} Executing direct vault-to-user transfers in batches...`);
    
    // Execute transfers in batches
    const transferResults: TransferResult[] = [];
    const kolBatches = chunkArray(consolidatedKols, MAX_TRANSFERS_PER_TX);
    
    for (let batchIndex = 0; batchIndex < kolBatches.length; batchIndex++) {
      const batch = kolBatches[batchIndex];
      console.log(`${debugPrefix} Processing batch ${batchIndex + 1}/${kolBatches.length} with ${batch.length} KOLs`);
      
      const batchResults = await executeBatchedVaultToUserTransfers(
        program,
        batch,
        userPrivyWalletAddress,
        connection,
        adminKeypair
      );
      
      transferResults.push(...batchResults);
      console.log(`${debugPrefix} Batch ${batchIndex + 1} completed with ${batchResults.filter(r => r.success).length}/${batchResults.length} successful transfers`);
      
      // Small delay between batches to avoid RPC rate limits
      if (batchIndex < kolBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successfulTransfers = transferResults.filter(r => r.success);
    const failedTransfers = transferResults.filter(r => !r.success);

    console.log(`${debugPrefix} Transfer results: ${successfulTransfers.length} successful, ${failedTransfers.length} failed`);

    if (successfulTransfers.length === 0) {
      throw new Error('All token transfers failed');
    }

    // Update the consolidatedKols with transfer signatures
    const updatedKols = consolidatedKols.map(kol => {
      const result = transferResults.find(r => r.kol.id === kol.id);
      return {
        ...kol,
        transferSignature: result?.success ? result.signature : null
      };
    });

    const responseMessage = failedTransfers.length > 0 
      ? `${successfulTransfers.length}/${transferResults.length} token transfers completed successfully`
      : `All ${successfulTransfers.length} token transfers completed successfully!`;

    return NextResponse.json({
      success: true,
      message: responseMessage,
      data: {
        userPrivyWalletAddress,
        totalKols: consolidatedKols.length,
        successfulTransfers: successfulTransfers.length,
        failedTransfers: failedTransfers.length,
        transferResults: transferResults.map(r => {
          const rarity = r.kol.rarity || determineRarity(r.kol.rank!);
          return {
            kolId: r.kol.id,
            kolTicker: r.kol.ticker,
            kolName: r.kol.name,
            tokenAmount: r.kol.totalTokenAmount,
            success: r.success,
            signature: r.success ? r.signature : null,
            error: r.error || null,
            rarity: rarity,
            rarityLabel: RARITY_CONFIG[rarity].label,
            rarityColor: RARITY_CONFIG[rarity].color
          };
        }),
        consolidatedKols: updatedKols,
        executionMode: 'Direct Vault-to-User Transfers (Backend Signed)',
        network: 'devnet'
      },
    }, { status: 200 });

  } catch (error) {
    console.error(`${debugPrefix} Error in POST handler:`, error);
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

// Execute batched vault-to-user transfers using the new instruction
async function executeBatchedVaultToUserTransfers(
  program: Program<Pnlpackprogram>,
  kols: ConsolidatedKolData[],
  userAddress: string,
  connection: Connection,
  adminKeypair: Keypair
): Promise<TransferResult[]> {
  const results: TransferResult[] = [];
  
  // Execute transfers in parallel for better performance
  const promises = kols.map(kol => 
    executeVaultToUserTransfer(
      program,
      kol,
      userAddress,
      connection,
      adminKeypair
    )
  );
  
  const transferResults = await Promise.allSettled(promises);
  
  for (let i = 0; i < transferResults.length; i++) {
    const result = transferResults[i];
    const kol = kols[i];
    
    if (result.status === 'fulfilled') {
      results.push({
        signature: result.value,
        kol,
        success: true
      });
      console.log(`✅ Vault transfer completed for ${kol.ticker}: ${result.value}`);
    } else {
      results.push({
        signature: '',
        kol,
        success: false,
        error: result.reason instanceof Error ? result.reason.message : 'Transfer failed'
      });
      console.error(`❌ Vault transfer failed for ${kol.ticker}:`, result.reason);
    }
  }
  
  return results;
}

// Execute single vault-to-user transfer using TransferFromKolVaultToUser instruction
async function executeVaultToUserTransfer(
  program: Program<Pnlpackprogram>,
  kol: ConsolidatedKolData,
  userAddress: string,
  connection: Connection,
  adminKeypair: Keypair
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  const userPubkey = new PublicKey(userAddress);
  const mintPubkey = new PublicKey(kol.tokenMintAddress!);
  
  const globalPackPool = new PublicKey("GrT2MFauW4JzY867xE61dMiMwETBfzbh9hzU6iLeq4iQ");

  const [configAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('CONFIG_ACCOUNT')],
    PROGRAM_ID
  );

  const [tokenVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_vault'), Buffer.from(kol.ticker!), globalPackPool.toBuffer()],
    PROGRAM_ID
  );

  const userTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    userPubkey,
    false,
    TOKEN_PROGRAM_ID
  );

  // Convert token amount to proper decimals (assuming 6 decimals)
  const transferAmount = new BN(kol.totalTokenAmount!);

  const transferIx = await program.methods
    .transferFromKolVaultToUser(kol.ticker!, transferAmount)
    .accountsPartial({
      globalPackPool,
      user: userPubkey,
      admin: adminKeypair.publicKey,
      configAccount,
      tokenVault,
      mint: mintPubkey,
      userTokenAccount,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .instruction();

  const transaction = new Transaction();
  transaction.add(transferIx);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = adminKeypair.publicKey;
  transaction.sign(adminKeypair);

  const serializedTx = transaction.serialize();
  console.log(`📏 Vault transfer transaction size for ${kol.ticker}: ${serializedTx.length} bytes`);
  
  if (serializedTx.length > 1232) {
    throw new Error(`Vault transfer transaction too large: ${serializedTx.length} bytes for KOL: ${kol.ticker}`);
  }

  const signature = await connection.sendRawTransaction(serializedTx, {
    skipPreflight: false,
    preflightCommitment: 'confirmed'
  });

  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight
  }, 'confirmed');

  return signature;
}

// Utility function to chunk arrays
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}