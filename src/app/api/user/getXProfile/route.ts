import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get("walletAddress");

    console.log("🔍 [getXProfile API] Request for wallet:", walletAddress);

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing wallet address" },
        { status: 400 }
      );
    }

    // Get user's X profile data from database
    const user = await prisma.user.findUnique({
      where: {
        userPrivyWalletAddress: walletAddress,
      },
      select: {
        userPrivyWalletAddress: true,
        xUsername: true,
        xProfilePictureUrl: true,
        xUrl: true,
      },
    });

    // Also check if ANY user has X data (for debugging)
    const usersWithX = await prisma.user.findMany({
      where: {
        NOT: {
          xUsername: null
        }
      },
      select: {
        userPrivyWalletAddress: true,
        xUsername: true,
      },
      take: 5
    });

    console.log("📊 [getXProfile API] Querying for wallet:", walletAddress);
    console.log("📊 [getXProfile API] Found user:", user ? {
      hasUsername: !!user.xUsername,
      hasAvatar: !!user.xProfilePictureUrl,
      hasUrl: !!user.xUrl,
      username: user.xUsername,
      walletInDb: user.userPrivyWalletAddress
    } : "NO USER FOUND");
    console.log("📊 [getXProfile API] Total users with X profiles in DB:", usersWithX.length);
    console.log("📊 [getXProfile API] Sample users with X:", usersWithX.map(u => ({
      wallet: u.userPrivyWalletAddress.substring(0, 8) + '...',
      username: u.xUsername
    })));

    if (!user) {
      return NextResponse.json({
        ok: true,
        xProfile: null,
      });
    }

    const response = {
      ok: true,
      xProfile: {
        xUsername: user.xUsername,
        xProfilePictureUrl: user.xProfilePictureUrl,
        xUrl: user.xUrl,
      },
    };

    console.log("✅ [getXProfile API] Sending response:", response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [getXProfile] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch X profile" },
      { status: 500 }
    );
  }
}
