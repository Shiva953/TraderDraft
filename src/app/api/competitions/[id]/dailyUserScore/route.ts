import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const competitionId = params.id;
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

    const snapshotTime = getPreviousSnapshot(now);
    console.log(`[SNAPSHOT] Calculated snapshot time (previous 14:00 UTC): ${snapshotTime.toISOString()}`);

    const eligibleHoldings = await prisma.kolHolding.findMany({
      where: {
        competitionId,
        purchasedAt: {
          lt: now
        }
      },
      include: {
        trader: {
          select: { id: true, name: true, ticker: true, pnl: true }
        },
        user: {
          select: { id: true, userPrivyWalletAddress: true }
        }
      }
    });

    console.debug(`[SNAPSHOT] Eligible holdings count: ${eligibleHoldings.length}`);
    if (eligibleHoldings.length === 0) {
      console.info(`[SNAPSHOT] No eligible holdings found for this snapshot at ${now.toISOString()}`);
      return NextResponse.json({
        success: true,
        message: 'No eligible holdings found for this snapshot',
        snapshotTime: now.toISOString(),
        updatedHoldings: 0
      });
    }

    const traderHoldingsMap = new Map<string, {
      holdings: typeof eligibleHoldings,
      totalSupply: number,
      pnl: string
    }>();

    for (const holding of eligibleHoldings) {
      const traderId = holding.traderId;

      if (!traderHoldingsMap.has(traderId)) {
        traderHoldingsMap.set(traderId, {
          holdings: [],
          totalSupply: 0,
          pnl: holding.trader.pnl
        });
      }

      const traderData = traderHoldingsMap.get(traderId)!;
      traderData.holdings.push(holding);
      traderData.totalSupply += parseFloat(holding.tokenAmount.toString());
    }

    for (const [traderId, traderData] of traderHoldingsMap) {
      console.debug(`[SNAPSHOT] Trader ${traderId} (${traderData.holdings[0]?.trader?.name || "?"}) - Total eligible supply: ${traderData.totalSupply}, PnL: ${traderData.pnl}`);
    }

    const scoreUpdates: Array<{
      holdingId: string;
      userId: number;
      userWallet: string;
      newDailyScore: number;
      traderId: string;
      traderName: string;
    }> = [];

    for (const [traderId, traderData] of traderHoldingsMap) {
      const traderPnl = parseFloat(traderData.pnl) || 0;

      for (const holding of traderData.holdings) {
        const userTokenAmount = parseFloat(holding.tokenAmount.toString());
        const userShareRatio = traderData.totalSupply > 0
          ? userTokenAmount / traderData.totalSupply
          : 0;

        const dailyScore = traderPnl * userShareRatio;

        console.debug(
          `[SCORE_CALC] HoldingID=${holding.id} | UserID=${holding.userId} | TraderID=${traderId} (${holding.trader.name})\n` +
          `  Formula: dailyScore = traderPnl * (userTokenAmount / totalSupply)\n` +
          `  Inputs: traderPnl=${traderPnl}, userTokenAmount=${userTokenAmount}, totalSupply=${traderData.totalSupply}\n` +
          `  Calculation: dailyScore = ${traderPnl} * (${userTokenAmount} / ${traderData.totalSupply}) = ${dailyScore}\n`
        );

        scoreUpdates.push({
          holdingId: holding.id,
          userId: holding.userId,
          userWallet: holding.user.userPrivyWalletAddress,
          newDailyScore: dailyScore,
          traderId: holding.traderId,
          traderName: holding.trader.name
        });
      }
    }

    console.debug(`[SCORE_UPDATES] Prepared score updates for ${scoreUpdates.length} holdings:`);
    for (const update of scoreUpdates) {
      console.debug(
        `[SCORE_UPDATE] HoldingID=${update.holdingId} | UserID=${update.userId} | TraderID=${update.traderId} (${update.traderName}) | ` +
        `NewDailyScore=${update.newDailyScore} | UserWallet=${update.userWallet}`
      );
    }

    const updatePromises = scoreUpdates.map(update =>
      prisma.kolHolding.update({
        where: { id: update.holdingId },
        data: {
          dailyScore: update.newDailyScore,
          lastScoreUpdate: now
        }
      })
    );

    await Promise.all(updatePromises);

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
    const competitionId = params.id;
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