import { NextResponse } from 'next/server';
import { DynamicBondingCurveClient, buildCurve, MigrationOption, TokenDecimal, BaseFeeMode, ActivationType, CollectFeeMode, MigrationFeeOption, TokenType, TokenUpdateAuthorityOption, DammV2DynamicFeeMode, deriveDbcPoolAddress, prepareSwapAmountParam, getCurrentPoint, SwapMode } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { NATIVE_MINT, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from 'bn.js';

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const dbcClient = new DynamicBondingCurveClient(connection, "confirmed");

export async function POST(request: Request) {
  try {
    console.log("🚀 Starting DBC Token Creation Process...");
    
    const { traderName, traderTokenTicker } = await request.json();
    console.log(`📝 Token Details - Name: ${traderName}, Ticker: ${traderTokenTicker}`);
    
    const walletKeypairInBytes = JSON.parse(process.env.ADMIN_KEYPAIR || "[]");
    const wallet = Keypair.fromSecretKey(Uint8Array.from(walletKeypairInBytes));
    console.log(`👛 Admin Wallet Public Key: ${wallet.publicKey.toString()}`);
    

    const baseMintKeypair = Keypair.generate(); // Your token mint
    const configKeypair = Keypair.generate(); // Config key
    console.log(`🔑 Generated Base Mint Keypair: ${baseMintKeypair.publicKey.toString()}`);
    console.log(`⚙️ Generated Config Keypair: ${configKeypair.publicKey.toString()}`);

    // Use devnet faucet token (SOL)
    const quoteMint = NATIVE_MINT;
    console.log(`💰 Quote Mint (SOL): ${quoteMint.toString()}`);

    console.log("\n📊 Building DBC Curve Configuration...");
    // creating NEW TOKEN MINT + DBC CURVE 
    const curveConfig = buildCurve({
        totalTokenSupply: 1_000_000_000, // 1B tokens
        percentageSupplyOnMigration: 6, // 6% = 60M tokens in DBC pool
        migrationQuoteThreshold: 1, // Minimum threshold for migration
        migrationOption: MigrationOption.MET_DAMM_V2,
        tokenBaseDecimal: TokenDecimal.SIX, // Use enum instead of number
        tokenQuoteDecimal: TokenDecimal.NINE, // Use enum instead of number
        lockedVestingParam: {
          totalLockedVestingAmount: 0,
          numberOfVestingPeriod: 0,
          cliffUnlockAmount: 0,
          totalVestingDuration: 0,
          cliffDurationFromMigrationTime: 0,
        },
        baseFeeParams: {
          baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
          feeSchedulerParam: {
            startingFeeBps: 500, // 5% constant fee
            endingFeeBps: 500,   // 5% constant fee
            numberOfPeriod: 0,   // No periods = constant fee
            totalDuration: 0,    // No duration = constant fee
          },
        },
        dynamicFeeEnabled: false, // No dynamic fees as requested
        activationType: ActivationType.Timestamp,
        collectFeeMode: CollectFeeMode.QuoteToken,
        migrationFeeOption: MigrationFeeOption.Customizable,
        tokenType: TokenType.SPL,
        partnerLpPercentage: 25,
        creatorLpPercentage: 25,
        partnerLockedLpPercentage: 25,
        creatorLockedLpPercentage: 25,
        creatorTradingFeePercentage: 0,
        leftover: 0,
        tokenUpdateAuthority: TokenUpdateAuthorityOption.Immutable,
        migrationFee: {
          feePercentage: 0,
          creatorFeePercentage: 0,
        },
        migratedPoolFee: {
          collectFeeMode: 0,
          dynamicFee: 0,
          poolFeeBps: 100,
        },
      });

    console.log("✅ DBC Curve Configuration Built Successfully");
    console.log(`📈 Sqrt Start Price: ${curveConfig.sqrtStartPrice.toString()}`);
    console.log(`📊 Curve Data Length: ${curveConfig.curve.length} bytes`);

    console.log("\n🏗️ Creating DBC Config and Pool...");

    // TOKEN MINT + POOL CREATION TXN, ALONG WITH TOKEN VAULT
    const createConfigAndPoolTx = await dbcClient.pool.createConfigAndPool({
        payer: wallet.publicKey,
        config: configKeypair.publicKey,
        feeClaimer: wallet.publicKey,
        leftoverReceiver: wallet.publicKey,
        quoteMint: NATIVE_MINT, // SOL devnet faucet
        
        poolFees: {
          baseFee: {
            cliffFeeNumerator: new BN(50_000_000), // 5% constant fee (500 bps)
            firstFactor: 0, // No periods for constant fee
            secondFactor: new BN(0), // No frequency for constant fee
            thirdFactor: new BN(0), // No reduction for constant fee
            baseFeeMode: 0 // FeeSchedulerLinear
          },
          dynamicFee: null // No dynamic fees as requested
        },
        
        activationType: 1, // Timestamp
        collectFeeMode: 0, // QuoteToken
        migrationOption: 1, // DAMM v2
        tokenType: 0, // SPL
        tokenDecimal: 6,
        migrationQuoteThreshold: new BN(1_000_000_000), // 1 SOL (9 decimals)
        
        // LP percentages (must add up to 100)
        partnerLpPercentage: 25,
        creatorLpPercentage: 25,
        partnerLockedLpPercentage: 25,
        creatorLockedLpPercentage: 25,
        
        sqrtStartPrice: curveConfig.sqrtStartPrice,
        
        lockedVesting: {
          amountPerPeriod: new BN(0),
          cliffDurationFromMigrationTime: new BN(0),
          frequency: new BN(0),
          numberOfPeriod: new BN(0),
          cliffUnlockAmount: new BN(0)
        },
        
        migrationFeeOption: MigrationFeeOption.Customizable, // Fixed 100bps
        
        tokenSupply: {
          preMigrationTokenSupply: new BN(1_000_000_000 * 10**6), // 1B tokens with 6 decimals
          postMigrationTokenSupply: new BN(1_000_000_000 * 10**6)
        },
        
        creatorTradingFeePercentage: 0,
        tokenUpdateAuthority: 1, // Immutable
        
        migrationFee: {
          feePercentage: 0,
          creatorFeePercentage: 0
        },
        
        migratedPoolFee: {
            collectFeeMode: 0,
            dynamicFee: 0,
            poolFeeBps: 100,
        },
        
        padding: [],
        curve: curveConfig.curve,
        
        preCreatePoolParam: {
          baseMint: baseMintKeypair.publicKey,
          name: traderName,
          symbol: traderTokenTicker,
          uri: 'https://launch.meteora.ag/icons/logo.svg',
          poolCreator: wallet.publicKey
        }
      });

      let blockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
      createConfigAndPoolTx.recentBlockhash = blockhash;
      createConfigAndPoolTx.feePayer = wallet.publicKey;
      
      console.log("📝 Transaction prepared, signing with all required keypairs...");
      console.log("📡 Sending create config and pool transaction...");

      const signature = await sendAndConfirmTransaction(
        connection, 
        createConfigAndPoolTx, 
        [wallet, configKeypair, baseMintKeypair],
        {
          commitment: 'confirmed',
          maxRetries: 3
        }
      );
      console.log(`✅ Config and Pool Created Successfully! Signature: ${signature}`);


    await connection.confirmTransaction(signature, 'confirmed');

    console.log("\n💰 Preparing First Token Buy (0.1 SOL)...");

    // EXECUTE FIRST TOKEN BUYBACK WITH 0.1 SOL

    const poolAddress = await deriveDbcPoolAddress(quoteMint, baseMintKeypair.publicKey, configKeypair.publicKey);
    console.log(`🏊 Derived Pool Address: ${poolAddress.toString()}`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("📊 Fetching pool and config states...");

    let virtualPoolState;
    let poolConfigState;
    let retries = 5;
    
    while (retries > 0) {
      try {
        virtualPoolState = await dbcClient.state.getPool(poolAddress);
        console.log(`📈 Pool State Retrieved - Config: ${virtualPoolState.config.toString()}`);
        
        poolConfigState = await dbcClient.state.getPoolConfig(virtualPoolState.config);
        console.log(`⚙️ Pool Config State Retrieved - Activation Type: ${poolConfigState.activationType}`);
        break;
      } catch (error) {
        console.log(`⏳ Retrying pool state fetch... (${retries} attempts left)`);
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Get current point based on activation type
    const currentPoint = await getCurrentPoint(connection, poolConfigState!.activationType);
    console.log(`📍 Current Point: ${currentPoint.toString()}`);

    // SWAP AMOUNT -> 0.1 SOL
    const amountIn = await prepareSwapAmountParam(0.1, NATIVE_MINT, connection);
    console.log(`💵 Prepared swap amount: ${amountIn.toString()} lamports (0.1 SOL)`);

    console.log("💱 Getting swap quote...");

    const quote = await dbcClient.pool.swapQuote({
        virtualPool: virtualPoolState!,
        config: poolConfigState!,
        swapBaseForQuote: false, // Buying base token with SOL
        amountIn,
        slippageBps: 100, // 1% slippage - increased for devnet
        hasReferral: false,
        currentPoint,
    });

    console.log(`📊 Swap Quote - Amount Out: ${quote.outputAmount} tokens`);
    console.log(`💰 Fee Amount: ${quote.tradingFee}`);


    const userTokenAccount = await getAssociatedTokenAddress(
      baseMintKeypair.publicKey,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );


    const tokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
    
    console.log("🔄 Creating swap transaction...");

    let swapTransaction = await dbcClient.pool.swap({
        owner: wallet.publicKey,
        amountIn: amountIn,
        minimumAmountOut: new BN(0), // 0 for now, needs to be changed in prod
        swapBaseForQuote: false, // Buying base token with SOL
        pool: poolAddress,
        referralTokenAccount: null,
        payer: wallet.publicKey,
    });

    // If token account doesn't exist, create it first
    if (!tokenAccountInfo) {
      console.log("🏦 Creating associated token account...");
      const createATAIx = createAssociatedTokenAccountInstruction(
        wallet.publicKey, 
        userTokenAccount, 
        wallet.publicKey, 
        baseMintKeypair.publicKey,
        TOKEN_PROGRAM_ID
      );

      const newTx = new Transaction();
      newTx.add(createATAIx);
      
      swapTransaction.instructions.forEach(ix => {
        newTx.add(ix);
      });
      
      swapTransaction = newTx;
    }

    let swapBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
    swapTransaction.recentBlockhash = swapBlockhash;
    swapTransaction.feePayer = wallet.publicKey;

    console.log("📡 Sending swap transaction...");

    const swapSignature = await sendAndConfirmTransaction(
      connection, 
      swapTransaction, 
      [wallet],
      {
        commitment: 'confirmed',
        maxRetries: 3
      }
    );
    console.log(`✅ Swap completed successfully! Signature: ${swapSignature}`);

    console.log("\n🎉 DBC Token Creation Process Completed Successfully!");
    console.log(`📋 Summary:`);
    console.log(`   - Token Name: ${traderName}`);
    console.log(`   - Token Ticker: ${traderTokenTicker}`);
    console.log(`   - Base Mint: ${baseMintKeypair.publicKey.toString()}`);
    console.log(`   - Config: ${configKeypair.publicKey.toString()}`);
    console.log(`   - Pool Address: ${poolAddress.toString()}`);
    console.log(`   - Creation Signature: ${signature}`);
    console.log(`   - First Buy Signature: ${swapSignature}`);

    return NextResponse.json({ 
      success: true,
      data: {
        tokenName: traderName,
        tokenTicker: traderTokenTicker,
        baseMint: baseMintKeypair.publicKey.toString(),
        config: configKeypair.publicKey.toString(),
        poolAddress: poolAddress.toString(),
        creationSignature: signature,
        firstBuySignature: swapSignature
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Error in DBC Token Creation:", error);
    console.error("🔍 Error Stack:", error instanceof Error ? error.stack : 'No stack trace available');
    
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : 'No additional details'
    }, { status: 500 });
  }
}