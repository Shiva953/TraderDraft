// CALCULATED AFTER COMPETITION WINDOW ENDS
// 1. GET USER DAILY SCORES USING /api/getUserDailyScores
// 2. WindowTotalScore FOR GIVEN USER = SUM(USER SCORES DURING ALL DAYS IN WINDOW)
// 3. GET THIS FOR ALL USERS IN THE DB FOR THE GIVEN COMPETITION AND SUM IT
// 3. TP(TOURNAMENT POINTS) = ((TP_POOL * (WINDOW SCORE OF GIVEN USER)/(SUM OF WINDOW SCORES OF ALL USER)))
// 4. LP(LEADERBOARD POINTS, NORMALIZED TO %) = 100 * (WINDOW SCORE OF USER/(MAX(WINDOW SCORE)))
// RETURN TP + LP AND UPDATE THAT COMPETITION'S FINALIZED TP + LP IN THE DB FOR THE USER, UPDATE USER STATE WITH UPDATING TOTAL USER TP
// THIS ENDPOINT RETURNS THE FINAL TP OF ALL USERS, FOR INDIVIDUAL USER FILTER IN THE FRONTEND

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const competitionId = params.id;
    const now = new Date();

    console.log(`[FINALIZE] Starting finalization for competition ${competitionId} at ${now.toISOString()}`);

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        tpPool: true
      }
    });

    if (!competition) {
      console.error(`[FINALIZE] Competition not found: ${competitionId}`);
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    if (competition.status === 'FINALIZED') {
      console.warn(`[FINALIZE] Competition ${competitionId} is already finalized`);
      return NextResponse.json(
        { error: 'Competition is already finalized' },
        { status: 400 }
      );
    }

    if (now < competition.endDate && competition.status === 'ACTIVE') {
      console.warn(`[FINALIZE] Competition window has not ended yet for ${competitionId}. Now: ${now.toISOString()}, End: ${competition.endDate.toISOString()}`);
      return NextResponse.json(
        { error: 'Competition window has not ended yet' },
        { status: 400 }
      );
    }

    if (competition.status === 'ACTIVE') {
      console.log(`[FINALIZE] Marking competition ${competitionId} as ENDED`);
      await prisma.competition.update({
        where: { id: competitionId },
        data: { status: 'ENDED' }
      });
    }

    const competitionEntries = await prisma.competitionEntry.findMany({
      where: { competitionId },
      include: {
        user: {
          select: { 
            id: true, 
            userPrivyWalletAddress: true,
            totalTournamentPoints: true
          }
        }
      }
    });

    if (competitionEntries.length === 0) {
      console.warn(`[FINALIZE] No participants found in competition ${competitionId}`);
      return NextResponse.json({
        success: true,
        message: 'No participants found in this competition',
        competitionId,
        finalizedAt: now.toISOString()
      });
    }

    const userWindowScores = new Map<number, {
      userId: number;
      userWallet: string;
      windowScore: number;
      entryId: string;
      dailyScoresCount: number;
    }>();

    const allHoldings = await prisma.kolHolding.findMany({
      where: { competitionId },
      include: {
        user: {
          select: { id: true, userPrivyWalletAddress: true }
        }
      }
    });

    for (const holding of allHoldings) {
      const userId = holding.userId;
      const dailyScore = parseFloat(holding.dailyScore.toString());

      if (!userWindowScores.has(userId)) {
        const entry = competitionEntries.find(e => e.userId === userId);
        if (!entry) {
          console.warn(`[FINALIZE] No competition entry found for userId=${userId} in competition ${competitionId}`);
          continue;
        }

        userWindowScores.set(userId, {
          userId,
          userWallet: holding.user.userPrivyWalletAddress,
          windowScore: 0,
          entryId: entry.id,
          dailyScoresCount: 0
        });
      }

      const userScore = userWindowScores.get(userId)!;
      userScore.windowScore += dailyScore;
      userScore.dailyScoresCount += 1;
    }

    console.debug(`[FINALIZE] User window scores before sorting:`);
    for (const [userId, scoreObj] of userWindowScores.entries()) {
      console.debug(`[FINALIZE] userId=${userId}, wallet=${scoreObj.userWallet}, windowScore=${scoreObj.windowScore}, dailyScoresCount=${scoreObj.dailyScoresCount}`);
    }

    const sortedUsers = Array.from(userWindowScores.values())
      .sort((a, b) => b.windowScore - a.windowScore);

    if (sortedUsers.length === 0) {
      console.warn(`[FINALIZE] No valid scores found for finalization in competition ${competitionId}`);
      await prisma.competition.update({
        where: { id: competitionId },
        data: { status: 'FINALIZED' }
      });

      return NextResponse.json({
        success: true,
        message: 'No valid scores found for finalization',
        competitionId,
        finalizedAt: now.toISOString()
      });
    }

    const totalWindowScore = sortedUsers.reduce((sum, user) => sum + user.windowScore, 0);
    const maxWindowScore = Math.max(...sortedUsers.map(user => user.windowScore));
    const tpPool = parseFloat(competition.tpPool.toString());

    console.log(`[FINALIZE] TP/LP Calculation Formulas:`);
    console.log(`[FINALIZE] TP (Tournament Points) for user u: TP_u = TP_POOL * (WindowScore_u / SUM(WindowScore_v))`);
    console.log(`[FINALIZE] LP (Leaderboard Points) for user u: LP_u = 100 * (WindowScore_u / MaxWindowScore)`);
    console.log(`[FINALIZE] Input Parameters:`);
    console.log(`[FINALIZE] TP_POOL = ${tpPool}`);
    console.log(`[FINALIZE] totalWindowScore (SUM(WindowScore_v)) = ${totalWindowScore}`);
    console.log(`[FINALIZE] maxWindowScore (Max(WindowScore_u)) = ${maxWindowScore}`);
    console.log(`[FINALIZE] Number of participants: ${sortedUsers.length}`);

    console.debug(`[FINALIZE] Sorted user window scores:`);
    sortedUsers.forEach((user, idx) => {
      console.debug(`[FINALIZE] Rank ${idx + 1}: userId=${user.userId}, wallet=${user.userWallet}, windowScore=${user.windowScore}, dailyScoresCount=${user.dailyScoresCount}`);
    });

    const finalizationResults: Array<{
      userId: number;
      userWallet: string;
      windowScore: number;
      tournamentPoints: number;
      leaderboardPoints: number;
      rank: number;
    }> = [];

    for (let i = 0; i < sortedUsers.length; i++) {
      const user = sortedUsers[i];

      const tournamentPoints = totalWindowScore > 0 
        ? (tpPool * user.windowScore) / totalWindowScore 
        : 0;

      const leaderboardPoints = maxWindowScore > 0 
        ? (100 * user.windowScore) / maxWindowScore 
        : 0;

      console.debug(`[FINALIZE][USER] Rank ${i + 1} userId=${user.userId} wallet=${user.userWallet}`);
      console.debug(`[FINALIZE][USER] WindowScore_u = ${user.windowScore}`);
      console.debug(`[FINALIZE][USER] TP_u = TP_POOL * (WindowScore_u / SUM(WindowScore_v)) = ${tpPool} * (${user.windowScore} / ${totalWindowScore}) = ${tournamentPoints}`);
      console.debug(`[FINALIZE][USER] LP_u = 100 * (WindowScore_u / MaxWindowScore) = 100 * (${user.windowScore} / ${maxWindowScore}) = ${leaderboardPoints}`);

      finalizationResults.push({
        userId: user.userId,
        userWallet: user.userWallet,
        windowScore: user.windowScore,
        tournamentPoints: Math.round(tournamentPoints * 100) / 100,
        leaderboardPoints: Math.round(leaderboardPoints * 100) / 100,
        rank: i + 1
      });
    }

    console.log(`[FINALIZE] Finalization leaderboard:`);
    finalizationResults.forEach(result => {
      console.log(`[FINALIZE][LEADERBOARD] Rank ${result.rank} userId=${result.userId} wallet=${result.userWallet} windowScore=${result.windowScore} TP=${result.tournamentPoints} LP=${result.leaderboardPoints}`);
    });

    const updateEntryPromises = finalizationResults.map(result => {
      const userEntry = userWindowScores.get(result.userId);
      if (!userEntry) return null;

      return prisma.competitionEntry.update({
        where: { id: userEntry.entryId },
        data: {
          windowScore: result.windowScore,
          tournamentPoints: result.tournamentPoints,
          leaderboardPoints: result.leaderboardPoints,
          finalizedAt: now
        }
      });
    }).filter(Boolean);

    await Promise.all(updateEntryPromises);

    const updateUserPromises = finalizationResults.map(result => {
      const currentUserEntry = competitionEntries.find(e => e.userId === result.userId);
      if (!currentUserEntry) return null;

      const currentTotal = parseFloat(currentUserEntry.user.totalTournamentPoints.toString());
      const newTotal = currentTotal + result.tournamentPoints;

      console.debug(`[FINALIZE][USER] Updating userId=${result.userId} totalTournamentPoints: ${currentTotal} + ${result.tournamentPoints} = ${newTotal}`);

      return prisma.user.update({
        where: { id: result.userId },
        data: { totalTournamentPoints: newTotal }
      });
    }).filter(Boolean);

    await Promise.all(updateUserPromises);

    await prisma.competition.update({
      where: { id: competitionId },
      data: { status: 'FINALIZED' }
    });

    console.log(`[FINALIZE] Competition ${competitionId} finalized successfully:`);
    console.log(`[FINALIZE] Participants: ${finalizationResults.length}`);
    console.log(`[FINALIZE] Total TP distributed: ${finalizationResults.reduce((sum, r) => sum + r.tournamentPoints, 0)}`);
    if (finalizationResults.length > 0) {
      console.log(`[FINALIZE] Winner:`, finalizationResults[0]);
    }

    return NextResponse.json({
      success: true,
      message: 'Competition finalized successfully',
      finalization: {
        competitionId,
        finalizedAt: now.toISOString(),
        participants: finalizationResults.length,
        tpPool: tpPool,
        totalWindowScore,
        maxWindowScore
      },
      leaderboard: finalizationResults.map(result => ({
        rank: result.rank,
        userId: result.userId,
        userWallet: result.userWallet,
        windowScore: result.windowScore,
        tournamentPoints: result.tournamentPoints,
        leaderboardPoints: result.leaderboardPoints
      }))
    }, { status: 200 });

  } catch (error) {
    console.error('[FINALIZE] Error finalizing competition:', error);
    return NextResponse.json(
      { error: 'Failed to finalize competition' },
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

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        tpPool: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!competition) {
      console.error(`[FINALIZE][GET] Competition not found: ${competitionId}`);
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    const results = await prisma.competitionEntry.findMany({
      where: { competitionId },
      include: {
        user: {
          select: {
            userPrivyWalletAddress: true,
            totalTournamentPoints: true
          }
        }
      },
      orderBy: {
        leaderboardPoints: 'desc'
      }
    });

    console.debug(`[FINALIZE][GET] Returning finalized results for competition ${competitionId}:`);
    results.forEach((entry, idx) => {
      console.debug(`[FINALIZE][GET] Rank ${idx + 1}: userId=${entry.userId}, wallet=${entry.user.userPrivyWalletAddress}, windowScore=${entry.windowScore}, TP=${entry.tournamentPoints}, LP=${entry.leaderboardPoints}, userTotalTP=${entry.user.totalTournamentPoints}`);
    });

    return NextResponse.json({
      success: true,
      competition: {
        id: competition.id,
        status: competition.status,
        startDate: competition.startDate.toISOString(),
        endDate: competition.endDate.toISOString(),
        tpPool: competition.tpPool.toString(),
        createdAt: competition.createdAt.toISOString(),
        updatedAt: competition.updatedAt.toISOString()
      },
      results: results.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        userWallet: entry.user.userPrivyWalletAddress,
        joinedAt: entry.joinedAt.toISOString(),
        windowScore: entry.windowScore?.toString() || '0',
        tournamentPoints: entry.tournamentPoints?.toString() || '0',
        leaderboardPoints: entry.leaderboardPoints?.toString() || '0',
        finalizedAt: entry.finalizedAt?.toISOString(),
        userTotalTP: entry.user.totalTournamentPoints.toString()
      }))
    });

  } catch (error) {
    console.error('[FINALIZE][GET] Error fetching competition results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competition results' },
      { status: 500 }
    );
  }
}