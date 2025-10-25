import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Initialize Privy client
const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export async function POST(req: NextRequest) {
  try {
    // Get authorization token from header
    const authToken = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!authToken) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    // Verify the token and get user data from Privy
    const claims = await privyClient.verifyAuthToken(authToken);
    console.log("🔐 [syncXProfile] Verified user:", claims.userId);

    // Get full user data from Privy to access linked accounts
    const privyUser = await privyClient.getUser(claims.userId);

    // Find the Solana wallet (primary identifier in our system)
    // First try by chainType
    let solanaWallet = privyUser.linkedAccounts.find(
      (account) => account.type === "wallet" && account.chainType === "solana"
    );

    // Fallback: find by address format (Solana addresses don't start with 0x)
    if (!solanaWallet) {
      solanaWallet = privyUser.linkedAccounts.find(
        (account) =>
          account.type === "wallet" &&
          account.walletClientType === "privy" &&
          !account.address.startsWith("0x")
      );
    }

    if (!solanaWallet || solanaWallet.type !== "wallet") {
      console.error("❌ [syncXProfile] No Solana wallet found. Linked accounts:", privyUser.linkedAccounts.map(a => ({
        type: a.type,
        chainType: (a as any).chainType,
        address: a.type === 'wallet' ? (a as any).address : undefined
      })));
      return NextResponse.json(
        { error: "No Solana wallet found for user" },
        { status: 400 }
      );
    }

    const walletAddress = solanaWallet.address;
    console.log("✅ [syncXProfile] Found Solana wallet:", walletAddress);

    // Find Twitter/X account in linked accounts
    const twitterAccount = privyUser.linkedAccounts.find(
      (account) => account.type === "twitter_oauth"
    );

    let xUsername: string | null = null;
    let xProfilePictureUrl: string | null = null;
    let xUrl: string | null = null;

    if (twitterAccount && twitterAccount.type === "twitter_oauth") {
      xUsername = twitterAccount.username || twitterAccount.name || null;
      xProfilePictureUrl = twitterAccount.profilePictureUrl || null;

      // Construct X profile URL from username
      if (xUsername) {
        // Remove @ if present
        const cleanUsername = xUsername.replace("@", "");
        xUrl = `https://x.com/${cleanUsername}`;
      }

      console.log("🐦 [syncXProfile] Found X account:", {
        username: xUsername,
        hasProfilePic: !!xProfilePictureUrl,
      });
    } else {
      console.log("ℹ️ [syncXProfile] No X account linked for this user");
    }

    // Update user in database with X profile data
    const updatedUser = await prisma.user.upsert({
      where: {
        userPrivyWalletAddress: walletAddress,
      },
      update: {
        xUsername,
        xProfilePictureUrl,
        xUrl,
        updatedAt: new Date(),
      },
      create: {
        userPrivyWalletAddress: walletAddress,
        xUsername,
        xProfilePictureUrl,
        xUrl,
      },
    });

    console.log("✅ [syncXProfile] User X profile synced:", {
      walletAddress,
      xUsername,
    });

    return NextResponse.json({
      ok: true,
      user: {
        walletAddress: updatedUser.userPrivyWalletAddress,
        xUsername: updatedUser.xUsername,
        xProfilePictureUrl: updatedUser.xProfilePictureUrl,
        xUrl: updatedUser.xUrl,
      },
    });
  } catch (error) {
    console.error("❌ [syncXProfile] Error:", error);
    return NextResponse.json(
      { error: "Failed to sync X profile", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
