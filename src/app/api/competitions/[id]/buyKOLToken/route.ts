// (record all user activity during competiton period, with first buy user becomes part of competition)

// ANY USER KOL TOKEN BUY DURING GIVEN PERIOD GETS ADDED TO THE TABLE
// USER ALSO GETS ADDED TO THE COMPETITION(IF NOT ALREADY, CHECK THE USERS[] IN COMPETITION TABLE)
// IF ITS EMPTY/CURRENT USER ISN'T IN THE TABLE, ADD HIM TO THE COMPETITION
// THIS HAPPENS DURING ANY KOL TOKEN BUY BY ANY USER DURING THE WINDOW PERIOD

// INVOKED IMMEDIATELY AFTER USER BUYS A TOKEN FROM THE POOL DURING THE COMPETITION WINDOW

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const competitionId = params.id;
    const body = await request.json();
    

    const { 
      userPrivyWalletAddress, 
      traderId, 
      tokenAmount, 
      purchasePrice,
      transactionHash 
    } = body;

    if (!userPrivyWalletAddress || !traderId || !tokenAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: userPrivyWalletAddress, traderId, tokenAmount' },
        { status: 400 }
      );
    }

    if (parseFloat(tokenAmount) <= 0) {
      return NextResponse.json(
        { error: 'Token amount must be greater than 0' },
        { status: 400 }
      );
    }

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

    // current time ∈ window
    const now = new Date();
    if (now < competition.startDate || now > competition.endDate) {
      return NextResponse.json(
        { error: 'Competition is not currently running' },
        { status: 400 }
      );
    }

    const trader = await prisma.trader.findUnique({
      where: { id: traderId },
      select: { id: true, name: true, ticker: true }
    });

    if (!trader) {
      return NextResponse.json(
        { error: 'Trader not found' },
        { status: 404 }
      );
    }

    // get/create user
    let user = await prisma.user.findUnique({
      where: { userPrivyWalletAddress },
      select: { id: true }
    });

    // this is if user is buying a KOL token for the first time in the competition window
    if (!user) {
      user = await prisma.user.create({
        data: { userPrivyWalletAddress },
        select: { id: true }
      });
    }

    // check if user is already in the competition, if not add them
    let competitionEntry = await prisma.competitionEntry.findUnique({
      where: {
        competitionId_userId: {
          competitionId,
          userId: user.id
        }
      }
    });

    if (!competitionEntry) {
      competitionEntry = await prisma.competitionEntry.create({
        data: {
          competitionId,
          userId: user.id,
          joinedAt: now
        }
      });
    }

    // Create KOL holding record
    const kolHolding = await prisma.kolHolding.create({
      data: {
        userId: user.id,
        traderId,
        competitionId,
        tokenAmount: parseFloat(tokenAmount),
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        transactionHash,
        purchasedAt: now,
        dailyScore: 0, // Will be calculated during daily scoring
        lastScoreUpdate: null
      },
      include: {
        trader: {
          select: { name: true, ticker: true }
        }
      }
    });

    // Log the purchase for monitoring
    console.log(`KOL token purchase recorded:`, {
      competitionId,
      userId: user.id,
      userWallet: userPrivyWalletAddress,
      traderId,
      traderName: trader.name,
      tokenAmount,
      transactionHash
    });

    return NextResponse.json({
      success: true,
      message: 'KOL token purchase recorded successfully',
      data: {
        kolHoldingId: kolHolding.id,
        competitionId,
        userId: user.id,
        traderId,
        traderName: trader.name,
        traderTicker: trader.ticker,
        tokenAmount: kolHolding.tokenAmount.toString(),
        purchasePrice: kolHolding.purchasePrice?.toString(),
        transactionHash: kolHolding.transactionHash,
        purchasedAt: kolHolding.purchasedAt.toISOString(),
        competitionJoined: !competitionEntry.joinedAt || competitionEntry.joinedAt.getTime() === now.getTime()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error recording KOL token purchase:', error);
    
    // Handle unique constraint violations
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate transaction or entry detected' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to record KOL token purchase' },
      { status: 500 }
    );
  }
}

// fetch user's KOL holdings for a competition
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const competitionId = params.id;
    const { searchParams } = new URL(request.url);
    const userPrivyWalletAddress = searchParams.get('userWallet');

    if (!userPrivyWalletAddress) {
      return NextResponse.json(
        { error: 'userWallet query parameter is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { userPrivyWalletAddress },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        holdings: [],
        message: 'User not found'
      });
    }

    // Get user's KOL holdings for this competition
    const holdings = await prisma.kolHolding.findMany({
      where: {
        userId: user.id,
        competitionId
      },
      include: {
        trader: {
          select: {
            name: true,
            ticker: true,
            pnl: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      competitionId,
      userWallet: userPrivyWalletAddress,
      holdings: holdings.map(holding => ({
        id: holding.id,
        traderId: holding.traderId,
        traderName: holding.trader.name,
        traderTicker: holding.trader.ticker,
        traderPnl: holding.trader.pnl,
        traderAvatar: holding.trader.avatarUrl,
        tokenAmount: holding.tokenAmount.toString(),
        purchasePrice: holding.purchasePrice?.toString(),
        transactionHash: holding.transactionHash,
        purchasedAt: holding.purchasedAt.toISOString(),
        dailyScore: holding.dailyScore.toString(),
        lastScoreUpdate: holding.lastScoreUpdate?.toISOString()
      }))
    });

  } catch (error) {
    console.error('Error fetching KOL holdings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KOL holdings' },
      { status: 500 }
    );
  }
}