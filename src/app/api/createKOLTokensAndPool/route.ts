// using DAMM v2
import { NextResponse } from 'next/server';
import { CpAmm, FeeSchedulerMode, getBaseFeeParams, getDynamicFeeParams, getSqrtPriceFromPrice, PoolFeesParams } from "@meteora-ag/cp-amm-sdk"
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, clusterApiUrl } from "@solana/web3.js";
import { NATIVE_MINT, createMint, getAccount, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, mintTo } from "@solana/spl-token";
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
console.log("🌐 Connected to Solana Devnet with commitment: confirmed");

// 1. CREATE TOKEN MINT + METADATA (1 txn)
// 2. COMBINED TXN: MINT 1B TO ADMIN + INIT VAULT + TRANSFER 940M FROM ADMIN -> VAULT(1 txn) 
// 3. CREATE POOL WITH REMAINING 60M (1 txn)[ADMIN -> POOL]
// 3 TRANSACTIONS (down from 6+)
// NEXT - COMBINE THESE 3 IN A JITO BUNDLE so that 94% TO VAULT + 6% TO DAMM HAPPENS AT ONCE
// FINALLY: 50 SUCH TXNS FOR 50 KOLS, IN JITO BUNDLES OF 5 (TOTAL 10 BUNDLES) 

const cpAmm = new CpAmm(connection)
const tokenADecimal = 6;
const tokenBDecimal = 9; // SOL has 9 decimals

function getMetadataPDA(mint: PublicKey): PublicKey {
  console.log(`🔑 Deriving Metadata PDA for mint: ${mint.toString()}`);
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  console.log(`✅ Metadata PDA derived: ${metadataPDA.toString()}`);
  return metadataPDA;
}

