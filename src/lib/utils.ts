import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
    buildCurveWithMarketCap,
    DynamicBondingCurveClient,
    ActivationType,
    CollectFeeMode,
    BaseFeeMode,
    MigrationFeeOption,
    MigrationOption,
    TokenDecimal,
    TokenType,
    TokenUpdateAuthorityOption,
} from '@meteora-ag/dynamic-bonding-curve-sdk'
import { NATIVE_MINT } from '@solana/spl-token'
import BN from "bn.js"

const connection = new Connection("https://api.devnet.solana.com");

// Create a new instance of the DynamicBondingCurveClient
const dbcClient = new DynamicBondingCurveClient(connection, "confirmed");

// for creating the token(config + curve)
// first we create the curve
// creating curve = creating DBC Config Key(which contains all the config for bonding curve(eg - supply, fees, etc.) + defines behaviour of token after graduation)
// pool can only be created once we have the DBC ConfigKey Setup
export async function createKOLDBCTokenConfigAndCurve(supply: number, swapFee: number, feeReceiver: string, leftoverReceiver: string, initialMarketCap: number, migrationMarketCap: number){
    const keypairString = process.env.CURVE_CREATOR_KEYPAIR;
    if (!keypairString) {
        throw new Error("CURVE_CREATOR_KEYPAIR env variable is not set");
    }
    let keypairArray: Uint8Array;
    try {
        const parsed = JSON.parse(keypairString);
        if (!Array.isArray(parsed)) {
            throw new Error("CURVE_CREATOR_KEYPAIR is not a valid array");
        }
        keypairArray = new Uint8Array(parsed);
    } catch (e) {
        throw new Error(`Failed to parse CURVE_CREATOR_KEYPAIR: ${e}`);
    }
    const wallet = Keypair.fromSecretKey(keypairArray);
    console.log(`Using wallet: ${wallet.publicKey.toString()}`)

    const config = Keypair.generate() //curve config account
    console.log(`Config account: ${config.publicKey.toString()}`)

    const curveConfig = buildCurveWithMarketCap({
        totalTokenSupply: supply,
        initialMarketCap: initialMarketCap,
        migrationMarketCap: migrationMarketCap,
        migrationOption: MigrationOption.MET_DAMM_V2,
        tokenBaseDecimal: TokenDecimal.SIX,
        tokenQuoteDecimal: TokenDecimal.NINE,
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
                startingFeeBps: swapFee * 100,
                endingFeeBps: swapFee * 100,
                numberOfPeriod: 0,
                totalDuration: 0,
            },
            
        },
        dynamicFeeEnabled: true,
        activationType: ActivationType.Slot,
        collectFeeMode: CollectFeeMode.OutputToken,
        migrationFeeOption: MigrationFeeOption.FixedBps100,
        tokenType: TokenType.SPL,
        partnerLpPercentage: 0,
        creatorLpPercentage: 0,
    
        partnerLockedLpPercentage: 50,
        creatorLockedLpPercentage: 50,
        creatorTradingFeePercentage: 50,
        leftover: 0,
        tokenUpdateAuthority: TokenUpdateAuthorityOption.Immutable,
        migrationFee: {
            feePercentage: 0,
            creatorFeePercentage: 0,
        },
    })

    console.log(curveConfig)

    try {
        const client = new DynamicBondingCurveClient(connection, 'confirmed')

        const transaction = await client.partner.createConfig({
            config: config.publicKey,
            feeClaimer: new PublicKey(feeReceiver),
            leftoverReceiver: new PublicKey(leftoverReceiver),
            payer: wallet.publicKey,
            quoteMint: NATIVE_MINT,
            ...curveConfig,
        })

        const { blockhash } = await connection.getLatestBlockhash('confirmed')
        transaction.recentBlockhash = blockhash
        transaction.feePayer = wallet.publicKey

        transaction.partialSign(config)

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [wallet, config],
            { commitment: 'confirmed' }
        )

        console.log(`Config created successfully!`)
        console.log(
            `Transaction: https://solscan.io/tx/${signature}`
        )
        console.log(`Config address: ${config.publicKey.toString()}`)
    } catch (error) {
        console.error('Failed to create config:', error)
    }
}

