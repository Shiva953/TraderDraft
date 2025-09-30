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
import {
  determineRarity,
  getRarityWeight,
  selectRandomKolsWithRarity,
  fetchTopTradersWithTokensAndRarity,
  generateMultiplePacksWithRarity,
  createEnhancedPackMetadata,
  updateTradersWithRarity,
  RARITY_CONFIG
} from '@/lib/rarity';
import { Rarity } from '@prisma/client';
import { executePackCreationOnly } from '../revealAllPacks/route';
import { KolDataWithRarity, PackData, ConsolidatedKolData } from '@/types';

const DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('CzhWAZRNcshcFiEgwoQAgKpXdQV1cxUNVEVsoGHzMxui');
const ADMIN_KEY = new PublicKey('7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR');
const TOKENS_PER_KOL = new BN(40000 * Math.pow(10, 6)); // 40K tokens with 6 decimals

const MAX_TRANSACTION_SIZE = 1222;
const MAX_PACK_REVEALS_PER_TX = 4;

const prisma = new PrismaClient();

interface RevealAllPacksRequestWithRarity {
  numberOfPacks: number;
  userPublicKey?: string;
  initializeRarity?: boolean; // Optional flag to initialize rarity system
}

export async function POST(request: Request) {
  console.log('🚀 [API] /revealAllPacks with RARITY called at', new Date().toISOString());

  try {
    const body: RevealAllPacksRequestWithRarity = await request.json();
    const { numberOfPacks, initializeRarity = false } = body;

    if (!numberOfPacks || numberOfPacks < 1 || numberOfPacks > 50) {
      return NextResponse.json(
        { success: false, error: 'numberOfPacks must be between 1 and 50' },
        { status: 400 }
      );
    }

    if (initializeRarity) {
      console.log('🎨 Initializing rarity system...');
      await updateTradersWithRarity(prisma);
      console.log('✅ Rarity system initialized');
    }

    console.log(`🎁 Revealing ${numberOfPacks} packs with RARITY-based selection`);

    console.log('📊 Fetching top traders with tokens and rarity data…');
    const allKolsData = await fetchTopTradersWithTokensAndRarity(prisma);
    console.log(`📊 Retrieved ${allKolsData.length} KOLs with rarity from DB`);
    
    if (!allKolsData || allKolsData.length < 4) {
      console.error('❌ Not enough KOLs with tokens. Found:', allKolsData.length);
      return NextResponse.json(
        { success: false, error: 'Need at least 4 KOLs with tokens created.' },
        { status: 500 }
      );
    }

    const rarityDistribution = allKolsData.reduce((dist, kol) => {
      const rarity = kol.rarity || determineRarity(kol.rank);
      dist[rarity] = (dist[rarity] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);
    
    console.log('🎨 Available KOL rarity distribution:', rarityDistribution);

    console.log('🎲 Generating multiple packs with RARITY-based KOL selection...');
    const packsData = generateMultiplePacksWithRarity(allKolsData, numberOfPacks);
    console.log(`🎲 Generated ${packsData.length} packs with rarity consideration`);

    console.log('🔄 Consolidating duplicate KOLs across packs...');
    const consolidatedKols = consolidateKolsAcrossPacks(packsData);
    console.log(`🔄 Consolidated to ${consolidatedKols.length} unique KOLs`);

    const packRarityStats = packsData.map(pack => {
      const packRarities = pack.kols.map(kol => kol.rarity || determineRarity(kol.rank));
      const rarityCount = packRarities.reduce((count, rarity) => {
        count[rarity] = (count[rarity] || 0) + 1;
        return count;
      }, {} as Record<string, number>);
      
      return {
        packId: pack.packId,
        rarities: rarityCount,
        hasLegendary: packRarities.includes('LEGENDARY'),
        hasEpic: packRarities.includes('EPIC')
      };
    });

    const specialPacks = packRarityStats.filter(p => p.hasLegendary || p.hasEpic);
    console.log(`🌟 ${specialPacks.length}/${numberOfPacks} packs contain LEGENDARY or EPIC KOLs`);

    console.log('🧮 Preparing consolidated token data with rarity...');
    const konsolidatedKolsWithTokenData = await prepareConsolidatedKolTokenDataWithRarity(consolidatedKols);

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

    console.log('📝 Creating enhanced pack metadata with rarity information…');
    const packMetadata = createEnhancedPackMetadata(
      packsData, 
      konsolidatedKolsWithTokenData, 
      txResult
    );
    console.log('✅ Enhanced pack metadata with rarity prepared');

    console.log('🎨 Final pack opening rarity statistics:');
    packMetadata.rarityStats.distribution.forEach(rarity => {
      console.log(`  ${rarity.label}: ${rarity.actualCount} (${rarity.actualPercentage.toFixed(1)}%) - Expected: ${rarity.expectedPercentage}%`);
    });

    console.log(`🎉 ${numberOfPacks} packs revealed successfully with RARITY system!`);
    return NextResponse.json(
      { 
        success: true, 
        message: `${numberOfPacks} packs revealed with rarity-based selection! Token claiming available through direct vault transfers.`, 
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

// Enhanced token data preparation with rarity-based pricing
async function prepareConsolidatedKolTokenDataWithRarity(kols: ConsolidatedKolData[]): Promise<ConsolidatedKolData[]> {
  return Promise.all(kols.map(async (kol) => {
    if (!kol.tokenMintAddress) {
      throw new Error(`Token mint address missing for KOL: ${kol.name}`);
    }

    if (!kol.ticker) {
      throw new Error(`Ticker missing for KOL: ${kol.name}. Please ensure createTokensAndPool was run successfully.`);
    }

    const rarity = kol.rarity || determineRarity(kol.rank);
    
    const rankFactor = Math.max(0.1, (51 - kol.rank) / 40);
    const pnlValue = parseFloat(kol.pnl.replace(/[^\d.-]/g, '')) || 0;
    const pnlFactor = Math.max(0.1, Math.min(3, 1 + (pnlValue / 100000)));
    const winRateFactor = Math.max(0.5, Math.min(2, (kol.winRate || 0) / 40));
    
    const rarityMultiplier = {
      'LEGENDARY': 5.0,
      'EPIC': 3.0,
      'RARE': 2.0,
      'COMMON': 1.0
    }[rarity];
    
    const basePrice = 0.001;
    const tokenPrice = basePrice * rankFactor * pnlFactor * winRateFactor * rarityMultiplier;

    return {
      ...kol,
      tokenPrice: Math.round(tokenPrice * 1000000) / 1000000,
      rarity,
      rarityWeight: getRarityWeight(rarity)
    };
  }));
}

function consolidateKolsAcrossPacks(packs: PackData[]): ConsolidatedKolData[] {
  console.log('🔄 [consolidateKolsAcrossPacks] Starting consolidation with rarity preservation...');
  
  const kolMap = new Map<string, ConsolidatedKolData>();
  
  packs.forEach((pack, packIndex) => {
    console.log(`🔄 Processing pack ${packIndex + 1}: ${pack.packId}`);
    
    pack.kols.forEach(kol => {
      const kolKey = kol.id;
      const rarity = kol.rarity || determineRarity(kol.rank);
      
      if (kolMap.has(kolKey)) {
        const existingKol = kolMap.get(kolKey)!;
        existingKol.packOccurrences += 1;
        existingKol.totalTokens = existingKol.totalTokens.add(TOKENS_PER_KOL);
        existingKol.packIds.push(pack.packId);
        
        console.log(`🔄 Updated ${kol.name} (${RARITY_CONFIG[rarity].label}): now appears in ${existingKol.packOccurrences} packs`);
      } else {
        const consolidatedKol: ConsolidatedKolData = {
          ...kol,
          packOccurrences: 1,
          totalTokens: new BN(TOKENS_PER_KOL),
          packIds: [pack.packId],
          rarity,
          rarityWeight: getRarityWeight(rarity)
        };
        
        kolMap.set(kolKey, consolidatedKol);
        console.log(`🔄 Added new ${kol.name} (${RARITY_CONFIG[rarity].label}): appears in 1 pack`);
      }
    });
  });
  
  const consolidatedArray = Array.from(kolMap.values());
  
  console.log('🔄 Consolidation complete with rarity:');
  consolidatedArray.forEach(kol => {
    const rarity = kol.rarity || determineRarity(kol.rank);
    console.log(`  - ${kol.name} (${RARITY_CONFIG[rarity].label}): ${kol.packOccurrences} occurrences, ${kol.totalTokens.toString()} total tokens`);
  });
  
  return consolidatedArray;
}