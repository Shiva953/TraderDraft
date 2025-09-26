
// all in devnet
// 1. GET KOLSCAN DATA FROM /api/getTopTraders [{name, ticker, pfpUrl, PNL, tokenprice,}, ....]
// 2. Choose 4 random KOLs(for a GIVEN PACK)
// 3. call [pack_reveal()(for pack PDA creation) + (4 X [transfer_to_individual_pack(KOL_TOKEN_MINT, 40K amount)]], for the 4 KOLs)(for 160K from global token vault -> pack account)[BUNDLED TXN, use jito bundles to execute that] with those 4 KOLs
// 4. return all the metadata associated with them to display in the UI after user opens the pack

// IN MAINNET, GROUP ALL THE 4 TXNS IN JITO BUNDLES SO THAT IT ORDER+ATOMICITY REMAINS FOR 4*transfer_to_individual_pack()
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Pnlpackprogram, IDL } from '../../../../lib/idl';
import bs58 from 'bs58';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';

const DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('CzhWAZRNcshcFiEgwoQAgKpXdQV1cxUNVEVsoGHzMxui');
const ADMIN_KEY = new PublicKey('7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR');
const TOKENS_PER_KOL = new BN(40000 * Math.pow(10, 6)); // 40K tokens with 6 decimals

const prisma = new PrismaClient();

interface KolData {
  id: string;
  name: string;
  address: string | null;
  pnl: string;
  winRate: number | null;
  avatarUrl: string | null;
  xUrl: string | null;
  rank: number;
  ticker?: string;
  tokenMintAddress?: PublicKey;
  tokenPrice?: number;
}

interface PackRevealRequest {
  packId: string;
  userPublicKey?: string;
}

function generatePackId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    const r = crypto.getRandomValues(new Uint32Array(1))[0] % chars.length;
    id += chars[r];
  }
  return id;
}

export async function POST(request: Request) {
  console.log('🚀 [API] /packReveal called at', new Date().toISOString());

  try {
    const packId = generatePackId();
    console.log('🎁 Generated random packId:', packId);

    console.log('🔍 Checking token readiness…');
    const tokenReadinessCheck = await verifyAllTokensReady();
    console.log('🔍 Token readiness result:', tokenReadinessCheck);
    if (!tokenReadinessCheck.ready) {
      console.warn('⏳ Tokens not ready:', tokenReadinessCheck.details);
      return NextResponse.json(
        {
          success: false,
          error:
            'Cannot reveal pack: Not all KOL tokens have been created yet.',
          details: tokenReadinessCheck.details,
          suggestion:
            'Please run /api/createTokensAndPool first and ensure all 40 tokens are created successfully.',
        },
        { status: 412 }
      );
    }

    console.log('📊 Fetching top traders with tokens…');
    const kolsData = await fetchTopTradersWithTokens();
    console.log(`📊 Retrieved ${kolsData.length} KOLs from DB`);
    if (!kolsData || kolsData.length < 4) {
      console.error('❌ Not enough KOLs with tokens. Found:', kolsData.length);
      return NextResponse.json(
        { success: false, error: 'Need at least 4 KOLs with tokens created.' },
        { status: 500 }
      );
    }

    const selectedKols = selectRandomKols(kolsData, 4);
    console.log(
      '🎲 Selected KOLs:',
      selectedKols.map((k) => ({
        name: k.name,
        rank: k.rank,
        mint: k.tokenMintAddress?.toString(),
      }))
    );

    console.log('🧮 Preparing token data for selected KOLs…');
    const kolsWithTokenData = await prepareKolTokenData(selectedKols);
    console.log('🧮 Prepared KOL token data:', kolsWithTokenData);

    console.log('🔐 Verifying token vaults exist…');
    await verifyTokenVaultsExist(kolsWithTokenData);
    console.log('🔐 Vault verification done.');

    console.log('⚡ Executing on-chain pack reveal transactions…');
    const txResult = await executePackRevealTransactions(packId, kolsWithTokenData);
    console.log('⚡ Transaction execution result:', txResult);

    if (!txResult.success) {
      console.error('❌ Pack reveal transaction failed:', txResult.error);
      return NextResponse.json(
        { success: false, error: `Transaction failed: ${txResult.error}` },
        { status: 500 }
      );
    }

    console.log('📝 Creating pack metadata…');
    const packMetadata = createPackMetadata(packId, kolsWithTokenData, txResult);
    console.log('✅ Pack metadata prepared:', packMetadata);

    console.log('🎉 Pack reveal completed successfully!');
    return NextResponse.json(
      { success: true, message: 'Pack revealed successfully! 🎊', data: packMetadata },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Top-level error in pack reveal handler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  } finally {
    console.log('🔌 Disconnecting Prisma client');
    await prisma.$disconnect();
  }
}

async function verifyTokenVaultsExist(kols: KolData[]): Promise<void> {
  console.log('🔍 [verifyTokenVaultsExist] Checking vaults for', kols.length, 'KOLs');
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const [globalPackPool] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_pack_pool')],
    PROGRAM_ID
  );

  for (const kol of kols) {
    const [tokenVault] = PublicKey.findProgramAddressSync(
      [Buffer.from('token_vault'), Buffer.from(kol.ticker!), globalPackPool.toBuffer()],
      PROGRAM_ID
    );
    console.log(`🔍 Checking vault for ${kol.name} (${kol.ticker}) -> ${tokenVault.toBase58()}`);

    const vaultInfo = await connection.getAccountInfo(tokenVault);
    if (!vaultInfo) {
      console.error(`❌ Vault missing for ${kol.name} (${kol.ticker})`);
      throw new Error(
        `Token vault not found for KOL: ${kol.name} (${kol.ticker}). Did createTokensAndPool run?`
      );
    }
  }
  console.log('✅ All token vaults verified');
}