// actual token mint + pool creation 
export async function createKOLTokenAndDBCPool(curveConfigAccountAddress: string){
    let payerKeypair: number[] | undefined;
    try {
        if (!process.env.PAYER_KEYPAIR) {
            throw new Error("PAYER_KEYPAIR environment variable is not set");
        }
        payerKeypair = JSON.parse(process.env.PAYER_KEYPAIR);
        if (!Array.isArray(payerKeypair)) {
            throw new Error("PAYER_KEYPAIR is not a valid array");
        }
    } catch (e) {
        throw new Error(`Failed to parse PAYER_KEYPAIR: ${e}`);
    }
    const payer = Keypair.fromSecretKey(new Uint8Array(payerKeypair));
    console.log(`Payer wallet: ${payer.publicKey.toString()}`);

    let poolCreatorKeypair: number[] | undefined
    try {
        if (!process.env.POOL_CREATOR_ADMIN_KEYPAIR) {
            throw new Error("POOL_CREATOR_ADMIN_KEYPAIR environment variable is not set");
        }
        // If the env var is a string like "[63, 256, ...]", parse it
        poolCreatorKeypair = JSON.parse(process.env.POOL_CREATOR_ADMIN_KEYPAIR);
        if (!Array.isArray(poolCreatorKeypair)) {
            throw new Error("POOL_CREATOR_ADMIN_KEYPAIR is not a valid array");
        }
    } catch (e) {
        throw new Error(`Failed to parse PAYER_KEYPAIR: ${e}`);
    }
    const poolCreator = Keypair.fromSecretKey(
        new Uint8Array(poolCreatorKeypair)
    )
    console.log(`Pool creator wallet: ${poolCreator.publicKey.toString()}`)

    const configAddress = new PublicKey(curveConfigAccountAddress)
    console.log(`Using config: ${configAddress.toString()}`)

    try {
        const baseMint = Keypair.generate() //The ACTUAL TOKEN MINT for the KOL
        console.log(`Generated base token mint: ${baseMint.publicKey.toString()}`)

        const createPoolParam = {
            baseMint: baseMint.publicKey,
            config: configAddress,
            name: 'YOUR_POOL_NAME',
            symbol: 'YOUR_POOL_SYMBOL',
            uri: 'YOUR_POOL_IMAGE_URI',
            payer: payer.publicKey,
            poolCreator: poolCreator.publicKey,
        }

        const client = new DynamicBondingCurveClient(connection, 'confirmed')

        console.log('Creating pool transaction...')
        //creates the token DBC pool along with initialzing the token account
        const poolTransaction = await client.pool.createPool(createPoolParam)

        const signature = await sendAndConfirmTransaction(
            connection,
            poolTransaction,
            [payer, baseMint, poolCreator],
            {
                commitment: 'confirmed',
                skipPreflight: true,
            }
        )
        console.log('Transaction confirmed!')
        console.log(
            `Pool created: https://solscan.io/tx/${signature}?cluster=devnet`
        )
    } catch (error) {
        console.error('Failed to create pool:', error)
        console.log('Error details:', JSON.stringify(error, null, 2))
    }
}

// FIRST TOKEN BUY FROM THE CREATED DBC POOL
export async function swapBuy(DBCPoolAddress: string, amountToBuy: number, amountOut: number) { //amount out = number of DBC tokens to buy(get using swapQuote)
    const keypairString = process.env.ADMIN_KEYPAIR!;
    const keypairArray = JSON.parse(keypairString);
    const wallet = Keypair.fromSecretKey(new Uint8Array(keypairArray));
    console.log(`Using wallet: ${wallet.publicKey.toString()}`)

    const poolAddress = new PublicKey(DBCPoolAddress)
    console.log(`Swapping in pool: ${poolAddress.toString()}`)

    try {
        const client = new DynamicBondingCurveClient(connection, 'confirmed')

        const swapParam = {
            amountIn: new BN(1 * 1e9), // 1 SOL
            minimumAmountOut: new BN(amountOut), // Can get this param from swapQuote
            swapBaseForQuote: false,
            owner: wallet.publicKey,
            pool: poolAddress,
            referralTokenAccount: null, // Can parse in a token account address to collect fees
        }

        const swapTransaction = await client.pool.swap(swapParam)

        const swapSignature = await sendAndConfirmTransaction(
            connection,
            swapTransaction,
            [wallet],
            {
                commitment: 'confirmed',
                skipPreflight: true,
                maxRetries: 5,
            }
        )

        console.log(
            `Swap executed: https://solscan.io/tx/${swapSignature}?cluster=devnet`
        )
    } catch (error) {
        console.error('Failed to execute swap:', error)
    }
}

// after given price conditions are met, GP is created
export async function createGraduationPool(gradSwapFee: number){

}