export async function POST(request: Request) {
  console.log("📩 [API CALL] POST / - OPTIMIZED DAMM v2 Pool Creation Request Received");
  try {
    const { traderName, traderTokenTicker } = await request.json();
    console.log(`📦 Request Body Parsed -> traderName: ${traderName}, traderTokenTicker: ${traderTokenTicker}`);

    const walletKeypairInBytes = JSON.parse(process.env.ADMIN_KEYPAIR || "[]");
    console.log("🔑 Admin Wallet Keypair Loaded from ENV");

    const wallet = Keypair.fromSecretKey(Uint8Array.from(walletKeypairInBytes));
    console.log(`👛 Admin Wallet Public Key: ${wallet.publicKey.toString()}`);

    const anchorWallet = new NodeWallet(wallet);
    const provider = new AnchorProvider(connection, anchorWallet, {commitment: "confirmed"});
    anchor.setProvider(provider);

    const programId = new PublicKey("Cn3xRT72q5c99rMZKseUF8TkTFrpWTFBqMoLs3pNu2ZX");
    const program = new Program<Pnlpackprogram>(IDL as Pnlpackprogram, provider);

    const decimals = 6;
    const baseMintKeypair = Keypair.generate();
    console.log(`🎲 Generated Token Mint Keypair: ${baseMintKeypair.publicKey.toString()}`);

    console.log("📊 Calculating Token Supply Distribution...");
    const totalSupply = new BN(1_000_000_000).mul(new BN(10).pow(new BN(decimals))); // 1B tokens with 6 decimals
    const vaultAmount = new BN(940_000_000).mul(new BN(10).pow(new BN(decimals))); // 94% for vault
    const poolAmount = new BN(60_000_000).mul(new BN(10).pow(new BN(decimals))); // 6% for pool
    console.log(`📊 Total Supply: ${totalSupply.toString()}, Vault Amount: ${vaultAmount.toString()}, Pool Amount: ${poolAmount.toString()}`);

    // TRANSACTION 1: CREATE TOKEN MINT + METADATA
    console.log("\n🚀 TRANSACTION 1: Creating Token Mint + Metadata...");
    
    const tokenMint = await createMint(
      connection,
      wallet, 
      wallet.publicKey,
      null,
      decimals,
      baseMintKeypair 
    )
    console.log(`✅ Token Mint Created! Mint: ${baseMintKeypair.publicKey.toString()}`);

    const metadataPDA = getMetadataPDA(baseMintKeypair.publicKey);
    
    const tokenMetadata: DataV2 = {
      name: traderName,
      symbol: traderTokenTicker,
      uri: "https://launch.meteora.ag/icons/logo.svg",
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null
    };
    console.log("📝 Token Metadata Prepared:", tokenMetadata);

    const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: baseMintKeypair.publicKey,
        mintAuthority: wallet.publicKey,
        payer: wallet.publicKey,
        updateAuthority: wallet.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: tokenMetadata,
          isMutable: true,
          collectionDetails: null
        }
      }
    );

    const metadataTransaction = new Transaction().add(createMetadataInstruction);
    const metadataSignature = await sendAndConfirmTransaction(
      connection,
      metadataTransaction,
      [wallet, baseMintKeypair],
      { commitment: "confirmed", maxRetries: 3 }
    );
    console.log(`✅ TRANSACTION 1 COMPLETE! Metadata Created: ${metadataSignature}`);

    // TRANSACTION 2: COMBINED - MINT 1B TO ADMIN + INIT VAULT + TRANSFER 940M ADMIN -> PACK TOKEN VAULT FOR GIVEN KOL
    console.log("\n🚀🚀 TRANSACTION 2: SUPER COMBINED INSTRUCTION");
    console.log("   - Creating Admin ATA (if needed)");
    console.log("   - Minting 1B tokens to Admin");
    console.log("   - Initializing Token Vault");
    console.log("   - Transferring 940M tokens to Vault");

    // Derive required PDAs
    const [globalPackPoolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_pack_pool")], 
      program.programId
    );
    
    const [tokenVaultAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("token_vault"),
        Buffer.from(traderTokenTicker),
        globalPackPoolAccount.toBuffer()
      ],
      program.programId
    );

    const adminTokenAccount = await getAssociatedTokenAddress(
      baseMintKeypair.publicKey,
      wallet.publicKey
    );

    console.log("📍 Account Addresses:");
    console.log("   - Global Pack Pool:", globalPackPoolAccount.toString());
    console.log("   - Token Vault:", tokenVaultAccount.toString());
    console.log("   - Admin Token Account:", adminTokenAccount.toString());
    console.log("   - Mint:", baseMintKeypair.publicKey.toString());

    const superCombinedStartTime = Date.now();

    const superCombinedTx = await program.methods.mintAndInitKolTokenVaultAndTransfer(
        traderTokenTicker,
        totalSupply,
        vaultAmount
      )
      .accountsPartial({
        globalPackPool: globalPackPoolAccount,
        admin: wallet.publicKey,
        mint: baseMintKeypair.publicKey,
        adminTokenAccount: adminTokenAccount,
        tokenVault: tokenVaultAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([wallet])
      .rpc({ commitment: "confirmed" });

    const superCombinedEndTime = Date.now();
    console.log(`✅ TRANSACTION 2 COMPLETE! Super Combined Success: ${superCombinedTx}`);
    console.log(`⚡ Execution time: ${superCombinedEndTime - superCombinedStartTime}ms`);

    // Verify the results
    console.log("\n📊 VERIFICATION:");
    const adminBalanceAfter = await getAccount(connection, adminTokenAccount);
    const vaultBalanceAfter = await getAccount(connection, tokenVaultAccount);
    
    const adminBalanceHuman = Number(adminBalanceAfter.amount) / Math.pow(10, 6);
    const vaultBalanceHuman = Number(vaultBalanceAfter.amount) / Math.pow(10, 6);
    
    console.log(`   - Admin Balance: ${adminBalanceHuman} tokens (should be ~60M)`);
    console.log(`   - Vault Balance: ${vaultBalanceHuman} tokens (should be 940M)`);
    console.log(`   - Vault Authority: ${vaultBalanceAfter.owner.toString()}`);

    if (Math.abs(adminBalanceHuman - 60000000) < 1000 && Math.abs(vaultBalanceHuman - 940000000) < 1000) {
      console.log("✅ Super Combined Instruction VERIFIED!");
    } else {
      console.warn("⚠️  Balance verification failed - check token distribution");
    }

    // TRANSACTION 3: CREATE LIQUIDITY POOL
    console.log("\n🚀 TRANSACTION 3: Creating Liquidity Pool...");

    console.log("📡 Fetching cpAmm configs...");
    const configs = await cpAmm.getAllConfigs();
    const publicConfig = configs.find(config => 
      config.account.poolCreatorAuthority.toString() === "11111111111111111111111111111111"
    );
    if (!publicConfig) {
      throw new Error("No public config found");
    }
    console.log(`✅ Public Config: ${publicConfig.publicKey.toString()}`);

    const tokenAMint = baseMintKeypair.publicKey; 
    const tokenBMint = NATIVE_MINT; 
    const solAmount = new BN(1_000_000_000); // 1 SOL

    console.log("📐 Calculating Price Ranges...");
    const sqrtMinPrice = getSqrtPriceFromPrice("0.0001", tokenADecimal, tokenBDecimal);
    const sqrtMaxPrice = getSqrtPriceFromPrice("0.01", tokenADecimal, tokenBDecimal);

    const { initSqrtPrice, liquidityDelta } = cpAmm.preparePoolCreationParams({
      tokenAAmount: poolAmount, // 60M tokens (remaining after vault transfer)
      tokenBAmount: solAmount,  // 1 SOL
      minSqrtPrice: sqrtMinPrice,
      maxSqrtPrice: sqrtMaxPrice
    });

    console.log("💰 Configuring Pool Fees...");
    const baseFeeParams = getBaseFeeParams(500, 500, FeeSchedulerMode.Linear, 0, 0); // 5% base swap fee
    const dynamicFeeParams = getDynamicFeeParams(100); // 1% max dynamic fee
    const poolFees: PoolFeesParams = {
      baseFee: baseFeeParams,
      dynamicFee: dynamicFeeParams,
      padding: []
    };

    const positionNftMint = Keypair.generate();
    console.log(`🎲 Position NFT Mint: ${positionNftMint.publicKey.toString()}`);

    const { tx, pool, position } = await cpAmm.createCustomPool({
      payer: wallet.publicKey,
      creator: wallet.publicKey,
      positionNft: positionNftMint.publicKey,
      tokenAMint,
      tokenBMint,
      tokenAAmount: poolAmount, // 60M tokens from admin account
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

    console.log("✍️ Signing & Sending Pool Creation Transaction...");
    let blockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
    tx.recentBlockhash = blockhash;
    tx.sign(wallet, positionNftMint);
    
    const poolCreationSignature = await sendAndConfirmTransaction(
      connection,
      tx,
      [wallet, positionNftMint],
      { commitment: 'confirmed' }
    );
    
    console.log(`✅ TRANSACTION 3 COMPLETE! Pool Created: ${pool.toString()}`);
    console.log(`   - Pool Address: ${pool.toString()}`);
    console.log(`   - Position Address: ${position.toString()}`);
    console.log(`   - Signature: ${poolCreationSignature}`);


    console.log("\n🎉 OPTIMIZED POOL CREATION COMPLETE!");
    console.log("📈 TRANSACTION SUMMARY:");
    console.log("   1. ✅ Token Mint + Metadata Creation");
    console.log("   2. ✅ Super Combined: Mint + Vault Init + Transfer");
    console.log("   3. ✅ Liquidity Pool Creation");
    console.log("🚀 TOTAL: 3 TRANSACTIONS (down from 6+)");
    console.log("⚡ 50%+ transaction reduction achieved!");

    return NextResponse.json({ 
      success: true,
      optimized: true,
      transactionCount: 3,
      data: {
        tokenName: traderName,
        tokenTicker: traderTokenTicker,
        tokenMint: baseMintKeypair.publicKey.toString(),
        metadataPDA: metadataPDA.toString(),
        metadataSignature: metadataSignature,
        superCombinedSignature: superCombinedTx,
        poolAddress: pool.toString(),
        positionAddress: position.toString(),
        poolCreationSignature: poolCreationSignature,
        tokenDistribution: {
          totalSupply: totalSupply.toString(),
          adminBalance: adminBalanceHuman.toString() + " tokens",
          vaultBalance: vaultBalanceHuman.toString() + " tokens",
          poolAmount: (Number(poolAmount) / Math.pow(10, 6)).toString() + " tokens"
        },
        accounts: {
          globalPackPool: globalPackPoolAccount.toString(),
          tokenVault: tokenVaultAccount.toString(),
          adminTokenAccount: adminTokenAccount.toString()
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Error in OPTIMIZED DAMM v2 Pool Creation:", error);
    console.error("🔍 Error Stack:", error instanceof Error ? error.stack : 'No stack trace available');
    
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : 'No additional details'
    }, { status: 500 });
  }
}