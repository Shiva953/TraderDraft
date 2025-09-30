import { PrismaClient } from '@prisma/client';
import { createConsolidatedPackMetadata } from '@/app/api/pack/revealAllPacks/route';
import { generatePackId } from '@/app/api/pack/revealAllPacks/route';
import type { Rarity } from '@/types';
import type { KolDataWithRarity, PackData, RevealAllPacksRequest, ConsolidatedKolData } from '@/types';

// Rarity config for leaderboard distribution and pack odds
const RARITY_CONFIG = {
  LEGENDARY: {
    minRank: 1,
    maxRank: 3,
    weight: 0.05,     // 5% chance (very rare)
    percentage: 6,
    color: '#FFD700',  // Gold
    label: 'Legendary'
  },
  EPIC: {
    minRank: 4,
    maxRank: 10,
    weight: 0.15,     // 15% chance (rare)
    percentage: 14,
    color: '#9D4EDD',  // Purple
    label: 'Epic'
  },
  RARE: {
    minRank: 11,
    maxRank: 25,
    weight: 0.30,     // 30% chance (uncommon)
    percentage: 30,
    color: '#0077BE',  // Blue
    label: 'Rare'
  },
  COMMON: {
    minRank: 26,
    maxRank: 50,
    weight: 0.50,     // 50% chance (common)
    percentage: 50,
    color: '#6B7280',  // Gray
    label: 'Common'
  }
};

export function determineRarity(rank: number): Rarity {
  if (rank >= 1 && rank <= 3) return 'LEGENDARY';
  if (rank >= 4 && rank <= 10) return 'EPIC';
  if (rank >= 11 && rank <= 25) return 'RARE';
  return 'COMMON';
}

export function getRarityWeight(rarity: Rarity): number {
  return RARITY_CONFIG[rarity].weight;
}

export function selectRandomKolsWithRarity(kols: KolData[], count: number): KolData[] {
  if (kols.length < count) {
    throw new Error(`Need ${count} KOLs, got ${kols.length}`);
  }

  const selected: KolData[] = [];
  const availableKols = [...kols];

  for (let i = 0; i < count; i++) {
    if (availableKols.length === 0) break;

    const selectedIndex = weightedRandomSelection(availableKols);
    const selectedKol = availableKols[selectedIndex];
    
    selected.push(selectedKol);
    availableKols.splice(selectedIndex, 1);
  }

  return selected;
}

function weightedRandomSelection(kols: KolData[]): number {
  const totalWeight = kols.reduce((sum, kol) => {
    const rarity = kol.rarity || determineRarity(kol.rank);
    return sum + getRarityWeight(rarity);
  }, 0);

  const randomValue = Math.random() * totalWeight;

  let currentWeight = 0;
  for (let i = 0; i < kols.length; i++) {
    const rarity = kols[i].rarity || determineRarity(kols[i].rank);
    currentWeight += getRarityWeight(rarity);
    if (randomValue <= currentWeight) {
      return i;
    }
  }

  return kols.length - 1;
}

// Updates all traders in DB with rarity and rarityWeight fields
export async function updateTradersWithRarity(prisma: PrismaClient) {
  console.log('🎨 Updating traders with rarity classifications...');
  
  try {
    const traders = await prisma.trader.findMany({
      where: { period: 'DAILY' },
      orderBy: { rank: 'asc' }
    });

    const updatePromises = traders.map(trader => {
      const rarity = determineRarity(trader.rank);
      const rarityWeight = getRarityWeight(rarity);
      return prisma.trader.update({
        where: { id: trader.id },
        data: {
          rarity,
          rarityWeight
        }
      });
    });

    await Promise.all(updatePromises);
    console.log(`✅ Updated ${traders.length} traders with rarity data`);
    
    const distribution = await prisma.trader.groupBy({
      by: ['rarity'],
      where: { period: 'DAILY' },
      _count: { rarity: true }
    });
    
    console.log('🎨 Rarity distribution:');
    distribution.forEach(group => {
      const config = RARITY_CONFIG[group.rarity as Rarity];
      console.log(`  ${config.label}: ${group._count.rarity} traders (${config.percentage}%)`);
    });
    
  } catch (error) {
    console.error('❌ Error updating traders with rarity:', error);
    throw error;
  }
}

