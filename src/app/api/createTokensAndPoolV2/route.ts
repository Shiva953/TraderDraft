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
  PoolFeesParams,
  MIN_SQRT_PRICE,
  MAX_SQRT_PRICE
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
  setAuthority,
  AuthorityType,
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
import { KolData } from '@/types';
import { determineRarity, getRarityWeight } from '@/lib/rarity';
import { Rarity } from '@prisma/client';

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const prisma = new PrismaClient();

const cpAmm = new CpAmm(connection)
const tokenADecimal = 6;
const tokenBDecimal = 9; // SOL has 9 decimals

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
    const solAmount = new BN(50_000_000); 

    console.log(`💰 [AMOUNTS] totalSupply=${totalSupply.toString()} poolAmount=${poolAmount.toString()}`);

    // --- Step 1: Create token mint with wallet as initial authority (will transfer to PDA later)
    console.log("🚀 [STEP 1] Creating token mint + metadata with wallet as initial authority");
    const tokenMint = await createMint(
      connection,
      wallet,
      wallet.publicKey, // Start with wallet as mint authority
      null, // freeze authority
      decimals,
      baseMintKeypair
    );
    console.log(`✅ [STEP 1] Token mint created: ${tokenMint.toBase58()}`);

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
        mintAuthority: wallet.publicKey, // Wallet is the initial mint authority
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

    // --- Step 1.5: Transfer mint authority from wallet to global_pack_pool PDA
    console.log("🚀 [STEP 1.5] Transferring mint authority to global_pack_pool PDA");
    await setAuthority(
      connection,
      wallet, // payer
      baseMintKeypair.publicKey, // mint
      wallet, // current authority
      AuthorityType.MintTokens, // authority type
      globalPackPoolAccount, // new authority (the PDA)
      [], // multiSigners (none)
      { commitment: "confirmed" }
    );
    console.log(`✅ [STEP 1.5] Mint authority transferred to global_pack_pool: ${globalPackPoolAccount.toBase58()}`);

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
    // Mint authority has been transferred to global_pack_pool PDA in step 1.5
    // Now also includes SOL transfer from global_pack_pool to admin for Meteora pool creation
    const improvedTx = await program.methods
      .initKolVaultAndTransferV2(ticker, totalSupply, solAmount) // Added solAmount parameter
      .accountsPartial({
        globalPackPool: globalPackPoolAccount,
        admin: wallet.publicKey,
        mint: baseMintKeypair.publicKey,
        tokenVault: tokenVaultAccount,
        poolTokenAccount: poolTokenAccount, // Receives 6% directly
        solRecipient: wallet.publicKey, // Admin receives SOL from global_pack_pool for pool creation
        configAccount: configAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .preInstructions([createPoolATAIx]) // Create ATA first
      .signers([wallet])
      .rpc({ commitment: "confirmed" });

    console.log(`✅ [STEP 3] Direct distribution + SOL transfer transaction confirmed: ${improvedTx}`);

    // --- Step 4: Create Meteora pool (pool tokens are already in poolTokenAccount, SOL now in admin wallet)
    console.log("🚀 [STEP 4] Creating Meteora pool with pre-distributed tokens and SOL from global pool");
    
    const configs = await cpAmm.getAllConfigs();
    console.log(`🔍 [STEP 4] Available configs: ${configs.length}`);
    const publicConfig = configs.find(c => c.account.poolCreatorAuthority.toString() === "11111111111111111111111111111111");
    if (!publicConfig) throw new Error("No public config found for pool creation");

    const tokenAMint = baseMintKeypair.publicKey;
    const tokenBMint = NATIVE_MINT;

    // Use SDK constants for full-range pool (no concentrated liquidity limits)
    // This allows unlimited price movement in both directions
    const sqrtMinPrice = MIN_SQRT_PRICE;
    const sqrtMaxPrice = MAX_SQRT_PRICE;
    console.log(`📐 [STEP 4] Using full-range pool with SDK constants`);
    console.log(`   sqrtMinPrice=${sqrtMinPrice.toString()}`);
    console.log(`   sqrtMaxPrice=${sqrtMaxPrice.toString()}`);

    const { initSqrtPrice, liquidityDelta } = cpAmm.preparePoolCreationParams({
      tokenAAmount: poolAmount,
      tokenBAmount: solAmount,
      minSqrtPrice: sqrtMinPrice,
      maxSqrtPrice: sqrtMaxPrice
    });
    console.log(`💧 [STEP 4] initSqrtPrice=${initSqrtPrice.toString()} liquidityDelta=${liquidityDelta.toString()}`);

    // Fee configuration: 5% base fee (500 bps) + 5% partner fee (500 bps)
    // Partner fee goes to the referralTokenAccount specified during swaps
    const baseFeeParams = getBaseFeeParams(
      500,  // baseFeeInBps: 5% (500 basis points)
      500,  // partnerFeeInBps: 5% (500 basis points) - goes to fee wallet
      FeeSchedulerMode.Linear,
      0,    // numberOfPeriods: no fee reduction
      0     // periodFrequency: no fee reduction
    );
    const dynamicFeeParams = getDynamicFeeParams(100); // Max 1% dynamic fee based on volatility
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
    // Get ALL KOLs from database (all periods)
    console.log("📊 [DB] Fetching ALL KOLs from all periods");
    const allKolsRaw = await prisma.trader.findMany({
      orderBy: { rank: 'asc' },
      select: { id: true, name: true, rank: true, address: true, pnl: true, winRate: true, avatarUrl: true, xUrl: true, period: true, ticker: true, tokenMintAddress: true, poolAddress: true }
    });
    console.log(`✅ [DB] Retrieved ${allKolsRaw.length} total KOL records`);

    // Map to KolData format
    type KolRecord = typeof allKolsRaw[number];
    const allKols: KolRecord[] = allKolsRaw;

    // Group KOLs by NAME to identify duplicates across periods
    // Same name = same token/pool should be used
    console.log("🔍 [GROUP] Grouping KOLs by name to share tokens across periods");
    const kolGroupsByName = new Map<string, KolRecord[]>();

    for (const kol of allKols) {
      const name = kol.name.trim();
      if (!kolGroupsByName.has(name)) {
        kolGroupsByName.set(name, []);
      }
      kolGroupsByName.get(name)!.push(kol);
    }

    console.log(`✅ [GROUP] Found ${kolGroupsByName.size} unique names across ${allKols.length} records`);

    // Check which names already have tokens created
    const namesWithExistingTokens = new Map<string, { mint: string; pool: string; ticker: string }>();

    for (const [name, group] of kolGroupsByName.entries()) {
      // Check if any record in this group already has a token
      const existingToken = group.find(k => k.tokenMintAddress && k.poolAddress && k.ticker);
      if (existingToken) {
        namesWithExistingTokens.set(name, {
          mint: existingToken.tokenMintAddress!,
          pool: existingToken.poolAddress!,
          ticker: existingToken.ticker!
        });
        console.log(`♻️ [REUSE] Name "${name}" already has token: ${existingToken.tokenMintAddress} (ticker: ${existingToken.ticker})`);
      }
    }

    console.log(`♻️ [REUSE] Found ${namesWithExistingTokens.size} names with existing tokens`);

    // Process ONLY unique names (one token per unique name)
    const namesToProcess: { name: string; kol: KolRecord; allKolIds: string[]; existingToken?: { mint: string; pool: string; ticker: string } }[] = [];

    for (const [name, group] of kolGroupsByName.entries()) {
      const existingToken = namesWithExistingTokens.get(name);

      namesToProcess.push({
        name,
        kol: group[0], // Use first KOL as representative
        allKolIds: group.map(k => k.id),
        existingToken
      });

      if (existingToken) {
        console.log(`📦 [GROUP] ${name}: Will REUSE existing token (ticker: ${existingToken.ticker}) for ${group.length} records (${group.map(k => k.period).join(', ')})`);
      } else {
        console.log(`📦 [GROUP] ${name}: Will CREATE new token for ${group.length} records (${group.map(k => k.period).join(', ')})`);
      }
    }

    console.log(`🎯 [PROCESS] Total unique names: ${namesToProcess.length} (${namesWithExistingTokens.size} existing, ${namesToProcess.length - namesWithExistingTokens.size} new)`);

    const kols = namesToProcess.map(t => t.kol);

    // Setup wallet and program
    const walletKeypairInBytes = JSON.parse(process.env.ADMIN_KEYPAIR || "[]");
    const wallet = Keypair.fromSecretKey(Uint8Array.from(walletKeypairInBytes));
    console.log(`👛 [ADMIN] Wallet loaded: ${wallet.publicKey.toBase58()}`);

    const anchorWallet = new NodeWallet(wallet);
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
    anchor.setProvider(provider);

    const programId = new PublicKey("4nSNt5ed3cqPWRpwFf8SRvTfLyZvJRgUhwahc8jZQGG2");
    const program = new Program<Pnlpackprogram>(IDL as Pnlpackprogram, provider);
    const globalPackPoolAccount = new PublicKey("GrT2MFauW4JzY867xE61dMiMwETBfzbh9hzU6iLeq4iQ");
    console.log(`🔗 [ANCHOR] Program ID: ${programId.toBase58()}`);
    console.log(`🔗 [ANCHOR] GlobalPackPoolAccount: ${globalPackPoolAccount.toBase58()}`);

    // Process all unique names
    const results: { kolId: string; kolName: string; success: boolean; mintAddress?: string; poolAddress: string; ticker?: string; reused?: boolean; error?: string }[] = [];
    let successCount = 0, failureCount = 0, reuseCount = 0;

    console.log(`🔄 [PROCESS] Starting creation/reuse loop for ${namesToProcess.length} unique names`);
    for (let i = 0; i < namesToProcess.length; i++) {
      const { name, kol, allKolIds, existingToken } = namesToProcess[i];
      console.log(`\n➡️ [PROCESS] ${i + 1}/${namesToProcess.length} - Name: ${name}, KOL: ${kol.name} [${kol.period}]`);

      let result: { success: boolean; mintAddress?: string; poolAddress?: string; ticker?: string; error?: string };

      if (existingToken) {
        // REUSE existing token - no need to create
        console.log(`♻️ [REUSE] Using existing token for name "${name}" (ticker: ${existingToken.ticker})`);
        result = {
          success: true,
          mintAddress: existingToken.mint,
          poolAddress: existingToken.pool,
          ticker: existingToken.ticker
        };
        reuseCount++;
      } else {
        // CREATE new token
        console.log(`🆕 [CREATE] Creating new token for name "${name}"`);
        // Map database record to KolData type
        const kolData: KolData = {
          id: kol.id,
          name: kol.name,
          rank: kol.rank,
          address: kol.address,
          pnl: kol.pnl,
          winRate: kol.winRate,
          avatarUrl: kol.avatarUrl,
          xUrl: kol.xUrl,
          ticker: kol.ticker ?? undefined
        };
        result = await createSingleKolTokenImproved(kolData, i, wallet, program, globalPackPoolAccount);

        if (!result.success) {
          console.warn(`⚠️ [CONTINUE] Token creation failed for ${kol.name}, continuing with remaining KOLs`);
        }
      }

      results.push({
        kolId: kol.id,
        kolName: kol.name,
        success: result.success,
        poolAddress: result.poolAddress || '',
        mintAddress: result.mintAddress,
        ticker: result.ticker,
        reused: !!existingToken,
        error: result.error
      });

      // Update database with rarity - UPDATE ALL RECORDS WITH THIS NAME
      try {
        const rarity = determineRarity(kol.rank);
        const rarityWeight = getRarityWeight(rarity);

        console.log(`📝 [DB] Updating ${allKolIds.length} records for name "${name}" (ticker: ${result.ticker})`);

        // Update ALL records with the same name
        await prisma.trader.updateMany({
          where: { id: { in: allKolIds } },
          data: {
            tokenMintAddress: result.success ? result.mintAddress : null,
            poolAddress: result.success ? result.poolAddress : null,
            ticker: result.success ? result.ticker : null,
            rarity: rarity,
            rarityWeight: rarityWeight
          }
        });
        console.log(result.success
          ? `✅ [DB] Updated ${allKolIds.length} records with mint, pool, ticker (${result.ticker}), and rarity (${rarity}) for name "${name}"${existingToken ? ' (reused)' : ' (created)'}`
          : `⚠️ [DB] Stored null addresses and rarity (${rarity}) in ${allKolIds.length} records for name "${name}" (creation failed)`
        );
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (dbErr) {
        console.error(`❌ [DB] Update failed for name "${name}":`, dbErr);
        failureCount++;
        if (result.success) successCount--;
      }

      // Rate limiting only for new token creation
      if (!existingToken && i < namesToProcess.length - 1) {
        console.log(`⏳ [RATE] Waiting 3s before next token creation (${i + 2}/${namesToProcess.length})`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    console.log(`\n🎉 [SUMMARY] Success=${successCount} Failure=${failureCount} Reused=${reuseCount}`);
    const isFullSuccess = successCount === namesToProcess.length;

    return NextResponse.json({
      success: isFullSuccess,
      partialSuccess: successCount > 0 && !isFullSuccess,
      message: isFullSuccess
        ? `🎉 ALL ${namesToProcess.length} unique names processed! (${reuseCount} reused, ${successCount - reuseCount} created)`
        : successCount > 0
          ? `⚠️ Partial success: ${successCount}/${namesToProcess.length} tokens processed (${reuseCount} reused)`
          : "❌ All token creation attempts failed",
      data: {
        totalUniqueNames: namesToProcess.length,
        totalKolRecords: allKols.length,
        successCount,
        failureCount,
        reuseCount,
        newTokensCreated: successCount - reuseCount,
        results,
        readyForPackReveal: isFullSuccess,
        approach: "name_based_deduplication"
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