import { NextResponse } from 'next/server';
import { VersionedTransaction, Keypair, Connection, PublicKey, TransactionMessage, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Pnlpackprogram, IDL } from '@/lib/idl';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { BN } from 'bn.js';
import { PrismaClient } from '@prisma/client';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';

const connection = new Connection("https://api.devnet.solana.com", {commitment: "confirmed"})
const prisma = new PrismaClient();

// 40K tokens of each KOL from pack vault -> user
export async function POST(request: Request) {
  const debugPrefix = '[claimFromPack]';
  try {
    console.debug(`${debugPrefix} POST endpoint called at ${new Date().toISOString()}`);

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.debug(`${debugPrefix} Parsed request body:`, JSON.stringify(body));
    } catch (parseErr) {
      console.error(`${debugPrefix} Failed to parse request body:`, parseErr);
      throw new Error('Invalid JSON in request body');
    }

    const { userPrivyWalletAddress, packId, amountPerKol } = body;
    if (!userPrivyWalletAddress || !packId || !amountPerKol) {
      console.error(`${debugPrefix} Missing required parameters: userPrivyWalletAddress, packId, and amountPerKol`, { userPrivyWalletAddress, packId, amountPerKol });
      throw new Error('Missing required parameters: userPrivyWalletAddress, packId, and amountPerKol');
    }
    console.debug(`${debugPrefix} userPrivyWalletAddress: ${userPrivyWalletAddress}, packId: ${packId}, amountPerKol: ${amountPerKol}`);

    // Admin keypair
    const adminPrivateKey = process.env.ADMIN_KEYPAIR;
    if (!adminPrivateKey) {
      console.error(`${debugPrefix} ADMIN_KEYPAIR env variable missing`);
      throw new Error('ADMIN_KEYPAIR environment variable not set');
    }

    let secretKey: Uint8Array;
    try {
      const arr = JSON.parse(adminPrivateKey);
      if (!Array.isArray(arr) || arr.some(n => typeof n !== 'number')) {
        throw new Error('ADMIN_KEYPAIR must be a JSON array of numbers');
      }
      secretKey = Uint8Array.from(arr);
      console.debug(`${debugPrefix} Parsed ADMIN_KEYPAIR successfully`);
    } catch (e) {
      console.error(`${debugPrefix} Failed to parse ADMIN_KEYPAIR:`, e);
      throw new Error('ADMIN_KEYPAIR must be a JSON array string, e.g. "[1,2,3,...]"');
    }

    let adminKeypair;
    try {
      adminKeypair = Keypair.fromSecretKey(secretKey);
      console.debug(`${debugPrefix} Loaded admin keypair. Pubkey: ${adminKeypair.publicKey.toBase58()}`);
    } catch (e) {
      console.error(`${debugPrefix} Error loading admin keypair:`, e);
      throw e;
    }

    // Anchor/Program setup
    let adminWallet, provider, program;
    try {
      adminWallet = new NodeWallet(adminKeypair);
      provider = new AnchorProvider(connection, adminWallet, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      });
      program = new Program<Pnlpackprogram>(IDL, provider);
      console.debug(`${debugPrefix} Anchor provider and program initialized`);
    } catch (e) {
      console.error(`${debugPrefix} Error initializing Anchor provider/program:`, e);
      throw e;
    }

    // 1. Get the pack PDA from the pack id
    let packPDA;
    try {
      [packPDA] = PublicKey.findProgramAddressSync([Buffer.from("pack"), Buffer.from(packId)], program.programId);
      console.debug(`${debugPrefix} Pack PDA: ${packPDA.toBase58()}`);
    } catch (e) {
      console.error(`${debugPrefix} Error finding pack PDA:`, e, { packId });
      throw e;
    }

    // 2. Get the pack data to retrieve KOL names (not IDs)
    let packData;
    try {
      packData = await program.account.pack.fetch(packPDA);
      console.debug(`${debugPrefix} Fetched pack data:`, {
        kolAName: packData.kolAName,
        kolBName: packData.kolBName,
        kolCName: packData.kolCName,
        kolDName: packData.kolDName,
      });
    } catch (e) {
      console.error(`${debugPrefix} Error fetching pack data:`, e, { packPDA: packPDA.toBase58() });
      throw e;
    }

    // 3. Query the database to get mint addresses for each KOL using their names/tickers
    let kolMints;
    try {
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

      console.debug(`${debugPrefix} Fetched traders from DB:`, traders);

      if (traders.length !== 4) {
        console.error(`${debugPrefix} Expected 4 traders with tickers, found ${traders.length}`, { tickers: [packData.kolAName, packData.kolBName, packData.kolCName, packData.kolDName] });
        throw new Error(`Expected 4 traders with tickers, found ${traders.length}`);
      }

      // Ensure all have mint addresses
      const tradersWithMints = traders.filter(t => t.tokenMintAddress);
      if (tradersWithMints.length !== 4) {
        console.error(`${debugPrefix} Some traders missing mint addresses. Found ${tradersWithMints.length} with mint addresses`, tradersWithMints);
        throw new Error(`Some traders missing mint addresses. Found ${tradersWithMints.length} with mint addresses`);
      }

      // Map traders by their ticker to get mint addresses in the correct order
      const traderMap = new Map(traders.map(trader => [trader.ticker, trader.tokenMintAddress]));
      
      kolMints = {
        mintKolA: new PublicKey(traderMap.get(packData.kolAName)!),
        mintKolB: new PublicKey(traderMap.get(packData.kolBName)!),
        mintKolC: new PublicKey(traderMap.get(packData.kolCName)!),
        mintKolD: new PublicKey(traderMap.get(packData.kolDName)!),
      };

      console.debug(`${debugPrefix} Retrieved KOL mint addresses:`, {
        mintKolA: kolMints.mintKolA.toBase58(),
        mintKolB: kolMints.mintKolB.toBase58(),
        mintKolC: kolMints.mintKolC.toBase58(),
        mintKolD: kolMints.mintKolD.toBase58(),
      });
    } catch (e) {
      console.error(`${debugPrefix} Error fetching trader mint addresses:`, e, { kolNames: [packData?.kolAName, packData?.kolBName, packData?.kolCName, packData?.kolDName] });
      throw e;
    }

    const userPubkey = new PublicKey(userPrivyWalletAddress);

    // Calculate all required token accounts using proper SPL Token method
    let packKolATA, userKolATA, packKolBTA, userKolBTA, packKolCTA, userKolCTA, packKolDTA, userKolDTA;
    try {
      packKolATA = getAssociatedTokenAddressSync(kolMints.mintKolA, packPDA, true);
      userKolATA = getAssociatedTokenAddressSync(kolMints.mintKolA, userPubkey, false);
      packKolBTA = getAssociatedTokenAddressSync(kolMints.mintKolB, packPDA, true);
      userKolBTA = getAssociatedTokenAddressSync(kolMints.mintKolB, userPubkey, false);
      packKolCTA = getAssociatedTokenAddressSync(kolMints.mintKolC, packPDA, true);
      userKolCTA = getAssociatedTokenAddressSync(kolMints.mintKolC, userPubkey, false);
      packKolDTA = getAssociatedTokenAddressSync(kolMints.mintKolD, packPDA, true);
      userKolDTA = getAssociatedTokenAddressSync(kolMints.mintKolD, userPubkey, false);

      console.debug(`${debugPrefix} Calculated token accounts:`, {
        packKolATA: packKolATA.toBase58(),
        userKolATA: userKolATA.toBase58(),
        packKolBTA: packKolBTA.toBase58(),
        userKolBTA: userKolBTA.toBase58(),
        packKolCTA: packKolCTA.toBase58(),
        userKolCTA: userKolCTA.toBase58(),
        packKolDTA: packKolDTA.toBase58(),
        userKolDTA: userKolDTA.toBase58(),
      });
    } catch (e) {
      console.error(`${debugPrefix} Error calculating token accounts:`, e, {
        kolMints: {
          mintKolA: kolMints?.mintKolA?.toBase58(),
          mintKolB: kolMints?.mintKolB?.toBase58(),
          mintKolC: kolMints?.mintKolC?.toBase58(),
          mintKolD: kolMints?.mintKolD?.toBase58(),
        },
        packPDA: packPDA?.toBase58(),
        userPubkey: userPubkey?.toBase58(),
      });
      throw e;
    }

    // 4. Create the claimFromPack instruction
    let claimIxn;
    try {
      claimIxn = await program.methods.claimFromPack(packId, new BN(amountPerKol * (10**6)))
        .accountsPartial({
          pack: packPDA,
          user: userPubkey,
          mintKolA: kolMints.mintKolA,
          packKolATa: packKolATA,
          userKolATa: userKolATA,
          mintKolB: kolMints.mintKolB,
          packKolBTa: packKolBTA,
          userKolBTa: userKolBTA,
          mintKolC: kolMints.mintKolC,
          packKolCTa: packKolCTA,
          userKolCTa: userKolCTA,
          mintKolD: kolMints.mintKolD,
          packKolDTa: packKolDTA,
          userKolDTa: userKolDTA,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .instruction();
      console.debug(`${debugPrefix} Created claimFromPack instruction`, {
        packId,
        amountPerKol,
        accounts: {
          pack: packPDA.toBase58(),
          user: userPubkey.toBase58(),
          mintKolA: kolMints.mintKolA.toBase58(),
          packKolATa: packKolATA.toBase58(),
          userKolATa: userKolATA.toBase58(),
          mintKolB: kolMints.mintKolB.toBase58(),
          packKolBTa: packKolBTA.toBase58(),
          userKolBTa: userKolBTA.toBase58(),
          mintKolC: kolMints.mintKolC.toBase58(),
          packKolCTa: packKolCTA.toBase58(),
          userKolCTa: userKolCTA.toBase58(),
          mintKolD: kolMints.mintKolD.toBase58(),
          packKolDTa: packKolDTA.toBase58(),
          userKolDTa: userKolDTA.toBase58(),
        }
      });
    } catch (e) {
      console.error(`${debugPrefix} Error creating claimFromPack instruction:`, e, {
        packId,
        amountPerKol,
        kolMints: {
          mintKolA: kolMints?.mintKolA?.toBase58(),
          mintKolB: kolMints?.mintKolB?.toBase58(),
          mintKolC: kolMints?.mintKolC?.toBase58(),
          mintKolD: kolMints?.mintKolD?.toBase58(),
        }
      });
      throw e;
    }

    // Create the transaction message
    let recentBlockhash;
    try {
      recentBlockhash = (await connection.getLatestBlockhash({commitment: "confirmed"})).blockhash;
      console.debug(`${debugPrefix} Recent blockhash: ${recentBlockhash}`);
    } catch (e) {
      console.error(`${debugPrefix} Error fetching recent blockhash:`, e);
      throw e;
    }
    
    let message;
    try {
      message = new TransactionMessage({
        payerKey: userPubkey,
        instructions: [claimIxn],
        recentBlockhash,
      });
      console.debug(`${debugPrefix} TransactionMessage created`, {
        payerKey: userPubkey.toBase58(),
        recentBlockhash,
        instructionsCount: 1
      });
    } catch (e) {
      console.error(`${debugPrefix} Error creating TransactionMessage:`, e);
      throw e;
    }

    let claimTx;
    try {
      claimTx = new VersionedTransaction(message.compileToV0Message());
      console.debug(`${debugPrefix} Compiled VersionedTransaction`);
    } catch (e) {
      console.error(`${debugPrefix} Error compiling VersionedTransaction:`, e);
      throw e;
    }

    // Serialize transaction to base64 for easier transmission
    let serializedTx;
    try {
      serializedTx = Buffer.from(claimTx.serialize()).toString('base64');
      console.debug(`${debugPrefix} Serialized transaction to base64`, { length: serializedTx.length });
    } catch (e) {
      console.error(`${debugPrefix} Error serializing transaction:`, e);
      throw e;
    }

    // Return the transaction for frontend signing
    const responseData = {
      success: true,
      message: 'Claim transaction created successfully',
      data: {
        claimPackTransaction: serializedTx,
        packId,
        userPrivyWalletAddress,
        amountPerKol,
        kolNames: {
          kolAName: packData.kolAName,
          kolBName: packData.kolBName,
          kolCName: packData.kolCName,
          kolDName: packData.kolDName,
        },
        kolMints: {
          mintKolA: kolMints.mintKolA.toBase58(),
          mintKolB: kolMints.mintKolB.toBase58(),
          mintKolC: kolMints.mintKolC.toBase58(),
          mintKolD: kolMints.mintKolD.toBase58(),
        }
      },
    };
    
    console.debug(`${debugPrefix} Returning response`, {
      packId,
      userPrivyWalletAddress,
      amountPerKol,
      txLength: serializedTx.length,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error(`${debugPrefix} Error in POST handler:`, error, { timestamp: new Date().toISOString() });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}