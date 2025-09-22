// ============================================================================
// MODIFIED CLIENT-SIDE IMPLEMENTATION
// ============================================================================

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  CpAmm,
  FeeSchedulerMode,
  getBaseFeeParams,
  getDynamicFeeParams,
  getSqrtPriceFromPrice,
  PoolFeesParams
} from "@meteora-ag/cp-amm-sdk"
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  NATIVE_MINT,
  createMint,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  DataV2
} from "@metaplex-foundation/mpl-token-metadata";
import BN from 'bn.js';
import { Pnlpackprogram, IDL } from "@/lib/idl";
import { AnchorProvider, Program } from "@coral-xyz/anchor"
import * as anchor from "@coral-xyz/anchor";
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const prisma = new PrismaClient();

const cpAmm = new CpAmm(connection)
const tokenADecimal = 6;
const tokenBDecimal = 9; // SOL has 9 decimals

interface KolData {
  id: string;
  name: string;
  rank: number;
  address: string | null;
  pnl: string;
  winRate: number | null;
  avatarUrl: string | null;
  xUrl: string | null;
}

function generateTicker(name: string, rank: number): string {
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
  const ticker = cleanName.substring(0, Math.min(10, cleanName.length)).toUpperCase() || `KOL${rank}`;
  console.log(`🆔 [TICKER] Generated ticker "${ticker}" from name "${name}" rank ${rank}`);
  return ticker;
}

function getMetadataPDA(mint: PublicKey): PublicKey {
  console.log(`🔑 [PDA] Deriving Metadata PDA for mint: ${mint.toBase58()}`);
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );
  console.log(`✅ [PDA] Metadata PDA derived: ${metadataPDA.toBase58()}`);
  return metadataPDA;
}

