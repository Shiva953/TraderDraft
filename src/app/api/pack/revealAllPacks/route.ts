import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Pnlpackprogram, IDL } from '../../../../lib/idl';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';

const DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('51qa3toZbwVC1zTyntYZSsyqb2uZVuxpgJeYXZPoWJcY');
const ADMIN_KEY = new PublicKey('7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR');
const TOKENS_PER_KOL = new BN(40000 * Math.pow(10, 6)); // 40K tokens with 6 decimals

const MAX_TRANSACTION_SIZE = 1222; // Leave some buffer under 1232
const MAX_PACK_REVEALS_PER_TX = 4; // Estimated based on transaction size

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
  packOccurrences?: number;
  totalTokens?: BN;
}

interface PackData {
  packId: string;
  kols: KolData[];
}

interface RevealAllPacksRequest {
  numberOfPacks: number;
  userPublicKey?: string;
}

interface ConsolidatedKolData extends KolData {
  packOccurrences: number;
  totalTokens: BN;
  packIds: string[];
}

export function generatePackId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    const r = crypto.getRandomValues(new Uint32Array(1))[0] % chars.length;
    id += chars[r];
  }
  return id;
}

export async function POST(request: Request) {
  console.log('🚀 [API] /revealAllPacks called at', new Date().toISOString());

  try {
    const body: RevealAllPacksRequest = await request.json();
    const { numberOfPacks } = body;

    if (!numberOfPacks || numberOfPacks < 1 || numberOfPacks > 50) {
      return NextResponse.json(
        { success: false, error: 'numberOfPacks must be between 1 and 50' },
        { status: 400 }
      );
    }

    console.log(`🎁 Revealing ${numberOfPacks} packs (pack creation only)`);

    console.log('📊 Fetching top traders with tokens…');
    const allKolsData = await fetchTopTradersWithTokens();
    console.log(`📊 Retrieved ${allKolsData.length} KOLs from DB`);
    
    if (!allKolsData || allKolsData.length < 4) {
      console.error('❌ Not enough KOLs with tokens. Found:', allKolsData.length);
      return NextResponse.json(
        { success: false, error: 'Need at least 4 KOLs with tokens created.' },
        { status: 500 }
      );
    }

    console.log('🎲 Generating multiple packs with random KOL selection...');
    const packsData = generateMultiplePacksWithKols(allKolsData, numberOfPacks);
    console.log(`🎲 Generated ${packsData.length} packs`);

    console.log('🔄 Consolidating duplicate KOLs across packs...');
    const consolidatedKols = consolidateKolsAcrossPacks(packsData);
    console.log(`🔄 Consolidated to ${consolidatedKols.length} unique KOLs`);

    console.log('🧮 Preparing consolidated token data...');
    const konsolidatedKolsWithTokenData = await prepareConsolidatedKolTokenData(consolidatedKols);

    // MODIFIED: Only create pack accounts, no token transfers
    console.log('📦 Executing pack creation (no token transfers)...');
    const txResult = await executePackCreationOnly(packsData);
    console.log('📦 Pack creation result:', txResult);

    if (!txResult.success) {
      console.error('❌ Pack creation failed:', txResult.error);
      return NextResponse.json(
        { success: false, error: `Pack creation failed: ${txResult.error}` },
        { status: 500 }
      );
    }

    console.log('📝 Creating consolidated pack metadata…');
    const packMetadata = createConsolidatedPackMetadata(
      packsData, 
      konsolidatedKolsWithTokenData, 
      txResult
    );
    console.log('✅ Consolidated pack metadata prepared');

    console.log(`🎉 ${numberOfPacks} packs revealed successfully (pack creation only)!`);
    return NextResponse.json(
      { 
        success: true, 
        message: `${numberOfPacks} packs revealed successfully! Token claiming available through direct vault transfers.`, 
        data: packMetadata 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Top-level error in reveal all packs handler:', error);
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

// MODIFIED: Only create pack accounts, no token transfers
export async function executePackCreationOnly(
  packs: PackData[]
): Promise<{ success: boolean; signatures?: string[]; error?: string }> {
  console.log('📦 [executePackCreationOnly] Starting pack creation only...');
  
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

    const allSignatures: string[] = [];

    // Create pack accounts in batches
    console.log('📦 Creating pack accounts in batches...');
    const packBatches = chunkArray(packs, MAX_PACK_REVEALS_PER_TX);
    
    for (let batchIndex = 0; batchIndex < packBatches.length; batchIndex++) {
      const batch = packBatches[batchIndex];
      console.log(`📦 Processing pack batch ${batchIndex + 1}/${packBatches.length} with ${batch.length} packs`);
      
      const batchSignatures = await executeBatchedPackCreation(
        program, 
        batch, 
        connection, 
        adminKeypair
      );
      
      allSignatures.push(...batchSignatures);
      console.log(`✅ Pack batch ${batchIndex + 1} completed with ${batchSignatures.length} transactions`);
      
      // Small delay between batches to avoid overwhelming the RPC
      if (batchIndex < packBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return {
      success: true,
      signatures: allSignatures
    };

  } catch (error) {
    console.error('❌ Pack creation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Pack creation failed' };
  }
}

// MODIFIED: Only pack creation, no transfers
async function executeBatchedPackCreation(
  program: Program<Pnlpackprogram>,
  packs: PackData[],
  connection: Connection,
  adminKeypair: Keypair
): Promise<string[]> {
  const signatures: string[] = [];
  
  // For very small batches, try to combine instructions
  if (packs.length <= 2) {
    try {
      const signature = await executeCombinedPackCreation(program, packs, connection, adminKeypair);
      signatures.push(signature);
      return signatures;
    } catch (error) {
      console.warn('⚠️ Combined pack creation failed, falling back to individual transactions:', error);
    }
  }
  
  // Fallback: individual transactions with parallel execution
  const promises = packs.map(pack => 
    executePackCreationForSinglePack(program, pack.packId, pack.kols, connection, adminKeypair)
  );
  
  const results = await Promise.allSettled(promises);
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      signatures.push(result.value);
    } else {
      console.error(`❌ Pack creation failed for ${packs[i].packId}:`, result.reason);
      throw new Error(`Pack creation failed for ${packs[i].packId}: ${result.reason}`);
    }
  }
  
  return signatures;
}

// MODIFIED: Only pack creation
async function executeCombinedPackCreation(
  program: Program<Pnlpackprogram>,
  packs: PackData[],
  connection: Connection,
  adminKeypair: Keypair
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  
  const transaction = new Transaction();
  const instructions: TransactionInstruction[] = [];
  
  const [globalPackPool] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_pack_pool')],
    PROGRAM_ID
  );

  for (const pack of packs) {
    const [packAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('pack'), Buffer.from(pack.packId)],
      PROGRAM_ID
    );

    const kolInfoInputs = pack.kols.map(kol => {
      const pnlValue = parseFloat(kol.pnl.replace(/[^\d.-]/g, '')) || 0;
      const pnlInLamports = new BN(Math.floor(Math.abs(pnlValue) * LAMPORTS_PER_SOL));
      const winrateBps = Math.min(10000, Math.max(0, Math.floor((kol.winRate || 0) * 100)));
      
      return {
        name: kol.ticker!,
        address: kol.address ? new PublicKey(kol.address) : ADMIN_KEY,
        pfpUrl: (kol.avatarUrl || '').substring(0, 128),
        pnl: pnlValue >= 0 ? pnlInLamports : pnlInLamports.neg(),
        winrateBps,
        kolTokenMintAddress: kol.tokenMintAddress!
      };
    });

    const packRevealIx = await program.methods
      .packReveal(pack.packId, kolInfoInputs)
      .accountsPartial({
        globalPackPool,
        admin: ADMIN_KEY,
        packAccount,
        mintKolA: pack.kols[0].tokenMintAddress!,
        mintKolB: pack.kols[1].tokenMintAddress!,
        mintKolC: pack.kols[2].tokenMintAddress!,
        mintKolD: pack.kols[3].tokenMintAddress!,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    instructions.push(packRevealIx);
  }

  transaction.add(...instructions);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = adminKeypair.publicKey;
  transaction.sign(adminKeypair);

  const serializedTx = transaction.serialize();
  console.log(`📏 Combined pack creation transaction size: ${serializedTx.length} bytes`);

  if (serializedTx.length > MAX_TRANSACTION_SIZE) {
    throw new Error(`Combined transaction too large: ${serializedTx.length} > ${MAX_TRANSACTION_SIZE} bytes`);
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

// MODIFIED: Only pack creation
async function executePackCreationForSinglePack(
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
    
    return {
      name: kol.ticker!,
      address: kol.address ? new PublicKey(kol.address) : ADMIN_KEY,
      pfpUrl: (kol.avatarUrl || '').substring(0, 128),
      pnl: pnlValue >= 0 ? pnlInLamports : pnlInLamports.neg(),
      winrateBps,
      kolTokenMintAddress: kol.tokenMintAddress!
    };
  });

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
  console.log(`📏 Pack creation transaction size for ${packId}: ${serializedTx.length} bytes`);

  if (serializedTx.length > MAX_TRANSACTION_SIZE) {
    throw new Error(`Pack creation transaction too large: ${serializedTx.length} > ${MAX_TRANSACTION_SIZE} bytes`);
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

// Utility function to chunk arrays
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Keep existing functions unchanged for compatibility
function generateMultiplePacksWithKols(allKols: KolData[], numberOfPacks: number): PackData[] {
  console.log(`🎲 [generateMultiplePacksWithKols] Creating ${numberOfPacks} packs from ${allKols.length} available KOLs`);
  
  const packs: PackData[] = [];
  
  for (let i = 0; i < numberOfPacks; i++) {
    const packId = generatePackId();
    const selectedKols = selectRandomKols(allKols, 4);
    
    packs.push({
      packId,
      kols: selectedKols
    });
    
    console.log(`🎲 Pack ${i + 1}/${numberOfPacks} (${packId}): ${selectedKols.map(k => k.name).join(', ')}`);
  }
  
  console.log(`✅ Generated ${packs.length} packs successfully`);
  return packs;
}

function consolidateKolsAcrossPacks(packs: PackData[]): ConsolidatedKolData[] {
  console.log('🔄 [consolidateKolsAcrossPacks] Starting consolidation...');
  
  const kolMap = new Map<string, ConsolidatedKolData>();
  
  packs.forEach((pack, packIndex) => {
    console.log(`🔄 Processing pack ${packIndex + 1}: ${pack.packId}`);
    
    pack.kols.forEach(kol => {
      const kolKey = kol.id;
      
      if (kolMap.has(kolKey)) {
        const existingKol = kolMap.get(kolKey)!;
        existingKol.packOccurrences += 1;
        existingKol.totalTokens = existingKol.totalTokens.add(TOKENS_PER_KOL);
        existingKol.packIds.push(pack.packId);
        
        console.log(`🔄 Updated ${kol.name}: now appears in ${existingKol.packOccurrences} packs`);
      } else {
        const consolidatedKol: ConsolidatedKolData = {
          ...kol,
          packOccurrences: 1,
          totalTokens: new BN(TOKENS_PER_KOL),
          packIds: [pack.packId]
        };
        
        kolMap.set(kolKey, consolidatedKol);
        console.log(`🔄 Added new ${kol.name}: appears in 1 pack`);
      }
    });
  });
  
  const consolidatedArray = Array.from(kolMap.values());
  
  console.log('🔄 Consolidation complete:');
  consolidatedArray.forEach(kol => {
    console.log(`  - ${kol.name}: ${kol.packOccurrences} occurrences, ${kol.totalTokens.toString()} total tokens`);
  });
  
  return consolidatedArray;
}

export function createConsolidatedPackMetadata(
  packs: PackData[], 
  consolidatedKols: ConsolidatedKolData[], 
  txResult: any
) {
  const totalPacksRevealed = packs.length;
  const totalUniqueKols = consolidatedKols.length;
  const totalTokensReceived = consolidatedKols.reduce(
    (sum, kol) => sum + kol.totalTokens.toNumber(), 
    0
  );
  const totalEstimatedValue = consolidatedKols.reduce(
    (sum, kol) => sum + ((kol.tokenPrice || 0) * kol.totalTokens.toNumber()), 
    0
  );

  return {
    revealType: 'MULTIPLE_PACKS_OPTIMIZED_NO_TRANSFERS',
    revealedAt: new Date().toISOString(),
    totalPacksRevealed,
    totalUniqueKols,
    transactionSignatures: txResult.signatures || [],
    executionMode: 'Pack Creation Only - Direct Vault Claims (Devnet)',
    network: 'devnet',
    optimizations: [
      'Removed pack token transfers',
      'Direct vault-to-user claiming available',
      'Batched pack creation',
      'No user signatures required for claiming'
    ],
    packs: packs.map((pack, index) => ({
      packId: pack.packId,
      packIndex: index + 1,
      kols: pack.kols.map(kol => ({
        name: kol.name,
        ticker: kol.ticker,
        rank: kol.rank,
        tokenMintAddress: kol.tokenMintAddress?.toString()
      }))
    })),
    consolidatedKols: consolidatedKols.map((kol, index) => ({
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
      packOccurrences: kol.packOccurrences,
      tokensReceived: kol.totalTokens.toString(),
      tokensReceivedFormatted: formatTokenAmount(kol.totalTokens),
      tokensPerPack: TOKENS_PER_KOL.toString(),
      tokensPerPackFormatted: formatTokenAmount(TOKENS_PER_KOL),
      totalTokenAmount: kol.totalTokens.toNumber(),
      totalTokenAmountFormatted: formatTokenAmountToK(kol.totalTokens),
      estimatedValueSOL: (kol.tokenPrice || 0) * kol.totalTokens.toNumber(),
      estimatedValueUSD: ((kol.tokenPrice || 0) * kol.totalTokens.toNumber()) * 100,
      appearsInPacks: kol.packIds
    })),
    stats: {
      totalPacksRevealed,
      totalUniqueKols,
      totalTokensReceived,
      totalEstimatedValueSOL: totalEstimatedValue,
      totalEstimatedValueUSD: totalEstimatedValue * 100,
      avgWinRate: consolidatedKols.reduce((sum, kol) => sum + (kol.winRate || 0), 0) / totalUniqueKols,
      totalPnl: consolidatedKols.reduce((sum, kol) => {
        const pnlValue = parseFloat(kol.pnl.replace(/[^\d.-]/g, '')) || 0;
        return sum + (pnlValue * kol.packOccurrences);
      }, 0),
      avgRank: consolidatedKols.reduce((sum, kol) => sum + kol.rank, 0) / totalUniqueKols,
      bestRank: Math.min(...consolidatedKols.map(k => k.rank)),
      worstRank: Math.max(...consolidatedKols.map(k => k.rank)),
      mostFrequentKol: consolidatedKols.reduce((prev, current) => 
        (current.packOccurrences > prev.packOccurrences) ? current : prev
      ),
      duplicateRate: ((consolidatedKols.reduce((sum, kol) => sum + kol.packOccurrences, 0) - totalUniqueKols) / 
        (totalPacksRevealed * 4)) * 100
    }
  };
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

async function prepareConsolidatedKolTokenData(kols: ConsolidatedKolData[]): Promise<ConsolidatedKolData[]> {
  return Promise.all(kols.map(async (kol) => {
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

function formatTokenAmount(tokenAmount: BN): string {
  const tokens = tokenAmount.toNumber() / Math.pow(10, 6);
  return tokens.toLocaleString('en-US', { 
    maximumFractionDigits: 0 
  });
}

function formatTokenAmountToK(tokenAmount: BN): string {
  const tokens = tokenAmount.toNumber() / Math.pow(10, 6);
  if (tokens >= 1000) {
    return `${Math.floor(tokens / 1000)}K`;
  }
  return tokens.toLocaleString('en-US', { maximumFractionDigits: 0 });
}