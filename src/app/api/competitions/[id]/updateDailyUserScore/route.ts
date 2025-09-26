// FOR GIVEN COMPETITION i(ONGOING), WE GET/UPDATE THE USER DAILY SCORE AT 2AM(SNAPSHOT)
// THIS WILL BE DISPLAYED IN THE FRONTEND FOR THE REST OF THE DAY
// User Daily Score Calculation (at 2AM snapshot for a given competition):
// Let:
//   - N = number of KOLs (traders) in the competition
//   - For each KOL i:
//       - PNL_i = daily PNL of trader i
//       - H_i = amount of KOL i's token held by the user
//       - T_i = total supply of KOL i's token among all users
// The user's daily score is calculated as:
//   User Daily Score = sum over i=1 to N of [ PNL_i * (H_i / T_i) ]
//   That is:
//     User Daily Score = SUM[ PNL_i × (H_i / T_i) ] for all KOLs i
// so get
// 0. GET ALL KOL TOKENS USER BOUGHT DURING COMPETITION PERIOD(IDENTIFIED BY ID)
// 1. PNL OF GIVEN KOL TOKEN HOLDINGS OF USER(BOUGHT DURING COMPETITION PERIOD, CHECK THAT FIRST)
// 2. AMOUNT OF KOL TOKENS OF GIVEN KOL HELD BY USER
// 3. TOTAL SUPPLY OF THAT KOL TOKENS AMONG USERS(SUM(for given kol search in all user addresses and their token amounts)
// 4. REPEAT FOR EACH KOL TOKEN USER BOUGHT DURING COMPETITION PERIOD
// 5. RETURN AND UPDATE EACH USER DAILY SCORE DURING THAT COMPETITION FOR THAT DAY:

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

    // Check if competition exists and is active
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
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    if (competition.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Competition is not active' },
        { status: 400 }
      );
    }

    console.log(`Starting daily PnL update for competition ${competitionId} at ${now.toISOString()}`);

    // Get all unique traders that have holdings in this competition
    const tradersInCompetition = await prisma.kolHolding.findMany({
      where: { competitionId },
      select: { traderId: true },
      distinct: ['traderId']
    });

    if (tradersInCompetition.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No traders found in this competition',
        updatedTraders: 0,
        totalHoldingsUpdated: 0
      });
    }

    let totalHoldingsUpdated = 0;
    const processedTraders: string[] = [];

    // For each trader, recalculate all user scores (since PnL may have changed)
    for (const { traderId } of tradersInCompetition) {
      await recalculateTraderScoresForPnLUpdate(competitionId, traderId, now);
      processedTraders.push(traderId);
    }

    // Count total holdings updated
    const holdingsCount = await prisma.kolHolding.count({
      where: { competitionId }
    });

    console.log(`Daily PnL update completed for competition ${competitionId}:`, {
      timestamp: now.toISOString(),
      updatedTraders: processedTraders.length,
      totalHoldingsUpdated: holdingsCount
    });

    return NextResponse.json({
      success: true,
      message: 'Daily PnL update completed - all scores recalculated',
      snapshot: {
        competitionId,
        timestamp: now.toISOString(),
        updatedTraders: processedTraders.length,
        totalHoldingsUpdated: holdingsCount
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating daily PnL:', error);
    return NextResponse.json(
      { error: 'Failed to update daily PnL' },
      { status: 500 }
    );
  }
}

/**
 * Recalculates daily scores for all users holding a specific trader's tokens
 * Used for daily PnL updates (when trader PnL changes)
 */
async function recalculateTraderScoresForPnLUpdate(
  competitionId: string, 
  traderId: string, 
  updateTime: Date
) {
  try {
    const traderHoldings = await prisma.kolHolding.findMany({
      where: {
        competitionId,
        traderId
      },
      include: {
        trader: {
          select: { pnl: true, name: true }
        }
      }
    });

    if (traderHoldings.length === 0) return;

    // Calculate total supply for this trader
    const totalSupply = traderHoldings.reduce((sum, holding) => 
      sum + parseFloat(holding.tokenAmount.toString()), 0
    );

    const traderPnl = parseFloat(traderHoldings[0].trader.pnl) || 0;

    // Update each user's daily score for this trader
    const updatePromises = traderHoldings.map(holding => {
      const userTokenAmount = parseFloat(holding.tokenAmount.toString());
      const userShareRatio = totalSupply > 0 ? userTokenAmount / totalSupply : 0;
      const dailyScore = traderPnl * userShareRatio;

      return prisma.kolHolding.update({
        where: { id: holding.id },
        data: {
          dailyScore,
          lastScoreUpdate: updateTime
        }
      });
    });

    await Promise.all(updatePromises);
    
    console.log(`Updated PnL scores for trader ${traderHoldings[0].trader.name} (${traderId}): PnL=${traderPnl}, Holdings=${traderHoldings.length}`);
  } catch (error) {
    console.error(`Error recalculating PnL scores for trader ${traderId}:`, error);
    throw error;
  }
}

// GET endpoint to fetch current daily scores for users
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

    // Group by user to show total scores
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

      // Keep the latest update time
      if (holding.lastScoreUpdate && (!userScore.lastUpdated || holding.lastScoreUpdate > userScore.lastUpdated)) {
        userScore.lastUpdated = holding.lastScoreUpdate;
      }
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
    console.error('Error fetching daily scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily scores' },
      { status: 500 }
    );
  }
}