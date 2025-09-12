
// all in devnet
// 1. GET KOLSCAN DATA FROM /api/getTopTraders [{name, ticker, pfpUrl, PNL, tokenprice,}, ....]
// 2. Choose 4 random KOLs(for a GIVEN PACK)
// 3. call pack_reveal()(for pack PDA creation) + (4 X [transfer_to_individual_pack(KOL_TOKEN_MINT, 40K amount)], for the 4 KOLs)(for 160K from global token vault -> pack account)[BUNDLED TXN, use jito bundles to execute that] with those 4 KOLs
// 4. return all the metadata associated with them to display in the UI after user opens the pack

import { NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair, LAMPORTS_PER_SOL, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN, web3 } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Pnlpackprogram, IDL } from '../../../lib/idl';
import bs58 from 'bs58';

// Constants
const DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('Cn3xRT72q5c99rMZKseUF8TkTFrpWTFBqMoLs3pNu2ZX');
const ADMIN_KEY = new PublicKey('7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR');
const TOKENS_PER_KOL = new BN(40000 * Math.pow(10, 6)); // 40K tokens with 6 decimals

interface KolData {
  name: string;
  address: string;
  pnl: string;
  winRate: number;
  avatarUrl: string;
  xUrl: string;
  rank: number;
  ticker?: string;
  tokenMintAddress?: PublicKey;
  tokenPrice?: number;
}

interface PackRevealRequest {
  packId: string;
  userPublicKey?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as PackRevealRequest;
    const { packId } = body;

    console.log('🎁 Starting pack reveal for pack:', packId);

    // Validation
    if (!packId || packId.length === 0 || packId.length > 32) {
      return NextResponse.json(
        { success: false, error: "Invalid pack ID. Must be between 1-32 characters." },
        { status: 400 }
      );
    }

    // Step 1: Get KOL data from database
    console.log('📊 Fetching top traders data...');
    const kolsData = await fetchTopTraders();
    if (!kolsData || kolsData.length < 4) {
      return NextResponse.json(
        { success: false, error: "Insufficient KOL data available. Need at least 4 KOLs." },
        { status: 500 }
      );
    }

    // Step 2: Select 4 random KOLs using crypto-secure randomness
    const selectedKols = selectRandomKols(kolsData, 4);
    console.log('🎲 Selected KOLs:', selectedKols.map(k => `${k.name} (Rank: ${k.rank})`));

    // Step 3: Prepare token data with proper mint addresses
    const kolsWithTokenData = await prepareKolTokenData(selectedKols);
    
    // Step 4: Verify all required tokens exist in vaults
    console.log('🔍 Verifying token vault availability...');
    await verifyTokenVaultsExist(kolsWithTokenData);
    
    // Step 5: Execute transactions (devnet uses sequential, mainnet could use bundles)
    console.log('⚡ Executing pack reveal transactions...');
    const txResult = await executePackRevealTransactions(packId, kolsWithTokenData);
    
    if (!txResult.success) {
      return NextResponse.json(
        { success: false, error: `Transaction failed: ${txResult.error}` },
        { status: 500 }
      );
    }

    // Step 6: Create and return pack metadata
    const packMetadata = createPackMetadata(packId, kolsWithTokenData, txResult);

    console.log('✅ Pack reveal completed successfully');

    return NextResponse.json({
      success: true,
      message: "Pack revealed successfully! 🎊",
      data: packMetadata
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Error in pack reveal:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      },
      { status: 500 }
    );
  }
}

