import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const competitionId = (await params).id;
    const body = await request.json();

    const { 
      userPrivyWalletAddress, 
      traderId, 
      tokenAmount, 
      purchasePrice,
      transactionHash 
    } = body;

    console.debug("[DEBUG] Incoming POST /buyKOLToken body:", body);

    if (!userPrivyWalletAddress || !traderId || !tokenAmount) {
      console.warn("[WARN] Missing required fields:", { userPrivyWalletAddress, traderId, tokenAmount });
      return NextResponse.json(
        { error: 'Missing required fields: userPrivyWalletAddress, traderId, tokenAmount' },
        { status: 400 }
      );
    }

    const parsedTokenAmount = parseFloat(tokenAmount);
    if (isNaN(parsedTokenAmount) || parsedTokenAmount <= 0) {
      console.warn("[WARN] Invalid tokenAmount:", tokenAmount);
      return NextResponse.json(
        { error: 'Token amount must be greater than 0' },
        { status: 400 }
      );
    }

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true
      }
    });

    console.debug("[DEBUG] Competition lookup:", { competitionId, found: !!competition, competition });

    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    if (competition.status !== 'ACTIVE') {
      console.warn("[WARN] Competition not active:", { competitionId, status: competition.status });
      return NextResponse.json(
        { error: 'Competition is not active' },
        { status: 400 }
      );
    }

    const now = new Date();
    if (now < competition.startDate || now > competition.endDate) {
      console.warn("[WARN] Competition not running at this time:", { now, startDate: competition.startDate, endDate: competition.endDate });
      return NextResponse.json(
        { error: 'Competition is not currently running' },
        { status: 400 }
      );
    }

    const trader = await prisma.trader.findUnique({
      where: { id: traderId },
      select: { id: true, name: true, ticker: true }
    });

    console.debug("[DEBUG] Trader lookup:", { traderId, found: !!trader, trader });

    if (!trader) {
      return NextResponse.json(
        { error: 'Trader not found' },
        { status: 404 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { userPrivyWalletAddress },
      select: { id: true }
    });

    console.debug("[DEBUG] User lookup:", { userPrivyWalletAddress, found: !!user, user });

    if (!user) {
      user = await prisma.user.create({
        data: { userPrivyWalletAddress },
        select: { id: true }
      });
      console.info("[INFO] Created new user:", { userPrivyWalletAddress, userId: user.id });
    }

    let competitionEntry = await prisma.competitionEntry.findUnique({
      where: {
        competitionId_userId: {
          competitionId,
          userId: user.id
        }
      }
    });

    console.debug("[DEBUG] CompetitionEntry lookup:", { competitionId, userId: user.id, found: !!competitionEntry });

    if (!competitionEntry) {
      competitionEntry = await prisma.competitionEntry.create({
        data: {
          competitionId,
          userId: user.id,
          joinedAt: now
        }
      });
      console.info("[INFO] Created new competitionEntry:", { competitionId, userId: user.id, joinedAt: now });
    }

    let parsedPurchasePrice: number | undefined = undefined;
    if (purchasePrice !== undefined && purchasePrice !== null && purchasePrice !== "") {
      const num = parseFloat(purchasePrice);
      if (isNaN(num)) {
        console.warn("[WARN] Invalid purchasePrice:", purchasePrice);
      } else {
        parsedPurchasePrice = num;
      }
    }

    // Check if user already has a holding for this KOL in this competition
    const existingHolding = await prisma.kolHolding.findFirst({
      where: {
        userId: user.id,
        traderId,
        competitionId
      }
    });

    console.debug("[DEBUG] Existing holding lookup:", {
      userId: user.id,
      traderId,
      competitionId,
      found: !!existingHolding,
      currentAmount: existingHolding?.tokenAmount.toString()
    });

    let kolHolding;

    if (existingHolding) {
      // Update existing holding: add to token amount, calculate weighted average price
      const newTotalAmount = parseFloat(existingHolding.tokenAmount.toString()) + parsedTokenAmount;
      const existingPrice = existingHolding.purchasePrice ? parseFloat(existingHolding.purchasePrice.toString()) : 0;
      const existingAmount = parseFloat(existingHolding.tokenAmount.toString());

      // Calculate weighted average purchase price
      let newWeightedPrice: number | undefined = undefined;
      if (parsedPurchasePrice !== undefined && existingPrice > 0) {
        newWeightedPrice = ((existingPrice * existingAmount) + (parsedPurchasePrice * parsedTokenAmount)) / newTotalAmount;
      } else if (parsedPurchasePrice !== undefined) {
        newWeightedPrice = parsedPurchasePrice;
      } else if (existingPrice > 0) {
        newWeightedPrice = existingPrice;
      }

      console.debug("[DEBUG] Updating existing holding with:", {
        oldAmount: existingAmount,
        addedAmount: parsedTokenAmount,
        newTotalAmount,
        oldPrice: existingPrice,
        newPurchasePrice: parsedPurchasePrice,
        weightedAveragePrice: newWeightedPrice,
        transactionHash
      });

      kolHolding = await prisma.kolHolding.update({
        where: { id: existingHolding.id },
        data: {
          tokenAmount: newTotalAmount,
          purchasePrice: newWeightedPrice,
          transactionHash, // Update to latest transaction hash
          purchasedAt: now // Update to latest purchase time
        },
        include: {
          trader: {
            select: { name: true, ticker: true }
          }
        }
      });

      console.info(`[INFO] Updated existing KOL holding:`, {
        holdingId: kolHolding.id,
        competitionId,
        userId: user.id,
        traderId,
        previousAmount: existingAmount,
        addedAmount: parsedTokenAmount,
        newTotalAmount,
        weightedAveragePrice: newWeightedPrice
      });
    } else {
      // Create new holding
      console.debug("[DEBUG] Creating new kolHolding with:", {
        userId: user.id,
        traderId,
        competitionId,
        tokenAmount: parsedTokenAmount,
        purchasePrice: parsedPurchasePrice,
        transactionHash,
        purchasedAt: now
      });

      kolHolding = await prisma.kolHolding.create({
        data: {
          userId: user.id,
          traderId,
          competitionId,
          tokenAmount: parsedTokenAmount,
          purchasePrice: parsedPurchasePrice,
          transactionHash,
          purchasedAt: now,
          dailyScore: 0, // dailyScore will be calculated at next 14:00 UTC snapshot
          lastScoreUpdate: null
        },
        include: {
          trader: {
            select: { name: true, ticker: true }
          }
        }
      });

      console.info(`[INFO] Created new KOL holding:`, {
        holdingId: kolHolding.id,
        competitionId,
        userId: user.id,
        traderId,
        tokenAmount: parsedTokenAmount,
        purchasePrice: parsedPurchasePrice
      });
    }

    console.info(`[INFO] KOL token purchase recorded:`, {
      competitionId,
      userId: user.id,
      userWallet: userPrivyWalletAddress,
      traderId,
      traderName: trader.name,
      tokenAmount: parsedTokenAmount,
      purchasePrice: parsedPurchasePrice,
      transactionHash,
      purchasedAt: now.toISOString()
    });

    console.debug("[DEBUG] kolHolding DB result:", kolHolding);

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
        competitionJoined: !competitionEntry.joinedAt || competitionEntry.joinedAt.getTime() === now.getTime(),
        note: "Daily score will be calculated at next 14:00 UTC snapshot"
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error recording KOL token purchase:', error);

    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'P2002') {
      console.warn("[WARN] Duplicate transaction or entry detected:", error);
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const competitionId = (await params).id;
    const { searchParams } = new URL(request.url);
    const userPrivyWalletAddress = searchParams.get('userWallet');

    console.debug("[DEBUG] GET /buyKOLToken params:", { competitionId, userPrivyWalletAddress });

    if (!userPrivyWalletAddress) {
      console.warn("[WARN] Missing userWallet query parameter");
      return NextResponse.json(
        { error: 'userWallet query parameter is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { userPrivyWalletAddress },
      select: { id: true }
    });

    console.debug("[DEBUG] User lookup for GET:", { userPrivyWalletAddress, found: !!user, user });

    if (!user) {
      return NextResponse.json({
        success: true,
        holdings: [],
        message: 'User not found'
      });
    }

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

    console.debug("[DEBUG] Holdings fetched for user:", { userId: user.id, competitionId, count: holdings.length });
    holdings.forEach((h, idx) => {
      console.debug(`[DEBUG] Holding[${idx}]:`, {
        id: h.id,
        traderId: h.traderId,
        tokenAmount: h.tokenAmount,
        purchasePrice: h.purchasePrice,
        transactionHash: h.transactionHash,
        purchasedAt: h.purchasedAt,
        dailyScore: h.dailyScore,
        lastScoreUpdate: h.lastScoreUpdate
      });
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