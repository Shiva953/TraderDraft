import { NextResponse } from 'next/server';
import { VersionedTransaction, Keypair, Connection, PublicKey, TransactionMessage, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { Pnlpackprogram, IDL } from '@/lib/idl';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { PrismaClient } from '@prisma/client';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

const connection = new Connection("http://api.devnet.solana.com", { commitment: "confirmed" });
const prisma = new PrismaClient();

const MAX_INSTRUCTIONS_PER_TX = 1; // Reduced to 1 pack per transaction to avoid size limits
const PROGRAM_ID = new PublicKey('51qa3toZbwVC1zTyntYZSsyqb2uZVuxpgJeYXZPoWJcY');

interface ClaimAllTokensRequest {
  userPrivyWalletAddress: string;
  packIds: string[];
  amountPerKol: number;
}

interface PackClaimData {
  packId: string;
  kolNames: {
    kolAName: string;
    kolBName: string;
    kolCName: string;
    kolDName: string;
  };
  kolMints: {
    mintKolA: PublicKey;
    mintKolB: PublicKey;
    mintKolC: PublicKey;
    mintKolD: PublicKey;
  };
}

export async function POST(request: Request) {
  const debugPrefix = '[claimAllKOLTokens]';
  
  try {
    console.debug(`${debugPrefix} POST endpoint called at ${new Date().toISOString()}`);

    // Parse request body
    let body: ClaimAllTokensRequest;
    try {
      body = await request.json();
      console.debug(`${debugPrefix} Parsed request body:`, JSON.stringify(body));
    } catch (parseErr) {
      console.error(`${debugPrefix} Failed to parse request body:`, parseErr);
      throw new Error('Invalid JSON in request body');
    }

    const { userPrivyWalletAddress, packIds, amountPerKol } = body;
    if (!userPrivyWalletAddress || !packIds || !Array.isArray(packIds) || packIds.length === 0 || !amountPerKol) {
      console.error(`${debugPrefix} Missing required parameters`, { userPrivyWalletAddress, packIds, amountPerKol });
      throw new Error('Missing required parameters: userPrivyWalletAddress, packIds (array), and amountPerKol');
    }

    console.debug(`${debugPrefix} Processing ${packIds.length} packs for user: ${userPrivyWalletAddress}`);

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

    console.debug(`${debugPrefix} Fetching pack data for all packs...`);
    
    // Fetch all pack data and validate
    const packClaimData: PackClaimData[] = [];
    
    for (const packId of packIds) {
      const [packPDA] = PublicKey.findProgramAddressSync([Buffer.from("pack"), Buffer.from(packId)], program.programId);
      
      try {
        const packData = await program.account.pack.fetch(packPDA);
        console.debug(`${debugPrefix} Fetched pack data for ${packId}:`, {
          kolAName: packData.kolAName,
          kolBName: packData.kolBName,
          kolCName: packData.kolCName,
          kolDName: packData.kolDName,
        });

        // Get mint addresses for this pack
        const traders = await prisma.trader.findMany({
          where: {
            ticker: {
              in: [packData.kolAName, packData.kolBName, packData.kolCName, packData.kolDName]
            }
          },
          select: {
            ticker: true,
            tokenMintAddress: true,
          }
        });

        if (traders.length !== 4) {
          throw new Error(`Pack ${packId}: Expected 4 traders with tickers, found ${traders.length}`);
        }

        const tradersWithMints = traders.filter(t => t.tokenMintAddress);
        if (tradersWithMints.length !== 4) {
          throw new Error(`Pack ${packId}: Some traders missing mint addresses. Found ${tradersWithMints.length} with mint addresses`);
        }

        const traderMap = new Map(traders.map(trader => [trader.ticker, trader.tokenMintAddress]));
        
        packClaimData.push({
          packId,
          kolNames: {
            kolAName: packData.kolAName,
            kolBName: packData.kolBName,
            kolCName: packData.kolCName,
            kolDName: packData.kolDName,
          },
          kolMints: {
            mintKolA: new PublicKey(traderMap.get(packData.kolAName)!),
            mintKolB: new PublicKey(traderMap.get(packData.kolBName)!),
            mintKolC: new PublicKey(traderMap.get(packData.kolCName)!),
            mintKolD: new PublicKey(traderMap.get(packData.kolDName)!),
          }
        });

      } catch (e) {
        console.error(`${debugPrefix} Error processing pack ${packId}:`, e);
        throw new Error(`Failed to process pack ${packId}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    console.debug(`${debugPrefix} Successfully validated ${packClaimData.length} packs`);

    // Create batched transactions - 1 pack per transaction to avoid size limits
    const userPubkey = new PublicKey(userPrivyWalletAddress);
    const transactions: VersionedTransaction[] = [];
    const packBatches = chunkArray(packClaimData, MAX_INSTRUCTIONS_PER_TX);

    console.debug(`${debugPrefix} Creating ${packBatches.length} batched transactions...`);

    // Get blockhash once for all transactions
    const { blockhash } = await connection.getLatestBlockhash('confirmed');

    for (let batchIndex = 0; batchIndex < packBatches.length; batchIndex++) {
      const batch = packBatches[batchIndex];
      console.debug(`${debugPrefix} Processing batch ${batchIndex + 1}/${packBatches.length} with ${batch.length} packs`);

      const instructions: TransactionInstruction[] = [];

      for (const pack of batch) {
        const [packPDA] = PublicKey.findProgramAddressSync([Buffer.from("pack"), Buffer.from(pack.packId)], program.programId);
        
        // Calculate token accounts
        const packKolATA = getAssociatedTokenAddressSync(pack.kolMints.mintKolA, packPDA, true);
        const userKolATA = getAssociatedTokenAddressSync(pack.kolMints.mintKolA, userPubkey, false);
        const packKolBTA = getAssociatedTokenAddressSync(pack.kolMints.mintKolB, packPDA, true);
        const userKolBTA = getAssociatedTokenAddressSync(pack.kolMints.mintKolB, userPubkey, false);
        const packKolCTA = getAssociatedTokenAddressSync(pack.kolMints.mintKolC, packPDA, true);
        const userKolCTA = getAssociatedTokenAddressSync(pack.kolMints.mintKolC, userPubkey, false);
        const packKolDTA = getAssociatedTokenAddressSync(pack.kolMints.mintKolD, packPDA, true);
        const userKolDTA = getAssociatedTokenAddressSync(pack.kolMints.mintKolD, userPubkey, false);

        // Pre-create user token accounts to avoid init_if_needed in the same transaction
        // This reduces transaction size significantly
        const createATAInstructions = [
          createAssociatedTokenAccountIdempotentInstruction(
            userPubkey, // payer
            userKolATA, // ata
            userPubkey, // owner
            pack.kolMints.mintKolA, // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          ),
          createAssociatedTokenAccountIdempotentInstruction(
            userPubkey,
            userKolBTA,
            userPubkey,
            pack.kolMints.mintKolB,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          ),
          createAssociatedTokenAccountIdempotentInstruction(
            userPubkey,
            userKolCTA,
            userPubkey,
            pack.kolMints.mintKolC,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          ),
          createAssociatedTokenAccountIdempotentInstruction(
            userPubkey,
            userKolDTA,
            userPubkey,
            pack.kolMints.mintKolD,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          ),
        ];

        // Add ATA creation instructions
        instructions.push(...createATAInstructions);

        // Create claim instruction for this pack
        const claimIxn = await program.methods.claimFromPack(pack.packId, new BN(amountPerKol * (10**6)))
          .accountsPartial({
            pack: packPDA,
            user: userPubkey,
            mintKolA: pack.kolMints.mintKolA,
            packKolATa: packKolATA,
            userKolATa: userKolATA,
            mintKolB: pack.kolMints.mintKolB,
            packKolBTa: packKolBTA,
            userKolBTa: userKolBTA,
            mintKolC: pack.kolMints.mintKolC,
            packKolCTa: packKolCTA,
            userKolCTa: userKolCTA,
            mintKolD: pack.kolMints.mintKolD,
            packKolDTa: packKolDTA,
            userKolDTa: userKolDTA,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .instruction();

        instructions.push(claimIxn);
      }

      // Create transaction message
      const message = new TransactionMessage({
        payerKey: userPubkey,
        instructions,
        recentBlockhash: blockhash,
      });

      try {
        const compiledMessage = message.compileToV0Message();
        const transaction = new VersionedTransaction(compiledMessage);
        
        // Validate transaction size before adding to array
        const serializedSize = transaction.serialize().length;
        console.debug(`${debugPrefix} Transaction ${batchIndex + 1} size: ${serializedSize} bytes`);
        
        if (serializedSize > 1232) { // Solana transaction size limit
          console.warn(`${debugPrefix} Transaction ${batchIndex + 1} exceeds size limit (${serializedSize} bytes)`);
          throw new Error(`Transaction ${batchIndex + 1} too large: ${serializedSize} bytes`);
        }
        
        transactions.push(transaction);
      } catch (error) {
        console.error(`${debugPrefix} Error creating transaction ${batchIndex + 1}:`, error);
        throw new Error(`Failed to create transaction ${batchIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Serialize all transactions
    const serializedTransactions: string[] = [];
    
    for (let i = 0; i < transactions.length; i++) {
      try {
        const serialized = Buffer.from(transactions[i].serialize()).toString('base64');
        serializedTransactions.push(serialized);
      } catch (error) {
        console.error(`${debugPrefix} Error serializing transaction ${i + 1}:`, error);
        throw new Error(`Failed to serialize transaction ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.debug(`${debugPrefix} Created ${serializedTransactions.length} transactions for ${packIds.length} packs`);

    return NextResponse.json({
      success: true,
      message: `Claim transactions created for ${packIds.length} packs`,
      data: {
        transactions: serializedTransactions,
        packIds,
        userPrivyWalletAddress,
        amountPerKol,
        totalPacks: packIds.length,
        totalTransactions: serializedTransactions.length,
        packsPerTransaction: packBatches.map(batch => batch.length),
        estimatedTotalTokens: packIds.length * 4 * amountPerKol, // 4 KOLs per pack
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

// Utility function to chunk arrays
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}