async function executePackRevealTransactions(
  packId: string,
  kols: KolData[]
): Promise<{ success: boolean; signatures?: string[]; bundleId?: string; error?: string }> {
  console.log('⚙️ [executePackRevealTransactions] Starting for packId:', packId);
  try {
    const connection = new Connection(DEVNET_RPC, 'confirmed');
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

    const result = await executeSimplifiedSequentialTransactions(program, packId, kols, connection, adminKeypair);
    console.log('✅ Simplified execution finished with result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in executePackRevealTransactions:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Transaction failed' };
  }
}

async function executeSimplifiedSequentialTransactions(
  program: Program<Pnlpackprogram>,
  packId: string,
  kols: KolData[],
  connection: Connection,
  adminKeypair: Keypair
): Promise<{success: boolean, signatures?: string[], error?: string}> {
  try {
    console.log('🔄 Executing simplified sequential transactions...');
    const signatures: string[] = [];

    // Step 1: Pack reveal (now much smaller - no ATA creation)
    console.log('📦 Creating pack reveal transaction...');
    const packRevealSig = await executeSimplifiedPackReveal(program, packId, kols, connection, adminKeypair);
    signatures.push(packRevealSig);
    console.log('✅ Pack reveal confirmed:', packRevealSig);

    // Step 2: Individual transfers (will create ATAs automatically)
    console.log('💰 Executing individual token transfers with ATA creation...');
    for (let i = 0; i < kols.length; i++) {
      const kol = kols[i];
      console.log(`💸 Processing transfer ${i + 1}/${kols.length} for ${kol.name} (${kol.ticker})`);
      const transferSig = await executeTransferWithATACreation(
        program, 
        packId, 
        kol, 
        connection, 
        adminKeypair
      );
      signatures.push(transferSig);
      console.log(`✅ Transfer ${i + 1} confirmed for ${kol.name}:`, transferSig);
      
      if (i < kols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return {
      success: true,
      signatures
    };

  } catch (error) {
    console.error('❌ Simplified sequential execution error:', error);
    throw error;
  }
}

async function executeSimplifiedPackReveal(
  program: Program<Pnlpackprogram>,
  packId: string,
  kols: KolData[],
  connection: Connection,
  adminKeypair: Keypair
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  const [globalPackPool] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_pack_pool')],
    PROGRAM_ID
  );

  const [packAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('pack'), Buffer.from(packId)],
    PROGRAM_ID
  );

  const kolInfoInputs = kols.map(kol => {
    const pnlValue = parseFloat(kol.pnl.replace(/[^\d.-]/g, '')) || 0;
    const pnlInLamports = new BN(Math.floor(Math.abs(pnlValue) * LAMPORTS_PER_SOL));
    const winrateBps = Math.min(10000, Math.max(0, Math.floor((kol.winRate || 0) * 100)));
    // const shrinkedName = kol.ticker?.substring(0, 4)!;
    return {
      name: kol.ticker!, 
      address: kol.address ? new PublicKey(kol.address) : ADMIN_KEY,
      pfpUrl: (kol.avatarUrl || '').substring(0, 128), // Shortened
      pnl: pnlValue >= 0 ? pnlInLamports : pnlInLamports.neg(),
      winrateBps,
      kolTokenMintAddress: kol.tokenMintAddress!
    };
  });

  // Much simpler instruction - no ATA accounts needed
  const packRevealIx = await program.methods
    .packReveal(packId, kolInfoInputs)
    .accountsPartial({
      globalPackPool,
      admin: ADMIN_KEY,
      packAccount,
      mintKolA: kols[0].tokenMintAddress!,
      mintKolB: kols[1].tokenMintAddress!,
      mintKolC: kols[2].tokenMintAddress!,
      mintKolD: kols[3].tokenMintAddress!,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const transaction = new Transaction();
  transaction.add(packRevealIx);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = adminKeypair.publicKey;
  transaction.sign(adminKeypair);

  const serializedTx = transaction.serialize();
  console.log(`📏 Simplified pack reveal transaction size: ${serializedTx.length} bytes`);

  if (serializedTx.length > 1232) {
    throw new Error(`Pack reveal transaction still too large: ${serializedTx.length} > 1232 bytes`);
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

async function executeTransferWithATACreation(
  program: Program<Pnlpackprogram>,
  packId: string,
  kol: KolData,
  connection: Connection,
  adminKeypair: Keypair
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  const [globalPackPool] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_pack_pool')],
    PROGRAM_ID
  );

  const [packAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('pack'), Buffer.from(packId)],
    PROGRAM_ID
  );

  const [tokenVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_vault'), Buffer.from(kol.ticker!), globalPackPool.toBuffer()],
    PROGRAM_ID
  );

  const packKolTa = await getAssociatedTokenAddress(
    kol.tokenMintAddress!,
    packAccount,
    true,
    TOKEN_PROGRAM_ID
  );

  // This instruction will now create the ATA if it doesn't exist
  const transferIx = await program.methods
    .transferToIndividualPack(kol.ticker!, TOKENS_PER_KOL)
    .accountsPartial({
      globalPackPool,
      packAccount,
      kolMint: kol.tokenMintAddress!,
      kolTokenVault: tokenVault,
      packKolTa,
      admin: ADMIN_KEY, // Required as payer for ATA creation
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
  console.log(`📏 Transfer transaction size for ${kol.name}: ${serializedTx.length} bytes`);
  
  if (serializedTx.length > 1232) {
    throw new Error(`Transfer transaction too large: ${serializedTx.length} > 1232 bytes for KOL: ${kol.name}`);
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

async function executeIndividualTransfer(
  program: Program<Pnlpackprogram>,
  packId: string,
  kol: KolData,
  connection: Connection,
  adminKeypair: Keypair
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  const [globalPackPool] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_pack_pool')],
    PROGRAM_ID
  );

  const [packAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('pack'), Buffer.from(packId)],
    PROGRAM_ID
  );

  const [tokenVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_vault'), Buffer.from(kol.ticker!), globalPackPool.toBuffer()],
    PROGRAM_ID
  );

  const packKolTa = await getAssociatedTokenAddress(
    kol.tokenMintAddress!,
    packAccount,
    true,
    TOKEN_PROGRAM_ID
  );

  const transferIx = await program.methods
    .transferToIndividualPack(kol.ticker!, TOKENS_PER_KOL)
    .accountsPartial({
      globalPackPool,
      packAccount,
      kolMint: kol.tokenMintAddress!,
      kolTokenVault: tokenVault,
      packKolTa,
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
  console.log(`📏 Transaction size for ${kol.name}: ${serializedTx.length} bytes`);
  
  if (serializedTx.length > 1232) {
    throw new Error(`Transaction still too large: ${serializedTx.length} > 1232 bytes for KOL: ${kol.name}`);
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
    executionMode: 'Individual Sequential Transactions (Devnet)',
    network: 'devnet',
    kols: kols.map((kol, index) => ({
      slot: String.fromCharCode(65 + index),
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
      estimatedValueUSD: ((kol.tokenPrice || 0) * TOKENS_PER_KOL.toNumber()) * 100,
      transferSignature: txResult.signatures?.[index + 1] || null
    })),
    stats: {
      totalKols: 4,
      totalTokensReceived,
      totalEstimatedValueSOL: totalEstimatedValue,
      totalEstimatedValueUSD: totalEstimatedValue * 100,
      avgWinRate: kols.reduce((sum, kol) => sum + (kol.winRate || 0), 0) / 4,
      totalPnl: kols.reduce((sum, kol) => {
        const pnlValue = parseFloat(kol.pnl.replace(/[^\d.-]/g, '')) || 0;
        return sum + pnlValue;
      }, 0),
      avgRank: kols.reduce((sum, kol) => sum + kol.rank, 0) / 4,
      bestRank: Math.min(...kols.map(k => k.rank)),
      worstRank: Math.max(...kols.map(k => k.rank))
    },
    transactions: {
      packReveal: txResult.signatures?.[0] || null,
      transfers: kols.map((kol, index) => ({
        kol: kol.name,
        ticker: kol.ticker,
        signature: txResult.signatures?.[index + 1] || null
      }))
    }
  };
}

async function verifyAllTokensReady(): Promise<{ ready: boolean; details: string }> {
  try {
    const totalKols = await prisma.trader.count({
      where: { period: 'DAILY' }
    });

    const kolsWithTokens = await prisma.trader.count({
      where: { 
        period: 'DAILY',
        tokenMintAddress: { not: null }
      }
    });

    const kolsWithoutTokens = await prisma.trader.count({
      where: { 
        period: 'DAILY',
        tokenMintAddress: null
      }
    });

    console.log(`📊 Token readiness: ${kolsWithTokens}/${totalKols} KOLs have tokens created`);

    if (totalKols < 40) {
      return {
        ready: false,
        details: `Only ${totalKols}/40 KOLs found in database. Please ensure leaderboard is populated first.`
      };
    }

    if (kolsWithTokens < 40) {
      return {
        ready: false,
        details: `Only ${kolsWithTokens}/40 KOL tokens created. ${kolsWithoutTokens} tokens are missing. Please run createTokensAndPool endpoint first.`
      };
    }

    return {
      ready: true,
      details: `All ${kolsWithTokens}/40 KOL tokens are ready for pack reveals.`
    };

  } catch (error) {
    console.error('❌ Error checking token readiness:', error);
    return {
      ready: false,
      details: `Error checking token readiness: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function fetchTopTradersWithTokens(): Promise<KolData[]> {
  try {
    console.log('📈 Fetching KOLs with token mint addresses from database...');
    
    const traders = await prisma.trader.findMany({
      where: { 
        period: 'DAILY',
        tokenMintAddress: { not: null }
      },
      orderBy: { rank: 'asc' },
      select: {
        id: true,
        rank: true,
        ticker: true,
        name: true,
        address: true,
        pnl: true,
        winRate: true,
        avatarUrl: true,
        xUrl: true,
        tokenMintAddress: true
      }
    });
    
    if (traders.length === 0) {
      throw new Error('No traders with created tokens found in database');
    }

    console.log(`📈 Retrieved ${traders.length} traders with token mints from database`);

    return traders.map((trader) => ({
      id: trader.id,
      name: trader.name || 'Unknown',
      address: trader.address,
      pnl: trader.pnl || '$0',
      winRate: trader.winRate || 0,
      avatarUrl: trader.avatarUrl,
      xUrl: trader.xUrl,
      rank: trader.rank || 0,
      ticker: trader.ticker || '',
      tokenMintAddress: trader.tokenMintAddress ? new PublicKey(trader.tokenMintAddress) : undefined
    })).filter(kol => kol.tokenMintAddress !== undefined) as KolData[];

  } catch (error) {
    console.error('❌ Error fetching traders with tokens:', error);
    throw new Error(`Failed to fetch trader data with tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function selectRandomKols(kols: KolData[], count: number): KolData[] {
  if (kols.length < count) throw new Error(`Need ${count}, got ${kols.length}`);

  const shuffled = [...kols];

  for (let i = shuffled.length - 1; i > 0; i--) {
    // rejection sampling to avoid modulo bias
    let rand: number;
    const max = 0xffffffff;
    const limit = max - (max % (i + 1));
    do {
      rand = crypto.getRandomValues(new Uint32Array(1))[0];
    } while (rand >= limit);
    const j = rand % (i + 1);

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}


async function prepareKolTokenData(kols: KolData[]): Promise<KolData[]> {
  return Promise.all(kols.map(async (kol, index) => {
    if (!kol.tokenMintAddress) {
      throw new Error(`Token mint address missing for KOL: ${kol.name}`);
    }

    if (!kol.ticker) {
      throw new Error(`Ticker missing for KOL: ${kol.name}. Please ensure createTokensAndPool was run successfully.`);
    }

    const rankFactor = Math.max(0.1, (51 - kol.rank) / 40);
    const pnlValue = parseFloat(kol.pnl.replace(/[^\d.-]/g, '')) || 0;
    const pnlFactor = Math.max(0.1, Math.min(3, 1 + (pnlValue / 100000)));
    const winRateFactor = Math.max(0.5, Math.min(2, (kol.winRate || 0) / 40));
    const basePrice = 0.001;
    const tokenPrice = basePrice * rankFactor * pnlFactor * winRateFactor;

    return {
      ...kol,
      tokenPrice: Math.round(tokenPrice * 1000000) / 1000000
    };
  }));
}