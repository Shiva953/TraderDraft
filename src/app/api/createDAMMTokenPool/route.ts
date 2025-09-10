// using DAMM v2
import { NextResponse } from 'next/server';
import { CpAmm, FeeSchedulerMode, getBaseFeeParams, getDynamicFeeParams, getSqrtPriceFromPrice, PoolFeesParams } from "@meteora-ag/cp-amm-sdk"
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { NATIVE_MINT, createMint, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, mintTo } from "@solana/spl-token";
import { 
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  DataV2
} from "@metaplex-foundation/mpl-token-metadata";
import BN from 'bn.js';

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
console.log("🌐 Connected to Solana Devnet with commitment: confirmed");

// JUST AFTER SALE RAISE ENDS
// GET KOL DATA -> CREATE TOKEN (1B) -> INIT_TOKEN_VAULT()[FOR THE GLOBAL PACK POOL ACCOUNT] -> TRANSFER 940M TO PACK VAULT -> CREATE POOL WITH REMAINING 60M
// REPEAT WITH 50 TXNS WITH EACH KOL PER TXN(NOT TO CALL THE API ENDPOINT 50 TIMES),

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
  console.log("📩 [API CALL] POST / - DAMM v2 Pool Creation Request Received");
  try {
    const { traderName, traderTokenTicker } = await request.json();
    console.log(`📦 Request Body Parsed -> traderName: ${traderName}, traderTokenTicker: ${traderTokenTicker}`);

    const walletKeypairInBytes = JSON.parse(process.env.ADMIN_KEYPAIR || "[]");
    console.log("🔑 Admin Wallet Keypair Loaded from ENV");

    const wallet = Keypair.fromSecretKey(Uint8Array.from(walletKeypairInBytes));
    console.log(`👛 Admin Wallet Public Key: ${wallet.publicKey.toString()}`);

    const decimals = 6;
    const baseMintKeypair = Keypair.generate();
    console.log(`🎲 Generated Token Mint Keypair: ${baseMintKeypair.publicKey.toString()}`);

    // Create token mint
    console.log("🚀 Creating Token Mint...");
    const tokenMint = await createMint(
      connection,
      wallet, 
      wallet.publicKey,
      null,
      decimals,
      baseMintKeypair 
    )
    console.log(`✅ Token Mint Created! Mint: ${baseMintKeypair.publicKey.toString()} (${tokenMint.toString()})`);


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
    console.log("🛠️ Metadata Instruction Created");

    console.log("🚀 Sending Metadata Transaction...");
    const metadataTransaction = new Transaction().add(createMetadataInstruction);
    const metadataSignature = await sendAndConfirmTransaction(
      connection,
      metadataTransaction,
      [wallet, baseMintKeypair],
      { commitment: "confirmed", maxRetries: 3 }
    );
    console.log(`✅ Token Metadata Created! Signature: ${metadataSignature}`);

    console.log("🔍 Deriving Associated Token Account for Admin...");
    const adminTokenAccount = await getAssociatedTokenAddress(
      baseMintKeypair.publicKey,
      wallet.publicKey
    );
    console.log(`📌 Derived ATA: ${adminTokenAccount.toString()}`);

    console.log("🚀 Creating Associated Token Account...");
    const ataIx = createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      adminTokenAccount, 
      wallet.publicKey, 
      baseMintKeypair.publicKey 
    );
    const ataTx = new Transaction().add(ataIx);
    const ataSignature = await sendAndConfirmTransaction(
      connection,
      ataTx,
      [wallet],
      { commitment: "confirmed", maxRetries: 3 }
    );
    console.log(`✅ Associated Token Account Created! Address: ${adminTokenAccount.toString()}, Signature: ${ataSignature}`);

    console.log("📊 Calculating Token Supply Distribution...");
    const totalSupply = new BN(1_000_000_000).mul(new BN(10).pow(new BN(decimals))); // 1B tokens with 6 decimals
    const vaultAmount = new BN(940_000_000).mul(new BN(10).pow(new BN(decimals))); // 94% for vault
    const poolAmount = new BN(60_000_000).mul(new BN(10).pow(new BN(decimals))); // 6% for pool
    console.log(`📊 Total Supply: ${totalSupply.toString()}, Vault Amount: ${vaultAmount.toString()}, Pool Amount: ${poolAmount.toString()}`);

    console.log("🚀 Minting Total Supply to Admin's Token Account...");
    const mintSignature = await mintTo(
      connection,
      wallet,
      baseMintKeypair.publicKey, 
      adminTokenAccount,
      wallet, 
      totalSupply.toNumber()
    );
    console.log(`✅ Minted ${totalSupply.toString()} tokens to Admin ATA. Signature: ${mintSignature}`);

    // TODO: Vault transfer step (not implemented)
    // init_token_vault() + TRANSFER 940M TO PACK TREASURY VAULT(transfer_to_vault())

    // POOL CREATION IN THE END
    console.log("📡 Fetching all cpAmm configs...");
    const configs = await cpAmm.getAllConfigs();
    console.log(`📦 Total Configs Fetched: ${configs.length}`);
    const publicConfig = configs.find(config => 
      config.account.poolCreatorAuthority.toString() === "11111111111111111111111111111111"
    );
    if (!publicConfig) {
      console.error("❌ No public config found in cpAmm configs");
      throw new Error("No public config found");
    }
    console.log(`✅ Public Config Selected: ${publicConfig.publicKey.toString()}`);


    console.log("⚙️ Preparing Pool Creation Params...");
    const tokenAMint = baseMintKeypair.publicKey; 
    const tokenBMint = NATIVE_MINT; 
    const solAmount = new BN(1_000_000_000); 
    const initPrice = 0.001; // initial price, 1 token = 0.001 SOL

    console.log("📐 Calculating Price Ranges...");
    // const initSqrtPrice = getSqrtPriceFromPrice(initPrice.toString(), tokenADecimal, tokenBDecimal);
    const sqrtMinPrice = getSqrtPriceFromPrice("0.0001", tokenADecimal, tokenBDecimal);
    const sqrtMaxPrice = getSqrtPriceFromPrice("0.01", tokenADecimal, tokenBDecimal);
    console.log(`📐 Min: ${sqrtMinPrice.toString()}, Max: ${sqrtMaxPrice.toString()}`);

    console.log("💧 Calculating Liquidity Delta...");

    const { initSqrtPrice, liquidityDelta } = cpAmm.preparePoolCreationParams({
        tokenAAmount: poolAmount, // 60M tokens
        tokenBAmount: solAmount,  // 1 SOL
        minSqrtPrice: sqrtMinPrice,
        maxSqrtPrice: sqrtMaxPrice
      });

    console.log("✅ Liquidity Delta Calculated");


    console.log("💰 Configuring Pool Fees...");
    const baseFeeParams = getBaseFeeParams(500, 500, FeeSchedulerMode.Linear, 0, 0); // 5% base swap fee
    const dynamicFeeParams = getDynamicFeeParams(100); // 1% max dynamic fee
    const poolFees: PoolFeesParams = {
      baseFee: baseFeeParams,
      dynamicFee: dynamicFeeParams,
      padding: []
    };
    console.log("✅ Pool Fees Configured:", poolFees);

    const positionNftMint = Keypair.generate();
    console.log(`🎲 Generated Position NFT Mint: ${positionNftMint.publicKey.toString()}`);

    console.log("🚀 Creating Custom Pool with Dynamic Config...");
    const { tx, pool, position } = await cpAmm.createCustomPool({
      payer: wallet.publicKey,
      creator: wallet.publicKey,
      positionNft: positionNftMint.publicKey,
      tokenAMint,
      tokenBMint,
      tokenAAmount: poolAmount, 
      tokenBAmount: solAmount,
      sqrtMinPrice,
      sqrtMaxPrice,
      initSqrtPrice,
      liquidityDelta,
      poolFees,
      hasAlphaVault: false,
      collectFeeMode: 0, // 0: Both tokens
      activationPoint: null, // Start immediately
      activationType: 1, // 1: timestamp
      tokenAProgram: TOKEN_PROGRAM_ID,
      tokenBProgram: TOKEN_PROGRAM_ID,
    });
    console.log("✅ Pool Transaction Prepared: ", tx);


    console.log("✍️ Signing & Sending Pool Creation Transaction...");
    let blockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
    tx.recentBlockhash = blockhash;
    tx.sign(wallet, positionNftMint); // Include position NFT keypair in signers
    const poolCreationSignature = await sendAndConfirmTransaction(
        connection,
        tx,
        [wallet, positionNftMint],
        { commitment: 'confirmed' }
    );
    console.log(`✅ Pool Created! Pool: ${pool.toString()}, Position: ${position.toString()}, Signature: ${poolCreationSignature}`);

    return NextResponse.json({ 
      success: true,
      data: {
        tokenName: traderName,
        tokenTicker: traderTokenTicker,
        tokenMint: baseMintKeypair.publicKey.toString(),
        metadataPDA: metadataPDA.toString(),
        metadataSignature: metadataSignature,
        poolAddress: pool.toString(),
        positionAddress: position.toString(),
        poolCreationSignature: poolCreationSignature,
        totalSupply: totalSupply.toString(),
        poolAmount: poolAmount.toString(),
        vaultAmount: vaultAmount.toString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Error in DAMM v2 Pool Creation:", error);
    console.error("🔍 Error Stack:", error instanceof Error ? error.stack : 'No stack trace available');
    
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : 'No additional details'
    }, { status: 500 });
  }
}
