/**
 * Debug Script - Check Competition State
 * 
 * Run this to see what's blocking competition creation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugState() {
  console.log('🔍 DEBUGGING COMPETITION STATE\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Check app phase
    const currentPhase = await prisma.appPhase.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n📋 CURRENT APP PHASE:');
    if (currentPhase) {
      console.log(`   Phase: ${currentPhase.currentPhase}`);
      console.log(`   Started: ${currentPhase.phaseStartedAt.toISOString()}`);
      if (currentPhase.packSaleEndsAt) {
        console.log(`   Pack Sale Ends: ${currentPhase.packSaleEndsAt.toISOString()}`);
      }
      if (currentPhase.revealEndsAt) {
        console.log(`   Reveal Ends: ${currentPhase.revealEndsAt.toISOString()}`);
      }
    } else {
      console.log('   ❌ NO PHASE FOUND - Need to run phaseManager first!');
    }
    
    // 2. Check for ACTIVE competitions
    const activeCompetitions = await prisma.competition.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n🏆 ACTIVE COMPETITIONS:');
    if (activeCompetitions.length === 0) {
      console.log('   ✅ No active competitions (good - can start new one)');
    } else {
      console.log(`   ❌ Found ${activeCompetitions.length} ACTIVE competition(s):`);
      activeCompetitions.forEach((comp, idx) => {
        const now = new Date();
        const hasEnded = now > comp.endDate;
        console.log(`   [${idx + 1}] ID: ${comp.id}`);
        console.log(`       Status: ${comp.status}`);
        console.log(`       Start: ${comp.startDate.toISOString()}`);
        console.log(`       End: ${comp.endDate.toISOString()}`);
        console.log(`       Has Ended: ${hasEnded ? '✅ YES (should be finalized)' : '❌ NO (still running)'}`);
      });
    }
    
    // 3. Check for FINALIZED competitions
    const finalizedCompetitions = await prisma.competition.findMany({
      where: { status: 'FINALIZED' },
      orderBy: { endDate: 'desc' },
      take: 3
    });
    
    console.log('\n✅ RECENT FINALIZED COMPETITIONS:');
    if (finalizedCompetitions.length === 0) {
      console.log('   No finalized competitions yet');
    } else {
      finalizedCompetitions.forEach((comp, idx) => {
        console.log(`   [${idx + 1}] ID: ${comp.id}`);
        console.log(`       End: ${comp.endDate.toISOString()}`);
        console.log(`       Updated: ${comp.updatedAt.toISOString()}`);
      });
    }
    
    // 4. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    
    const canStartCompetition = 
      currentPhase?.currentPhase === 'COMPETITION_LOOP' &&
      activeCompetitions.length === 0;
    
    if (canStartCompetition) {
      console.log('   ✅ CAN START NEW COMPETITION');
    } else {
      console.log('   ❌ CANNOT START NEW COMPETITION');
      console.log('\n   BLOCKERS:');
      if (!currentPhase || currentPhase.currentPhase !== 'COMPETITION_LOOP') {
        console.log(`      - Not in COMPETITION_LOOP phase (current: ${currentPhase?.currentPhase || 'none'})`);
      }
      if (activeCompetitions.length > 0) {
        console.log(`      - ${activeCompetitions.length} ACTIVE competition(s) still exist`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugState();