async function createSingleKolTokenImproved(
  kol: KolData,
  index: number,
  wallet: Keypair,
  program: Program<Pnlpackprogram>,
  globalPackPoolAccount: PublicKey
): Promise<{ success: boolean; mintAddress?: string; poolAddress?: string; ticker?: string; error?: string }> {
  try {
    console.log(`\n🎯 [CREATE] KOL ${index + 1}/50: ${kol.name} (Rank ${kol.rank})`);
    const ticker = generateTicker(kol.name, kol.rank);

    const decimals = 6;
    const baseMintKeypair = Keypair.generate();
    console.log(`🎲 [MINT] Generated new token mint keypair: ${baseMintKeypair.publicKey.toBase58()}`);

    const totalSupply = new BN(1_000_000_000).mul(new BN(10).pow(new BN(decimals)));
    const poolAmount = new BN(60_000_000).mul(new BN(10).pow(new BN(decimals))); // 6%
    const solAmount = new BN(100_000_000); // 0.1 SOL for pool

    console.log(`💰 [AMOUNTS] totalSupply=${totalSupply.toString()} poolAmount=${poolAmount.toString()}`);

    // --- Step 1: Create token mint with global_pack_pool as authority + metadata, admin is payer
    console.log("🚀 [STEP 1] Creating token mint + metadata");
    const tokenMint = await createMint(
      connection, 
      wallet, 
      globalPackPoolAccount, // CRITICAL: Global pack pool as mint authority (not wallet)
      null, // freeze authority
      decimals, 
      baseMintKeypair
    );
    console.log(`✅ [STEP 1] Token mint created with global_pack_pool as authority: ${tokenMint.toBase58()}`);

    // Create metadata
    const metadataPDA = getMetadataPDA(baseMintKeypair.publicKey);
    const tokenMetadata: DataV2 = {
      name: kol.name,
      symbol: ticker,
      uri: "https://launch.meteora.ag/icons/logo.svg",
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null
    };

    const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: baseMintKeypair.publicKey,
        mintAuthority: globalPackPoolAccount, // Changed from wallet to globalPackPoolAccount
        payer: wallet.publicKey,
        updateAuthority: wallet.publicKey,
      },
      { createMetadataAccountArgsV3: { data: tokenMetadata, isMutable: true, collectionDetails: null } }
    );

    const metadataTransaction = new Transaction().add(createMetadataInstruction);
    console.log("📝 [STEP 1] Sending metadata transaction");
    const metadataSignature = await sendAndConfirmTransaction(connection, metadataTransaction, [wallet, baseMintKeypair], {
      commitment: "confirmed",
      maxRetries: 3
    });
    console.log(`✅ [STEP 1] Metadata transaction confirmed: ${metadataSignature}`);

    // --- Step 2: Create pool token account for receiving 6%
    console.log("🚀 [STEP 2] Creating pool token account");
    const poolTokenAccount = await getAssociatedTokenAddress(
      baseMintKeypair.publicKey, 
      wallet.publicKey // Temporary owner for pool creation
    );
    console.log(`🏦 [STEP 2] Pool token account: ${poolTokenAccount.toBase58()}`);

    const createPoolATAIx = createAssociatedTokenAccountInstruction(
      wallet.publicKey, // payer
      poolTokenAccount, // ata
      wallet.publicKey, // owner 
      baseMintKeypair.publicKey // mint
    );

    // --- Step 3: Our improved protocol instruction (Direct Distribution)
    console.log("🚀 [STEP 3] Calling improved protocol instruction with direct distribution");
    const [tokenVaultAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault"), Buffer.from(ticker), globalPackPoolAccount.toBuffer()],
      program.programId
    );
    console.log(`🏦 [STEP 3] Derived tokenVaultAccount PDA: ${tokenVaultAccount.toBase58()}`);

    const [configAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("CONFIG_ACCOUNT")],
      program.programId
    );

    // Create the instruction transaction
    const improvedTx = await program.methods
      .initKolVaultAndTransferV2(ticker, totalSupply)
      .accountsPartial({
        globalPackPool: globalPackPoolAccount,
        admin: wallet.publicKey,
        mint: baseMintKeypair.publicKey,
        tokenVault: tokenVaultAccount,
        poolTokenAccount: poolTokenAccount, // Receives 6% directly
        configAccount: configAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .preInstructions([createPoolATAIx]) // Create ATA first
      .signers([wallet])
      .rpc({ commitment: "confirmed" });

    console.log(`✅ [STEP 3] Direct distribution transaction confirmed: ${improvedTx}`);

    // --- Step 4: Create Meteora pool (pool tokens are already in poolTokenAccount)
    console.log("🚀 [STEP 4] Creating Meteora pool with pre-distributed tokens");
    
    const configs = await cpAmm.getAllConfigs();
    console.log(`🔍 [STEP 4] Available configs: ${configs.length}`);
    const publicConfig = configs.find(c => c.account.poolCreatorAuthority.toString() === "11111111111111111111111111111111");
    if (!publicConfig) throw new Error("No public config found for pool creation");

    const tokenAMint = baseMintKeypair.publicKey;
    const tokenBMint = NATIVE_MINT;

    const sqrtMinPrice = getSqrtPriceFromPrice("0.0001", tokenADecimal, tokenBDecimal);
    const sqrtMaxPrice = getSqrtPriceFromPrice("0.01", tokenADecimal, tokenBDecimal);
    console.log(`📐 [STEP 4] sqrtMinPrice=${sqrtMinPrice.toString()} sqrtMaxPrice=${sqrtMaxPrice.toString()}`);

    const { initSqrtPrice, liquidityDelta } = cpAmm.preparePoolCreationParams({
      tokenAAmount: poolAmount,
      tokenBAmount: solAmount,
      minSqrtPrice: sqrtMinPrice,
      maxSqrtPrice: sqrtMaxPrice
    });
    console.log(`💧 [STEP 4] initSqrtPrice=${initSqrtPrice.toString()} liquidityDelta=${liquidityDelta.toString()}`);

    const baseFeeParams = getBaseFeeParams(500, 500, FeeSchedulerMode.Linear, 0, 0);
    const dynamicFeeParams = getDynamicFeeParams(100);
    const poolFees: PoolFeesParams = { baseFee: baseFeeParams, dynamicFee: dynamicFeeParams, padding: [] };

    const positionNftMint = Keypair.generate();
    console.log(`🎨 [STEP 4] Position NFT mint keypair: ${positionNftMint.publicKey.toBase58()}`);

    const { tx, pool } = await cpAmm.createCustomPool({
      payer: wallet.publicKey,
      creator: wallet.publicKey,
      positionNft: positionNftMint.publicKey,
      tokenAMint,
      tokenBMint,
      tokenAAmount: poolAmount, // Uses pre-distributed tokens from poolTokenAccount
      tokenBAmount: solAmount,
      sqrtMinPrice,
      sqrtMaxPrice,
      initSqrtPrice,
      liquidityDelta,
      poolFees,
      hasAlphaVault: false,
      collectFeeMode: 0,
      activationPoint: null,
      activationType: 1,
      tokenAProgram: TOKEN_PROGRAM_ID,
      tokenBProgram: TOKEN_PROGRAM_ID,
    });

    const blockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
    tx.recentBlockhash = blockhash;
    tx.sign(wallet, positionNftMint);

    const poolCreationSignature = await sendAndConfirmTransaction(connection, tx, [wallet, positionNftMint], {
      commitment: 'confirmed'
    });
    console.log(`✅ [STEP 4] Pool creation confirmed: ${poolCreationSignature}`);
    console.log(`🎉 [SUCCESS] ${kol.name} token created with direct distribution!`);

    return { 
      success: true, 
      mintAddress: baseMintKeypair.publicKey.toBase58(), 
      poolAddress: pool.toString(),
      ticker: ticker
    };

  } catch (error) {
    console.error(`❌ [ERROR] Failed to create token for ${kol.name}:`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function POST(request: Request) {
  console.log("📩 [API] POST /createTokensAndPoolImproved invoked");
  try {
    // Get KOLs from database
    console.log("📊 [DB] Fetching top 50 KOLs");
    const kols = await prisma.trader.findMany({
      where: { period: 'DAILY' },
      orderBy: { rank: 'asc' },
      take: 50,
      select: { id: true, name: true, rank: true, address: true, pnl: true, winRate: true, avatarUrl: true, xUrl: true }
    });
    console.log(`✅ [DB] Retrieved ${kols.length} KOL records`);

    if (kols.length < 50) {
      console.warn("⚠️ [DB] Not enough KOLs to proceed");
      return NextResponse.json({
        success: false,
        error: `Insufficient KOL data. Found ${kols.length}/50 required KOLs.`
      }, { status: 400 });
    }

    // Setup wallet and program
    const walletKeypairInBytes = JSON.parse(process.env.ADMIN_KEYPAIR || "[]");
    const wallet = Keypair.fromSecretKey(Uint8Array.from(walletKeypairInBytes));
    console.log(`👛 [ADMIN] Wallet loaded: ${wallet.publicKey.toBase58()}`);

    const anchorWallet = new NodeWallet(wallet);
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
    anchor.setProvider(provider);

    const programId = new PublicKey("2Bv9DtsyPmwKJSpbhNdK5tEPu4WTugyoWJmx8cBfuAid");
    const program = new Program<Pnlpackprogram>(IDL as Pnlpackprogram, provider);
    const [globalPackPoolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_pack_pool")],
      program.programId
    );
    console.log(`🔗 [ANCHOR] GlobalPackPoolAccount: ${globalPackPoolAccount.toBase58()}`);

    // Process all KOLs
    const results: { kolId: string; kolName: string; success: boolean; mintAddress?: string; poolAddress: string; ticker?: string; error?: string }[] = [];
    let successCount = 0, failureCount = 0;

    console.log("🔄 [PROCESS] Starting improved creation loop for 50 KOLs");
    for (let i = 0; i < kols.length; i++) {
      const kol = kols[i];
      console.log(`\n➡️ [PROCESS] ${i + 1}/50 - ${kol.name}`);
      
      const result = await createSingleKolTokenImproved(kol, i, wallet, program, globalPackPoolAccount);
    
      if (!result.success) {
        console.warn(`⚠️ [CONTINUE] Token creation failed for ${kol.name}, continuing with remaining KOLs`);
      }
    
      results.push({
        kolId: kol.id,
        kolName: kol.name,
        success: result.success,
        poolAddress: result.poolAddress || '',
        mintAddress: result.mintAddress,
        ticker: result.ticker,
        error: result.error
      });
    
      // Update database
      try {
        await prisma.trader.update({
          where: { id: kol.id },
          data: { 
            tokenMintAddress: result.success ? result.mintAddress : null,
            poolAddress: result.success ? result.poolAddress : null,
            ticker: result.success ? result.ticker : null
          }
        });
        console.log(result.success
          ? `✅ [DB] Updated mint, pool, and ticker for ${kol.name}`
          : `⚠️ [DB] Stored null addresses for ${kol.name} (creation failed)`
        );
        result.success ? successCount++ : failureCount++;
      } catch (dbErr) {
        console.error(`❌ [DB] Update failed for ${kol.name}:`, dbErr);
        failureCount++;
        if (result.success) successCount--;
      }
    
      // Rate limiting
      if (i < kols.length - 1) {
        console.log(`⏳ [RATE] Waiting 3s before next token (${i + 2}/50)`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    console.log(`\n🎉 [SUMMARY] Success=${successCount} Failure=${failureCount}`);
    const isFullSuccess = successCount === 50;

    return NextResponse.json({
      success: isFullSuccess,
      partialSuccess: successCount > 0 && !isFullSuccess,
      message: isFullSuccess
        ? "🎉 ALL 50 KOL tokens created with direct distribution!"
        : successCount > 0
          ? `⚠️ Partial success: ${successCount}/50 tokens created`
          : "❌ All token creation attempts failed",
      data: { 
        totalKols: 50, 
        successCount, 
        failureCount, 
        results, 
        readyForPackReveal: isFullSuccess,
        approach: "direct_distribution" // Indicate which approach was used
      }
    }, { status: isFullSuccess ? 200 : 207 });

  } catch (error) {
    console.error("❌ [API] Improved KOL token creation error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  } finally {
    console.log("🔌 [DB] Disconnecting Prisma client");
    await prisma.$disconnect();
  }
}