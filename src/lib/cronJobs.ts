// Install: npm install node-cron @types/node-cron

// lib/cronJobs.ts
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { KOLScanScraper } from './scraper';

const prisma = new PrismaClient();

export interface JobStatus {
  activeJobs: string[];
  isRunning: boolean;
  timestamp: string;
}

class CronJobManager {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;

  async updateDatabase(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Update already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🔄 [CRON] Starting database update...');
    
    try {
      const scraper = new KOLScanScraper();
      const tradersData = await scraper.scrapeKOLScan();
      
      if (!tradersData || tradersData.length === 0) {
        throw new Error('No data retrieved from scraper');
      }

      await prisma.$transaction(async (tx) => {
        for (const periodData of tradersData) {
          if (!periodData?.traders) continue;
          
          const period = periodData.period.toUpperCase() as 'DAILY' | 'WEEKLY' | 'MONTHLY';
          
          // Update metadata
          await tx.scrapingMetadata.updateMany({
            where: { period: period, isActive: true },
            data: { isActive: false }
          });

          await tx.scrapingMetadata.create({
            data: {
              period: period,
              totalTraders: periodData.totalTraders,
              isActive: true,
            }
          });

          // Clear and insert new data
          await tx.trader.deleteMany({ where: { period: period } });

          const tradersToInsert = periodData.traders.map((trader, index) => ({
            id: `${period.toLowerCase()}_${index + 1}`,
            rank: index + 1,
            name: trader.walletName || `Trader ${index + 1}`,
            address: trader.walletAddress,
            pnl: trader.pnlSol || '',
            winRate: (Number(trader.wins) * 100) / (Number(trader.wins) + Number(trader.losses)),
            avatarUrl: trader.walletAvatar,
            xUrl: trader.twitter,
            period: period,
          }));

          await tx.trader.createMany({
            data: tradersToInsert,
            skipDuplicates: true
          });

          console.log(`✅ [CRON] Updated ${tradersToInsert.length} ${period} traders`);
        }
      }, { timeout: 120000 });

      console.log('✅ [CRON] Database update completed successfully');
      
    } catch (error) {
      console.error('❌ [CRON] Database update failed:', error);
    } finally {
      this.isRunning = false;
      await prisma.$disconnect();
    }
  }

  startCronJobs(): void {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') {
      console.log('⚠️ [CRON] Cron jobs only run in development mode');
      return;
    }

    // Run every 15 minutes in development
    const updateJob = cron.schedule('*/1 * * * *', () => {
      this.updateDatabase();
    }, {
      timezone: "UTC"
    });

    this.jobs.set('database-update', updateJob);
    updateJob.start();

    console.log('🚀 [CRON] Background jobs started');
    console.log('📅 [CRON] Database updates: every 15 minutes');
    
    // Run initial update after 2 minutes to let the app start up
    setTimeout(() => {
      console.log('🔄 [CRON] Running initial update...');
      this.updateDatabase();
    }, 2 * 60 * 1000);
  }

  stopCronJobs(): void {
    this.jobs.forEach((job, name) => {
      job.destroy();
      console.log(`🛑 [CRON] Stopped job: ${name}`);
    });
    this.jobs.clear();
  }

  async triggerUpdate(): Promise<void> {
    console.log('🔧 [CRON] Manual update triggered');
    await this.updateDatabase();
  }

  getStatus(): JobStatus {
    return {
      activeJobs: Array.from(this.jobs.keys()),
      isRunning: this.isRunning,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
const cronManager = new CronJobManager();

export default cronManager;

// pages/api/cron-status.ts (Development helper endpoint)