export async function fetchTopTradersWithTokensAndRarity(prisma: PrismaClient): Promise<KolData[]> {
  try {
    console.log('📈 Fetching KOLs with token mint addresses and rarity from database...');
    
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
        tokenMintAddress: true,
        rarity: true,
        rarityWeight: true
      }
    });
    
    if (traders.length === 0) {
      throw new Error('No traders with created tokens found in database');
    }

    console.log(`📈 Retrieved ${traders.length} traders with tokens and rarity from database`);

    const rarityCount = traders.reduce((acc, trader) => {
      const rarity = trader.rarity || 'COMMON';
      acc[rarity] = (acc[rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('🎨 Available KOLs by rarity:', rarityCount);

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
      tokenMintAddress: trader.tokenMintAddress ? new PublicKey(trader.tokenMintAddress) : undefined,
      rarity: trader.rarity as Rarity || determineRarity(trader.rank),
      rarityWeight: trader.rarityWeight || getRarityWeight(trader.rarity as Rarity || determineRarity(trader.rank))
    })).filter(kol => kol.tokenMintAddress !== undefined) as KolDataWithRarity[];

  } catch (error) {
    console.error('❌ Error fetching traders with tokens and rarity:', error);
    throw new Error(`Failed to fetch trader data with rarity: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Adds rarity stats and color/label info to pack metadata
export function createEnhancedPackMetadata(
  packs: PackData[], 
  consolidatedKols: ConsolidatedKolData[], 
  txResult: any
) {
  const rarityStats = consolidatedKols.reduce((stats, kol) => {
    const rarity = kol.rarity || determineRarity(kol.rank);
    stats[rarity] = (stats[rarity] || 0) + kol.packOccurrences;
    return stats;
  }, {} as Record<Rarity, number>);

  const totalOccurrences = Object.values(rarityStats).reduce((sum, count) => sum + count, 0);
  const rarityPercentages = Object.entries(rarityStats).reduce((percentages, [rarity, count]) => {
    percentages[rarity as Rarity] = (count / totalOccurrences) * 100;
    return percentages;
  }, {} as Record<Rarity, number>);

  const originalMetadata = createConsolidatedPackMetadata(packs, consolidatedKols, txResult);

  return {
    ...originalMetadata,
    rarityStats: {
      distribution: Object.entries(RARITY_CONFIG).map(([rarity, config]) => ({
        rarity: rarity as Rarity,
        label: config.label,
        color: config.color,
        expectedPercentage: config.percentage,
        actualCount: rarityStats[rarity as Rarity] || 0,
        actualPercentage: rarityPercentages[rarity as Rarity] || 0
      })),
      totalRarityScore: consolidatedKols.reduce((score, kol) => {
        const rarity = kol.rarity || determineRarity(kol.rank);
        const rarityMultiplier = {
          'LEGENDARY': 10,
          'EPIC': 5,
          'RARE': 3,
          'COMMON': 1
        }[rarity];
        return score + (rarityMultiplier * kol.packOccurrences);
      }, 0)
    },
    consolidatedKols: consolidatedKols.map((kol) => ({
      ...originalMetadata.consolidatedKols.find(k => k.name === kol.name),
      rarity: kol.rarity || determineRarity(kol.rank),
      rarityLabel: RARITY_CONFIG[kol.rarity || determineRarity(kol.rank)].label,
      rarityColor: RARITY_CONFIG[kol.rarity || determineRarity(kol.rank)].color
    }))
  };
}

interface KolDataWithRarity extends KolData {
  rarity: Rarity;
  rarityWeight: number;
}

export function generateMultiplePacksWithRarity(allKols: KolDataWithRarity[], numberOfPacks: number): PackData[] {
  console.log(`🎲 [generateMultiplePacksWithRarity] Creating ${numberOfPacks} packs with rarity-based selection from ${allKols.length} available KOLs`);
  
  const packs: PackData[] = [];
  
  for (let i = 0; i < numberOfPacks; i++) {
    const packId = generatePackId();
    const selectedKols = selectRandomKolsWithRarity(allKols, 4);
    
    packs.push({
      packId,
      kols: selectedKols
    });
    
    const rarityInfo = selectedKols.map(k => {
      const rarity = k.rarity || determineRarity(k.rank);
      return `${k.name}(${RARITY_CONFIG[rarity].label})`;
    }).join(', ');
    
    console.log(`🎲 Pack ${i + 1}/${numberOfPacks} (${packId}): ${rarityInfo}`);
  }
  
  console.log(`✅ Generated ${packs.length} packs with rarity-based selection`);
  return packs;
}



export { RARITY_CONFIG };