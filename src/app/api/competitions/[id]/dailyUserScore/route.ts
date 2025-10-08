/**
 * Daily Score Calculation Endpoint
 * 
 * This endpoint calculates daily scores for all users participating in a competition
 * based on their ACTUAL on-chain KOL token holdings (not just tokens purchased during the competition).
 * 
 * KEY FEATURES:
 * 1. Fetches real-time on-chain balances for ALL users (not just current participants)
 * 2. Auto-enrolls users who hold KOL tokens but haven't joined the competition yet
 * 3. Calculates scores based on current holdings, regardless of when tokens were acquired
 * 4. Updates or creates KolHolding records with current balances and scores
 * 
 * SCORE CALCULATION:
 * - Daily Score = PnL × (userTokenAmount / totalSupplyHeldByParticipants)
 * - This gives users a proportional score based on their share of tokens held by all participants
 * 
 * USAGE:
 * - Production: Scheduled via cron at 14:00 UTC daily
 * - Testing: Called every 2-15 minutes during test competitions
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { Connection, PublicKey, GetMultipleAccountsConfig } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const prisma = new PrismaClient();
const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");

// Batch size for RPC requests to avoid rate limits
const BATCH_SIZE = 100;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const competitionId = (await params).id;
    const now = new Date();

    console.log(`[SNAPSHOT] Starting daily snapshot for competition ${competitionId} at ${now.toISOString()}`);

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true
      }
    });

    if (!competition) {
      console.warn(`[SNAPSHOT] Competition not found: ${competitionId}`);
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    if (competition.status !== 'ACTIVE') {
      console.warn(`[SNAPSHOT] Competition is not active: ${competitionId}, status=${competition.status}`);
      return NextResponse.json(
        { error: 'Competition is not active' },
        { status: 400 }
      );
    }

    console.log(`[SNAPSHOT] Fetching all competition participants...`);

    // Get all participants in this competition
    let participants = await prisma.competitionEntry.findMany({
      where: {
        competitionId
      },
      include: {
        user: {
          select: {
            id: true,
            userPrivyWalletAddress: true
          }
        }
      }
    });

    console.log(`[SNAPSHOT] Found ${participants.length} initial participants in competition`);

    // Get all users in the system to check for potential token holders
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        userPrivyWalletAddress: true
      }
    });

    console.log(`[SNAPSHOT] Checking ${allUsers.length} total users for KOL token holdings...`);

    // Get all KOLs with token mint addresses
    const allKols = await prisma.trader.findMany({
      where: {
        tokenMintAddress: { not: null },
        period: 'DAILY'
      },
      select: {
        id: true,
        name: true,
        ticker: true,
        pnl: true,
        tokenMintAddress: true,
        rarity: true,
        rarityWeight: true
      }
    });

    console.log(`[SNAPSHOT] Found ${allKols.length} KOLs with tokens`);

    if (allKols.length === 0) {
      console.warn(`[SNAPSHOT] No KOLs with token addresses found`);
      return NextResponse.json({
        success: true,
        message: 'No KOLs with token addresses found',
        snapshotTime: now.toISOString(),
        updatedHoldings: 0
      });
    }

    // Fetch actual on-chain balances for all users (to auto-enroll token holders)
    const allUserHoldings: Array<{
      userId: number;
      userWallet: string;
      traderId: string;
      traderName: string;
      traderPnl: string;
      tokenAmount: number;
      rarity: string;
      rarityWeight: number;
    }> = [];

    const participantIds = new Set(participants.map(p => p.user.id));
    const newlyEnrolledUsers: number[] = [];

    for (const user of allUsers) {
      const userWallet = user.userPrivyWalletAddress;
      const userId = user.id;
      let userHasTokens = false;

      try {
        const userPublicKey = new PublicKey(userWallet);
        
        // Pre-compute all ATAs for this user
        const ataPromises = allKols.map(async (kol) => {
          try {
            const mintAddress = new PublicKey(kol.tokenMintAddress!);
            const ataAddress = await getAssociatedTokenAddress(mintAddress, userPublicKey);
            return { kol, ataAddress };
          } catch (error) {
            console.warn(`Invalid mint address for ${kol.ticker}: ${kol.tokenMintAddress}`);
            return null;
          }
        });

        const ataResults = (await Promise.all(ataPromises)).filter(Boolean) as Array<{
          kol: typeof allKols[0];
          ataAddress: PublicKey;
        }>;

        // Batch fetch token balances for this user
        for (let i = 0; i < ataResults.length; i += BATCH_SIZE) {
          const batch = ataResults.slice(i, i + BATCH_SIZE);
          const ataAddresses = batch.map(item => item.ataAddress);
          
          try {
            const accounts = await connection.getMultipleAccountsInfo(
              ataAddresses,
              { commitment: "confirmed" } as GetMultipleAccountsConfig
            );

            for (let j = 0; j < accounts.length; j++) {
              const account = accounts[j];
              const { kol } = batch[j];

              if (account && account.data.length > 0) {
                try {
                  // Parse SPL token account data (balance is at bytes 64-72)
                  const balanceBuffer = account.data.slice(64, 72);
                  const balance = Buffer.from(balanceBuffer).readBigUInt64LE().toString();
                  
                  if (balance !== '0') {
                    const decimals = 6;
                    const balanceNum = BigInt(balance);
                    const divisor = BigInt(Math.pow(10, decimals));
                    const displayBalance = Number(balanceNum) / Number(divisor);

                    userHasTokens = true;

                    allUserHoldings.push({
                      userId,
                      userWallet,
                      traderId: kol.id,
                      traderName: kol.name,
                      traderPnl: kol.pnl,
                      tokenAmount: displayBalance,
                      rarity: kol.rarity || 'COMMON',
                      rarityWeight: kol.rarityWeight || 1.0
                    });

                    console.debug(`[SNAPSHOT] User ${userWallet.slice(0, 6)}... holds ${displayBalance} of ${kol.name}`);
                  }
                } catch (parseError) {
                  console.warn(`Error parsing account data for ${kol.ticker}:`, parseError);
                }
              }
            }
          } catch (batchError) {
            console.error(`Error in batch ${i}-${i + BATCH_SIZE}:`, batchError);
          }
        }

        // Auto-enroll user if they hold tokens but aren't in the competition yet
        if (userHasTokens && !participantIds.has(userId)) {
          try {
            await prisma.competitionEntry.create({
              data: {
                competitionId,
                userId,
                joinedAt: now
              }
            });
            participantIds.add(userId);
            newlyEnrolledUsers.push(userId);
            console.log(`[SNAPSHOT] Auto-enrolled user ${userWallet.slice(0, 6)}... who holds KOL tokens`);
          } catch (enrollError) {
            // Ignore if already exists (race condition)
            console.warn(`[SNAPSHOT] Could not auto-enroll user ${userWallet}:`, enrollError);
          }
        }
      } catch (error) {
        console.error(`[SNAPSHOT] Error fetching balances for user ${userWallet}:`, error);
      }
    }

    console.log(`[SNAPSHOT] Auto-enrolled ${newlyEnrolledUsers.length} new users who hold KOL tokens`);

    console.log(`[SNAPSHOT] Found ${allUserHoldings.length} total token holdings across all participants`);

    if (allUserHoldings.length === 0) {
      console.info(`[SNAPSHOT] No token holdings found for any participant`);
      return NextResponse.json({
        success: true,
        message: 'No token holdings found for participants',
        snapshotTime: now.toISOString(),
        updatedHoldings: 0
      });
    }

    // Group holdings by trader to calculate total supply per trader
    const traderHoldingsMap = new Map<string, {
      holdings: typeof allUserHoldings,
      totalSupply: number,
      pnl: string
    }>();

    for (const holding of allUserHoldings) {
      const traderId = holding.traderId;

      if (!traderHoldingsMap.has(traderId)) {
        traderHoldingsMap.set(traderId, {
          holdings: [],
          totalSupply: 0,
          pnl: holding.traderPnl
        });
      }

      const traderData = traderHoldingsMap.get(traderId)!;
      traderData.holdings.push(holding);
      traderData.totalSupply += holding.tokenAmount;
    }

    for (const [traderId, traderData] of traderHoldingsMap) {
      console.debug(`[SNAPSHOT] Trader ${traderId} (${traderData.holdings[0]?.traderName || "?"}) - Total supply held by participants: ${traderData.totalSupply}, PnL: ${traderData.pnl}`);
    }

    const scoreUpdates: Array<{
      userId: number;
      userWallet: string;
      traderId: string;
      traderName: string;
      tokenAmount: number;
      newDailyScore: number;
    }> = [];

    for (const [traderId, traderData] of traderHoldingsMap) {
      const traderPnl = parseFloat(traderData.pnl) || 0;

      for (const holding of traderData.holdings) {
        const userTokenAmount = holding.tokenAmount;
        const userShareRatio = traderData.totalSupply > 0
          ? userTokenAmount / traderData.totalSupply
          : 0;

        const dailyScore = traderPnl * userShareRatio;

        console.debug(
          `[SCORE_CALC] UserID=${holding.userId} | TraderID=${traderId} (${holding.traderName})\n` +
          `  Formula: dailyScore = traderPnl * (userTokenAmount / totalSupply)\n` +
          `  Inputs: traderPnl=${traderPnl}, userTokenAmount=${userTokenAmount}, totalSupply=${traderData.totalSupply}\n` +
          `  Calculation: dailyScore = ${traderPnl} * (${userTokenAmount} / ${traderData.totalSupply}) = ${dailyScore}\n`
        );

        scoreUpdates.push({
          userId: holding.userId,
          userWallet: holding.userWallet,
          traderId: holding.traderId,
          traderName: holding.traderName,
          tokenAmount: userTokenAmount,
          newDailyScore: dailyScore
        });
      }
    }

    console.debug(`[SCORE_UPDATES] Prepared score updates for ${scoreUpdates.length} holdings:`);
    for (const update of scoreUpdates) {
      console.debug(
        `[SCORE_UPDATE] UserID=${update.userId} | TraderID=${update.traderId} (${update.traderName}) | ` +
        `TokenAmount=${update.tokenAmount} | NewDailyScore=${update.newDailyScore} | UserWallet=${update.userWallet}`
      );
    }

    // Update or create KolHolding records with the current on-chain balances
    const upsertPromises = scoreUpdates.map(async (update) => {
      // Check if a holding record exists for this user/trader/competition combination
      const existingHolding = await prisma.kolHolding.findFirst({
        where: {
          userId: update.userId,
          traderId: update.traderId,
          competitionId
        }
      });

      if (existingHolding) {
        // Update existing holding
        return prisma.kolHolding.update({
          where: { id: existingHolding.id },
          data: {
            tokenAmount: update.tokenAmount,
            dailyScore: update.newDailyScore,
            lastScoreUpdate: now,
            purchasedAt: now // Update timestamp to reflect latest snapshot
          }
        });
      } else {
        // Create new holding record
        return prisma.kolHolding.create({
          data: {
            userId: update.userId,
            traderId: update.traderId,
            competitionId,
            tokenAmount: update.tokenAmount,
            dailyScore: update.newDailyScore,
            lastScoreUpdate: now,
            purchasedAt: now,
            purchasePrice: null,
            transactionHash: null
          }
        });
      }
    });

    await Promise.all(upsertPromises);

    const userSummaries = new Map<number, {
      userId: number;
      userWallet: string;
      totalDailyScore: number;
      holdingsCount: number;
    }>();

    for (const update of scoreUpdates) {
      if (!userSummaries.has(update.userId)) {
        userSummaries.set(update.userId, {
          userId: update.userId,
          userWallet: update.userWallet,
          totalDailyScore: 0,
          holdingsCount: 0
        });
      }

      const summary = userSummaries.get(update.userId)!;
      summary.totalDailyScore += update.newDailyScore;
      summary.holdingsCount += 1;
    }

    console.debug(`[USER_SUMMARIES] User daily score summaries:`);
    for (const summary of userSummaries.values()) {
      console.debug(
        `[USER_SUMMARY] UserID=${summary.userId} | Wallet=${summary.userWallet} | TotalDailyScore=${summary.totalDailyScore} | HoldingsCount=${summary.holdingsCount}`
      );
    }

    console.log(`[SNAPSHOT] Daily snapshot completed for competition ${competitionId}:`, {
      snapshotTime: now.toISOString(),
      processedUsers: userSummaries.size,
      updatedHoldings: scoreUpdates.length,
      uniqueTraders: traderHoldingsMap.size
    });

    return NextResponse.json({
      success: true,
      message: 'Daily snapshot completed successfully',
      snapshot: {
        competitionId,
        snapshotTime: now.toISOString(),
        processedUsers: userSummaries.size,
        updatedHoldings: scoreUpdates.length,
        uniqueTraders: traderHoldingsMap.size
      },
      userSummaries: Array.from(userSummaries.values()).map(summary => ({
        userId: summary.userId,
        userWallet: summary.userWallet,
        totalDailyScore: summary.totalDailyScore,
        holdingsCount: summary.holdingsCount
      }))
    }, { status: 200 });

  } catch (error) {
    console.error('[SNAPSHOT][ERROR] Error calculating daily snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to calculate daily snapshot' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const competitionId = (await params).id;
    const { searchParams } = new URL(request.url);
    const userWallet = searchParams.get('userWallet');

    const whereClause: any = { competitionId };
    if (userWallet) {
      const user = await prisma.user.findUnique({
        where: { userPrivyWalletAddress: userWallet },
        select: { id: true }
      });

      if (!user) {
        console.warn(`[GET_SCORES] User not found for wallet: ${userWallet}`);
        return NextResponse.json({
          success: true,
          scores: [],
          message: 'User not found'
        });
      }

      whereClause.userId = user.id;
    }

    const holdings = await prisma.kolHolding.findMany({
      where: whereClause,
      include: {
        trader: {
          select: {
            name: true,
            ticker: true,
            pnl: true,
            avatarUrl: true
          }
        },
        user: {
          select: {
            userPrivyWalletAddress: true
          }
        }
      },
      orderBy: [
        { userId: 'asc' },
        { dailyScore: 'desc' }
      ]
    });

    console.debug(`[GET_SCORES] Fetched ${holdings.length} holdings for competitionId=${competitionId}${userWallet ? `, userWallet=${userWallet}` : ''}`);

    const userScores = new Map<number, {
      userId: number;
      userWallet: string;
      totalDailyScore: number;
      holdings: any[];
      lastUpdated: Date | null;
    }>();

    for (const holding of holdings) {
      if (!userScores.has(holding.userId)) {
        userScores.set(holding.userId, {
          userId: holding.userId,
          userWallet: holding.user.userPrivyWalletAddress,
          totalDailyScore: 0,
          holdings: [],
          lastUpdated: holding.lastScoreUpdate
        });
      }

      const userScore = userScores.get(holding.userId)!;
      userScore.totalDailyScore += parseFloat(holding.dailyScore.toString());
      userScore.holdings.push({
        holdingId: holding.id,
        traderId: holding.traderId,
        traderName: holding.trader.name,
        traderTicker: holding.trader.ticker,
        traderPnl: holding.trader.pnl,
        tokenAmount: holding.tokenAmount.toString(),
        dailyScore: holding.dailyScore.toString(),
        lastScoreUpdate: holding.lastScoreUpdate?.toISOString()
      });

      if (holding.lastScoreUpdate && (!userScore.lastUpdated || holding.lastScoreUpdate > userScore.lastUpdated)) {
        userScore.lastUpdated = holding.lastScoreUpdate;
      }
    }

    console.debug(`[GET_SCORES] User scores summary:`);
    for (const score of userScores.values()) {
      console.debug(
        `[GET_USER_SCORE] UserID=${score.userId} | Wallet=${score.userWallet} | TotalDailyScore=${score.totalDailyScore} | HoldingsCount=${score.holdings.length} | LastUpdated=${score.lastUpdated?.toISOString()}`
      );
    }

    return NextResponse.json({
      success: true,
      competitionId,
      userScores: Array.from(userScores.values()).map(score => ({
        userId: score.userId,
        userWallet: score.userWallet,
        totalDailyScore: score.totalDailyScore,
        holdingsCount: score.holdings.length,
        lastUpdated: score.lastUpdated?.toISOString(),
        holdings: score.holdings
      }))
    });

  } catch (error) {
    console.error('[GET_SCORES][ERROR] Error fetching daily scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily scores' },
      { status: 500 }
    );
  }
}

function getPreviousSnapshot(currentTime: Date): Date {
  const snapshot = new Date(currentTime);
  snapshot.setUTCHours(14, 0, 0, 0);

  if (currentTime < snapshot) {
    snapshot.setUTCDate(snapshot.getUTCDate() - 1);
  }

  return snapshot;
}