async function fetchTopTraders(): Promise<KolData[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/getTopTraders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        period: 'daily', 
        limit: 50, // Get all 50 KOLs for better randomization
        fetchAll: false 
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch traders: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const traders = data.selected?.traders || data.topTradersForDay || [];
    
    if (traders.length === 0) {
      throw new Error('No traders found in response');
    }

    console.log(`📈 Fetched ${traders.length} traders from leaderboard`);

    return traders.map((trader: any) => ({
      name: trader.name || 'Unknown',
      address: trader.address || '',
      pnl: trader.pnl || '$0',
      winRate: trader.winRate || 0,
      avatarUrl: trader.avatarUrl || '',
      xUrl: trader.xUrl || '',
      rank: trader.rank || 0
    }));

  } catch (error) {
    console.error('❌ Error fetching traders:', error);
    throw new Error(`Failed to fetch trader data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function selectRandomKols(kols: KolData[], count: number): KolData[] {
  if (kols.length < count) {
    throw new Error(`Not enough KOLs available. Need ${count}, got ${kols.length}`);
  }

  const shuffled = [...kols];
  
  // Use crypto.getRandomValues for better randomness
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const j = randomBytes[0] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
}

async function prepareKolTokenData(kols: KolData[]): Promise<KolData[]> {
  return Promise.all(kols.map(async (kol, index) => {
    // Create a clean ticker from name (max 10 chars for safety)
    const cleanName = kol.name.replace(/[^a-zA-Z0-9]/g, '');
    const ticker = cleanName.substring(0, Math.min(10, cleanName.length)).toUpperCase() || `KOL${index + 1}`;
    
    // IMPORTANT: This assumes your token mints were created with this PDA pattern
    // Adjust based on how you actually create token mints in your createKOLTokensAndPool endpoint
    const [tokenMintAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('kol_token'), Buffer.from(ticker)],
      PROGRAM_ID
    );

    // Calculate token price based on performance metrics
    const rankFactor = Math.max(0.1, (51 - kol.rank) / 50); // Higher rank = higher price
    const pnlValue = parseFloat(kol.pnl.replace(/[^\d.-]/g, '')) || 0;
    const pnlFactor = Math.max(0.1, Math.min(3, 1 + (pnlValue / 100000))); // Cap at 3x
    const winRateFactor = Math.max(0.5, Math.min(2, kol.winRate / 50)); // 50% winrate = 1x
    
    const basePrice = 0.001; // Base price in SOL
    const tokenPrice = basePrice * rankFactor * pnlFactor * winRateFactor;

    return {
      ...kol,
      ticker,
      tokenMintAddress,
      tokenPrice: Math.round(tokenPrice * 1000000) / 1000000 // Round to 6 decimal places
    };
  }));
}

async function verifyTokenVaultsExist(kols: KolData[]): Promise<void> {
  try {
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    
    const [globalPackPool] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_pack_pool')],
      PROGRAM_ID
    );

    // Check each token vault exists and has sufficient balance
    for (const kol of kols) {
      const [tokenVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('token_vault'), Buffer.from(kol.ticker!), globalPackPool.toBuffer()],
        PROGRAM_ID
      );

      const vaultInfo = await connection.getAccountInfo(tokenVault);
      if (!vaultInfo) {
        throw new Error(`Token vault not found for KOL: ${kol.name} (${kol.ticker}). Run createKOLTokensAndPool first.`);
      }

      // TODO: Add balance check if needed
      // const vaultBalance = await connection.getTokenAccountBalance(tokenVault);
      // if (vaultBalance.value.uiAmount < TOKENS_PER_KOL.toNumber() / 1000000) {
      //   throw new Error(`Insufficient tokens in vault for ${kol.name}`);
      // }
    }

    console.log('✅ All token vaults verified');
  } catch (error) {
    console.error('❌ Token vault verification failed:', error);
    throw error;
  }
}

async function executePackRevealTransactions(
  packId: string, 
  kols: KolData[]
): Promise<{success: boolean, signatures?: string[], bundleId?: string, error?: string}> {
  try {
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    
    // Load admin keypair
    const adminPrivateKey = process.env.ADMIN_KEYPAIR;
    if (!adminPrivateKey) {
      throw new Error('ADMIN_PRIVATE_KEY environment variable not set');
    }
    
    const adminKeypair = Keypair.fromSecretKey(bs58.decode(adminPrivateKey));
    
    if (!adminKeypair.publicKey.equals(ADMIN_KEY)) {
      throw new Error('Admin keypair does not match expected admin key');
    }

    // Initialize program
    const adminWallet = new Wallet(adminKeypair);
    const provider = new AnchorProvider(connection, adminWallet, { 
      commitment: 'confirmed',
      preflightCommitment: 'confirmed'
    });
    const program = new Program<Pnlpackprogram>(IDL, provider);

    // Always use sequential on devnet (Jito bundles don't work on devnet)
    const isDevnet = DEVNET_RPC.includes('devnet');
    console.log(`🔗 Network: ${isDevnet ? 'Devnet (Sequential)' : 'Mainnet (Bundle capable)'}`);

    return await executeSequentialTransactions(program, packId, kols, connection, adminKeypair);

  } catch (error) {
    console.error('❌ Transaction execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed'
    };
  }
}

async function executeSequentialTransactions(
  program: Program<Pnlpackprogram>,
  packId: string,
  kols: KolData[],
  connection: Connection,
  adminKeypair: Keypair
): Promise<{success: boolean, signatures?: string[], error?: string}> {
  try {
    console.log('🔄 Executing transactions sequentially...');

    const signatures: string[] = [];
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    // Step 1: Execute pack reveal first
    console.log('📦 Creating pack reveal transaction...');
    const packRevealSig = await executePackReveal(program, packId, kols, connection, adminKeypair, blockhash);
    signatures.push(packRevealSig);
    console.log('✅ Pack reveal confirmed:', packRevealSig);

    // Step 2: Execute transfers in smaller batches (2 transfers per transaction to avoid size limits)
    console.log('💰 Executing token transfers...');
    const transferBatches = [];
    for (let i = 0; i < kols.length; i += 2) {
      transferBatches.push(kols.slice(i, i + 2));
    }

    for (let batchIndex = 0; batchIndex < transferBatches.length; batchIndex++) {
      const batch = transferBatches[batchIndex];
      console.log(`💸 Processing transfer batch ${batchIndex + 1}/${transferBatches.length} (${batch.length} transfers)`);
      
      const batchSig = await executeTransferBatch(
        program, 
        packId, 
        batch, 
        connection, 
        adminKeypair
      );
      
      signatures.push(batchSig);
      console.log(`✅ Transfer batch ${batchIndex + 1} confirmed:`, batchSig);
    }

    return {
      success: true,
      signatures
    };

  } catch (error) {
    console.error('❌ Sequential transaction execution error:', error);
    throw error;
  }
}

async function executePackReveal(
  program: Program<Pnlpackprogram>,
  packId: string,
  kols: KolData[],
  connection: Connection,
  adminKeypair: Keypair,
  blockhash: string
): Promise<string> {
  // Get PDAs
  const [globalPackPool] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_pack_pool')],
    PROGRAM_ID
  );

  const [packAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('pack'), Buffer.from(packId)],
    PROGRAM_ID
  );

  // Get all associated token addresses
  const tokenAccounts = await Promise.all(
    kols.map(async (kol) => {
      return await getAssociatedTokenAddress(
        kol.tokenMintAddress!,
        packAccount,
        true,
        TOKEN_2022_PROGRAM_ID
      );
    })
  );

  // Build KOL info inputs with proper validation
  const kolInfoInputs = kols.map(kol => {
    const pnlValue = parseFloat(kol.pnl.replace(/[^\d.-]/g, '')) || 0;
    const pnlInLamports = new BN(Math.floor(Math.abs(pnlValue) * LAMPORTS_PER_SOL));
    const winrateBps = Math.min(10000, Math.max(0, Math.floor((kol.winRate || 0) * 100)));

    return {
      name: kol.name.substring(0, 32), // Limit name length
      address: kol.address ? new PublicKey(kol.address) : ADMIN_KEY, // Use admin as fallback
      pfpUrl: (kol.avatarUrl || '').substring(0, 200), // Limit URL length
      pnl: pnlValue >= 0 ? pnlInLamports : pnlInLamports.neg(), // Handle negative PNL
      winrateBps,
      kolTokenMintAddress: kol.tokenMintAddress!
    };
  });

  // Create pack reveal instruction
  const packRevealIx = await program.methods
    .packReveal(packId, kolInfoInputs)
    .accountsPartial({
      globalPackPool,
      admin: ADMIN_KEY,
      packAccount,
      mintKolA: kols[0].tokenMintAddress!,
      packKolATa: tokenAccounts[0],
      mintKolB: kols[1].tokenMintAddress!,
      packKolBTa: tokenAccounts[1],
      mintKolC: kols[2].tokenMintAddress!,
      packKolCTa: tokenAccounts[2],
      mintKolD: kols[3].tokenMintAddress!,
      packKolDTa: tokenAccounts[3],
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .instruction();

  // Create and send transaction
  const transaction = new Transaction();
  transaction.add(packRevealIx);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = adminKeypair.publicKey;
  transaction.sign(adminKeypair);

  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed'
  });

  // Wait for confirmation
  const { lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight
  }, 'confirmed');

  return signature;
}

async function executeTransferBatch(
  program: Program<Pnlpackprogram>,
  packId: string,
  kolBatch: KolData[],
  connection: Connection,
  adminKeypair: Keypair
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  // Get PDAs
  const [globalPackPool] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_pack_pool')],
    PROGRAM_ID
  );

  const [packAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('pack'), Buffer.from(packId)],
    PROGRAM_ID
  );

  const transaction = new Transaction();

  // Add transfer instruction for each KOL in the batch
  for (const kol of kolBatch) {
    const [tokenVault] = PublicKey.findProgramAddressSync(
      [Buffer.from('token_vault'), Buffer.from(kol.ticker!), globalPackPool.toBuffer()],
      PROGRAM_ID
    );

    const packKolTa = await getAssociatedTokenAddress(
      kol.tokenMintAddress!,
      packAccount,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    const transferIx = await program.methods
      .transferToIndividualPack(kol.ticker!, TOKENS_PER_KOL)
      .accountsPartial({
        globalPackPool,
        packAccount,
        kolMint: kol.tokenMintAddress!,
        kolTokenVault: tokenVault,
        packKolTa,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();

    transaction.add(transferIx);
  }

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = adminKeypair.publicKey;
  transaction.sign(adminKeypair);

  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed'
  });

  // Wait for confirmation
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight
  }, 'confirmed');

  return signature;
}

function createPackMetadata(packId: string, kols: KolData[], txResult: any) {
  const totalTokensReceived = TOKENS_PER_KOL.toNumber() * 4;
  const totalEstimatedValue = kols.reduce(
    (sum, kol) => sum + ((kol.tokenPrice || 0) * TOKENS_PER_KOL.toNumber()), 
    0
  );

  return {
    packId,
    revealedAt: new Date().toISOString(),
    transactionSignatures: txResult.signatures || [],
    bundleId: txResult.bundleId || null,
    executionMode: 'Sequential Transactions (Devnet)',
    network: 'devnet',
    
    // KOL details
    kols: kols.map((kol, index) => ({
      slot: String.fromCharCode(65 + index), // A, B, C, D
      name: kol.name,
      ticker: kol.ticker,
      address: kol.address,
      tokenMintAddress: kol.tokenMintAddress?.toString(),
      pnl: kol.pnl,
      winRate: kol.winRate,
      avatarUrl: kol.avatarUrl,
      xUrl: kol.xUrl,
      rank: kol.rank,
      tokenPrice: kol.tokenPrice || 0,
      tokensReceived: TOKENS_PER_KOL.toString(),
      estimatedValueSOL: (kol.tokenPrice || 0) * TOKENS_PER_KOL.toNumber(),
      estimatedValueUSD: ((kol.tokenPrice || 0) * TOKENS_PER_KOL.toNumber()) * 100 // Assuming 100 SOL/USD for example
    })),
    
    // Pack statistics
    stats: {
      totalKols: 4,
      totalTokensReceived,
      totalEstimatedValueSOL: totalEstimatedValue,
      totalEstimatedValueUSD: totalEstimatedValue * 100,
      avgWinRate: kols.reduce((sum, kol) => sum + kol.winRate, 0) / 4,
      totalPnl: kols.reduce((sum, kol) => {
        const pnlValue = parseFloat(kol.pnl.replace(/[^\d.-]/g, '')) || 0;
        return sum + pnlValue;
      }, 0),
      avgRank: kols.reduce((sum, kol) => sum + kol.rank, 0) / 4,
      bestRank: Math.min(...kols.map(k => k.rank)),
      worstRank: Math.max(...kols.map(k => k.rank))
    },

    // Transaction details
    transactions: {
      packReveal: txResult.signatures?.[0] || null,
      transfers: txResult.signatures?.slice(1) || []
    }
  };
}