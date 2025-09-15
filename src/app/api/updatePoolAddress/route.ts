import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const prisma = new PrismaClient();

console.log("🌐 [INIT] Connected to Solana Devnet with commitment: confirmed");

const cpAmm = new CpAmm(connection);

interface KolData {
  id: string;
  name: string;
  rank: number;
  tokenMintAddress: string | null;
  poolAddress: string | null;
}

function createTicker(name: string, index: number): string {
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
  const ticker = cleanName.substring(0, Math.min(10, cleanName.length)).toUpperCase() || `KOL${index + 1}`;
  console.log(`🆔 [TICKER] Generated ticker "${ticker}" from name "${name}"`);
  return ticker;
}

async function derivePoolAddressForKol(
  kol: KolData,
  index: number
): Promise<{ success: boolean; poolAddress?: string; error?: string }> {
  try {
    console.log(`\n🎯 [DERIVE] KOL ${index + 1}: ${kol.name} (Rank ${kol.rank})`);
    
    if (!kol.tokenMintAddress) {
      console.warn(`⚠️ [SKIP] No token mint address for ${kol.name}, skipping pool address derivation`);
      return { success: false, error: "No token mint address available" };
    }

    const ticker = createTicker(kol.name, index);
    const tokenAMint = new PublicKey(kol.tokenMintAddress);
    const tokenBMint = NATIVE_MINT;

    // Get the public config (same logic as createTokensAndPool)
    const configs = await cpAmm.getAllConfigs();
    console.log(`🔍 [DERIVE] Available configs: ${configs.length}`);
    const publicConfig = configs.find(c => c.account.poolCreatorAuthority.toString() === "11111111111111111111111111111111");
    
    if (!publicConfig) {
      throw new Error("No public config found for pool address derivation");
    }

    // Derive the poolAddress PDA using DAMMv2programId and seeds: tokenAMint, tokenBMint, publicConfig.publicKey
    const DAMMv2programId = new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG");
    const [poolAddress] = PublicKey.findProgramAddressSync(
      [
        tokenAMint.toBuffer(),
        tokenBMint.toBuffer(),
        publicConfig.publicKey.toBuffer()
      ],
      DAMMv2programId
    );

    console.log(`✅ [DERIVE] Pool address derived for ${kol.name}: ${poolAddress.toBase58()}`);
    return { success: true, poolAddress: poolAddress.toBase58() };
  } catch (error) {
    console.error(`❌ [ERROR] Failed to derive pool address for ${kol.name}:`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function POST(request: Request) {
  console.log("📩 [API] POST /updatePoolAddress invoked");
  try {
    console.log("📊 [DB] Fetching KOLs with token mint addresses");
    const kols = await prisma.trader.findMany({
      where: { 
        period: 'DAILY',
        tokenMintAddress: { not: null }
      },
      orderBy: { rank: 'asc' },
      select: { 
        id: true, 
        name: true, 
        rank: true, 
        tokenMintAddress: true, 
        poolAddress: true 
      }
    });
    console.log(`✅ [DB] Retrieved ${kols.length} KOL records with token mint addresses`);

    if (kols.length === 0) {
      console.warn("⚠️ [DB] No KOLs with token mint addresses found");
      return NextResponse.json({
        success: false,
        error: "No KOLs with token mint addresses found to update pool addresses for."
      }, { status: 400 });
    }

    const results: { 
      kolId: string; 
      kolName: string; 
      success: boolean; 
      poolAddress?: string; 
      error?: string;
      wasUpdated: boolean;
    }[] = [];
    let successCount = 0, failureCount = 0, updateCount = 0;

    console.log("🔄 [PROCESS] Starting pool address derivation and update loop");
    for (let i = 0; i < kols.length; i++) {
      const kol = kols[i];
      console.log(`\n➡️ [PROCESS] ${i + 1}/${kols.length} - ${kol.name}`);
      
      const result = await derivePoolAddressForKol(kol, i);
      
      let wasUpdated = false;
      if (result.success && result.poolAddress) {
        // Check if the pool address is different from what's currently stored
        if (kol.poolAddress !== result.poolAddress) {
          try {
            await prisma.trader.update({
              where: { id: kol.id },
              data: { poolAddress: result.poolAddress }
            });
            console.log(`✅ [DB] Updated pool address for ${kol.name}: ${result.poolAddress}`);
            wasUpdated = true;
            updateCount++;
          } catch (dbErr) {
            console.error(`❌ [DB] Update failed for ${kol.name}:`, dbErr);
            result.success = false;
            result.error = `Database update failed: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`;
          }
        } else {
          console.log(`ℹ️ [DB] Pool address for ${kol.name} is already up to date`);
        }
      }
    
      results.push({
        kolId: kol.id,
        kolName: kol.name,
        success: result.success,
        poolAddress: result.poolAddress,
        error: result.error,
        wasUpdated
      });
    
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    
      // Rate limiting delay
      if (i < kols.length - 1) {
        console.log(`⏳ [RATE] Waiting 2s before next KOL (${i + 2}/${kols.length})`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log(`\n🎉 [SUMMARY] Success=${successCount} Failure=${failureCount} Updated=${updateCount}`);
    const isFullSuccess = successCount === kols.length;

    return NextResponse.json({
      success: isFullSuccess,
      partialSuccess: successCount > 0 && !isFullSuccess,
      message: isFullSuccess
        ? `🎉 All ${kols.length} KOL pool addresses derived and updated successfully!`
        : successCount > 0
          ? `⚠️ Partial success: ${successCount}/${kols.length} pool addresses derived, ${updateCount} updated`
          : "❌ All pool address derivation attempts failed",
      data: { 
        totalKols: kols.length, 
        successCount, 
        failureCount, 
        updateCount,
        results, 
        readyForPackReveal: isFullSuccess 
      }
    }, { status: isFullSuccess ? 200 : 207 });
  } catch (error) {
    console.error("❌ [API] Pool address update error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  } finally {
    console.log("🔌 [DB] Disconnecting Prisma client");
    await prisma.$disconnect();
  }
}
