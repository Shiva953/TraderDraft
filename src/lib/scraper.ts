import { Builder, WebDriver, By, until, WebElement } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import * as cheerio from 'cheerio';
import * as path from 'path';

interface TraderData {
  period: number;
  walletName: string;
  walletAddress: string;
  walletAvatar?: string;
  accountName?: string;
  wins: string;
  losses: string;
  pnlUsd: string;
  pnlSol: string;
  telegram?: string | null;
  twitter?: string | null;
  rank?: number;
}

interface ScrapingResult {
  traders: TraderData[];
  timestamp: string;
  totalTraders: number;
  period: string;
}

interface SocialLookup {
  [walletAddress: string]: {
    telegram: string | null;
    twitter: string | null;
  };
}

class KOLScanScraper {
  private driver: WebDriver | null = null;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Setup Chrome WebDriver with options
   */
  private async setupDriver(): Promise<WebDriver> {
    this.logger.info("Setting up Chrome WebDriver");
    
    const options = new chrome.Options();
    
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.addArguments('--disable-web-security');
    options.addArguments('--disable-features=VizDisplayCompositor');
    
    // User agent to avoid detection
    options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    this.driver = driver;
    return driver;
  }

  /**
   * Wait for element with multiple selector attempts
   */
  private async waitForElement(
    driver: WebDriver, 
    selector: string, 
    by: typeof By.CSS_SELECTOR | typeof By.XPATH = By.CSS_SELECTOR, 
    timeout: number = 10000
  ): Promise<WebElement> {
    return await driver.wait(until.elementLocated(By.css(selector)), timeout);
  }

  private async clickTimeFilter(driver: WebDriver, period: 'Daily' | 'Weekly' | 'Monthly'): Promise<void> {
    this.logger.info(`Attempting to click ${period} filter button`);
    
    await driver.sleep(5000);

    const buttonSelectors = {
      'Daily': [
        "//div[contains(@class, 'timeFilterContainer')]//p[contains(@class, 'selected') or text()='Daily']",
        "//p[text()='Daily']",
        "//button[text()='Daily']",
        "//*[contains(text(), 'Daily')]"
      ],
      'Weekly': [
        "//div[contains(@class, 'timeFilterContainer')]//p[text()='Weekly']",
        "//p[text()='Weekly']",
        "//button[text()='Weekly']",
        "//*[contains(text(), 'Weekly')]"
      ],
      'Monthly': [
        "//div[contains(@class, 'timeFilterContainer')]//p[text()='Monthly']",
        "//p[text()='Monthly']",
        "//button[text()='Monthly']",
        "//*[contains(text(), 'Monthly')]"
      ]
    };

    const selectors = buttonSelectors[period];
    
    for (const selector of selectors) {
      try {
        this.logger.info(`Trying selector: ${selector}`);
        
        const button = await driver.wait(
          until.elementLocated(By.xpath(selector)),
          15000
        );
        
        await driver.wait(until.elementIsEnabled(button), 5000);
        

        await driver.executeScript("arguments[0].scrollIntoView(true);", button);
        await driver.sleep(1000);
        
        try {
          await button.click();
          this.logger.info(`Successfully clicked ${period} button with regular click`);
          await driver.sleep(3000);
          return;
        } catch {
          await driver.executeScript("arguments[0].click();", button);
          this.logger.info(`Successfully clicked ${period} button with JavaScript click`);
          await driver.sleep(3000);
          return;
        }
      } catch (error) {
        this.logger.warn(`Selector ${selector} failed: ${error}`);
        continue;
      }
    }

    const pageSource = await driver.getPageSource();
    writeFileSync(`debug_page_${period}.html`, pageSource, 'utf-8');
    
    throw new Error(`Could not find or click ${period} button with any selector`);
  }

  /**
   * Extract trader data from the page
   */
  private async extractData(driver: WebDriver, period: 'Daily' | 'Weekly' | 'Monthly'): Promise<TraderData[]> {
    const periodDays: Record<string, number> = { 'Daily': 1, 'Weekly': 7, 'Monthly': 30 };
    const pageSource = await driver.getPageSource();
    const $ = cheerio.load(pageSource);

    const socialLookup = this.extractSocialLookup($);
    
    const users = $('div.leaderboard_leaderboardUser__8OZpJ');
    const data: TraderData[] = [];

    users.each((index, userEl) => {
      try {
        const $user = $(userEl);

        const accountLink = $user.find('a').first();
        const walletName = accountLink.find('h1').text().trim();
        const walletAddress = accountLink.attr('href')?.split('/account/')[1] || '';
        const walletAvatar = accountLink.find('img').attr('src') || '';
        
        const accountName = $user.find('p.remove-mobile').text().trim();
        
        const winLossDiv = $user.find('div.remove-mobile');
        const winLossTags = winLossDiv.find('p');
        const wins = winLossTags.eq(0).text().trim();
        const losses = winLossTags.eq(1).text().trim();
        
        const pnlDiv = $user.find('div.leaderboard_totalProfitNum__HzfFO');
        const pnlTags = pnlDiv.find('h1');
        const pnlSol = pnlTags.eq(0).text().trim();
        const pnlUsd = pnlTags.eq(1).text().trim();

        const socialInfo = socialLookup[walletAddress];
        
        const traderData: TraderData = {
          period: periodDays[period],
          walletName,
          walletAddress,
          walletAvatar,
          accountName,
          wins,
          losses,
          pnlUsd,
          pnlSol,
          telegram: socialInfo?.telegram || null,
          twitter: socialInfo?.twitter || null,
          rank: index + 1
        };
        
        data.push(traderData);
        
      } catch (error) {
        this.logger.warn(`Failed to extract data for user at index ${index}: ${error}`);
      }
    });

    this.logger.info(`Successfully extracted data for ${data.length} users`);
    return data;
  }


  private extractSocialLookup($: cheerio.CheerioAPI): SocialLookup {
    const socialLookup: SocialLookup = {};
    
    try {
      const scripts = $('script').toArray();
      let combinedPushContent = '';
      
      for (const script of scripts) {
        const scriptContent = $(script).html();
        if (scriptContent && scriptContent.includes('self.__next_f.push')) {
          let cleaned = scriptContent
            .replace('self.__next_f.push([', '')
            .replace(']);', '');
            
          if (cleaned.startsWith('1,')) {
            cleaned = cleaned.substring(2);
          }
          
          combinedPushContent += cleaned.replace('])', '');
        }
      }
      
      combinedPushContent = combinedPushContent
        .replace(/\\/g, '')
        .split('"initialData":')[1]
        ?.split('"initialUserData":')[0]
        ?.replace(',"telegram":""', ',"telegram":null')
        ?.replace('""', '')
        ?.replace(/,$/, '') || '';
      
      if (combinedPushContent) {
        const combinedData = JSON.parse('[' + combinedPushContent + ']');
        
        if (Array.isArray(combinedData) && combinedData[0]) {
          for (const item of combinedData[0]) {
            if (item.wallet_address) {
              socialLookup[item.wallet_address] = {
                telegram: item.telegram || null,
                twitter: item.twitter || null
              };
            }
          }
        }
      }
      
    } catch (error) {
      this.logger.error(`Failed to parse social media data: ${error}`);
    }
    
    return socialLookup;
  }


  /**
   * Main scraping function(daily/weekly/monthly leaderboard traders + each of their profiles)
   */
  async scrapeKOLScan(): Promise<ScrapingResult[]> {
    this.logger.info("Initializing scraper");
    const driver = await this.setupDriver();
    this.logger.info("Browser driver setup complete");
  
    const allResults: ScrapingResult[] = [];
  
    try {
      await driver.get("https://kolscan.io/leaderboard");
      await driver.sleep(5000);
  
      const periods: ('Daily' | 'Weekly' | 'Monthly')[] = ['Daily', 'Weekly', 'Monthly'];
  
      for (const period of periods) {
        if (period !== 'Daily') {
          await this.clickTimeFilter(driver, period);
        } else {
          await driver.sleep(2000);
        }
  
        const periodData = await this.extractData(driver, period);
  
        const result: ScrapingResult = {
          traders: periodData,
          timestamp: new Date().toISOString(),
          totalTraders: periodData.length,
          period
        };
  
        allResults.push(result);
      }
  
    } finally {
      if (this.driver) {
        await this.driver.quit();
      }
    }
  
    return allResults;
  }  

  /**
   * Scrape specific trader details
   */
  async scrapeTraderDetails(walletAddress: string): Promise<any> {
    const driver = this.driver || await this.setupDriver();
    
    try {
      this.logger.info(`Getting details for trader: ${walletAddress}`);
      
      await driver.get(`https://kolscan.io/account/${walletAddress}`);
      await driver.sleep(3000);
      
      const pageSource = await driver.getPageSource();
      const $ = cheerio.load(pageSource);
      
      const traderData: any = {
        walletAddress,
        transactions: [],
        totalPnL: null,
        winRate: null,
        recentTrades: []
      };


      const transactions = $('div[class*="transaction"]');
      transactions.each((index, el) => {
        const $el = $(el);

        const transaction = {
          type: $el.find('[class*="action"]').text().trim(),
          token: $el.find('[class*="token"]').text().trim(),
          amount: $el.find('[class*="amount"]').text().trim(),
          price: $el.find('[class*="price"]').text().trim(),
          timestamp: $el.find('[class*="time"]').text().trim()
        };
        
        if (transaction.type) {
          traderData.transactions.push(transaction);
        }
      });

      return traderData;
      
    } catch (error) {
      this.logger.error(`Error getting trader details for ${walletAddress}: ${error}`);
      throw error;
    }
  }

  /**
   * Scrape live trading activity
   */
  async scrapeLiveActivity(): Promise<any[]> {
    const driver = this.driver || await this.setupDriver();
    
    try {
      this.logger.info("Scraping live trading activity");
      
      await driver.get("https://kolscan.io");
      await driver.sleep(3000);
      
      const pageSource = await driver.getPageSource();
      const activities: any[] = [];
      
      const activityMatches = pageSource.match(/\[(.*?)\]\s+(bought|sold)\s+([\d.]+)\s+sol\s+\(([\d.]+[mkb]?)\)\s+of\s+(\w+)\s+at\s+\$([0-9.]+)/gi);
      
      if (activityMatches) {
        activityMatches.forEach(match => {
          const parts = match.match(/\[(.*?)\]\s+(bought|sold)\s+([\d.]+)\s+sol\s+\(([\d.]+[mkb]?)\)\s+of\s+(\w+)\s+at\s+\$([0-9.]+)/i);
          if (parts) {
            activities.push({
              trader: parts[1],
              action: parts[2],
              solAmount: parseFloat(parts[3]),
              tokenAmount: parts[4],
              token: parts[5],
              price: parseFloat(parts[6]),
              timestamp: new Date().toISOString()
            });
          }
        });
      }

      this.logger.info(`Found ${activities.length} live activities`);
      return activities;
      
    } catch (error) {
      this.logger.error(`Error scraping live activity: ${error}`);
      throw error;
    }
  }

  /**
   * Start continuous monitoring
   */
  async startMonitoring(intervalMs: number = 60000): Promise<void> {
    this.logger.info(`Starting monitoring every ${intervalMs / 1000} seconds`);
    
    const monitor = async () => {
      try {
        if (!this.driver) {
          await this.setupDriver();
        }
        
        const results = await this.scrapeKOLScan();
        const liveActivity = await this.scrapeLiveActivity();
        
        this.logger.info(`Scraped ${results.length} periods with total traders`);
        this.logger.info(`Found ${liveActivity.length} live activities`);
        
      } catch (error) {
        this.logger.error(`Monitoring error: ${error}`);
        
        if (this.driver) {
          try {
            await this.driver.quit();
          } catch {}
          this.driver = null;
        }
      }
    };

    await monitor();
    
    setInterval(monitor, intervalMs);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
  }
}

/**
 * Simple logging class
 */
class Logger {
  private logDir: string = 'logs';
  
  constructor() {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir);
    }
  }
  
  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${level} - ${message}`;
    
    console.log(logMessage);
    
    const logFile = path.join(this.logDir, `gmgn_scraper_${new Date().toISOString().split('T')[0]}.log`);
    try {
      writeFileSync(logFile, logMessage + '\n', { flag: 'a' });
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
  
  info(message: string): void {
    this.log('INFO', message);
  }
  
  warn(message: string): void {
    this.log('WARN', message);
  }
  
  error(message: string): void {
    this.log('ERROR', message);
  }
}

/**
 * Data processing utilities
 */
export class DataProcessor {
  static filterProfitableTraders(traders: TraderData[]): TraderData[] {
    return traders.filter(trader => {
      const pnlSol = parseFloat(trader.pnlSol.replace(/[^\d.-]/g, ''));
      return pnlSol > 0;
    });
  }

  static getTopTraders(traders: TraderData[], count: number = 10): TraderData[] {
    return traders
      .sort((a, b) => {
        const aPnl = parseFloat(a.pnlSol.replace(/[^\d.-]/g, ''));
        const bPnl = parseFloat(b.pnlSol.replace(/[^\d.-]/g, ''));
        return bPnl - aPnl;
      })
      .slice(0, count);
  }

  static calculateStats(traders: TraderData[]) {
    const profitable = traders.filter(t => {
      const pnl = parseFloat(t.pnlSol.replace(/[^\d.-]/g, ''));
      return pnl > 0;
    });
    
    const totalPnL = traders.reduce((sum, t) => {
      const pnl = parseFloat(t.pnlSol.replace(/[^\d.-]/g, ''));
      return sum + pnl;
    }, 0);
    
    return {
      total: traders.length,
      profitable: profitable.length,
      unprofitable: traders.length - profitable.length,
      profitRate: (profitable.length / traders.length) * 100,
      totalPnL,
      avgPnL: totalPnL / traders.length
    };
  }
}

/**
 * Database interface (extend as needed)
 */
export class DatabaseManager {
  
  async saveToDatabase(data: TraderData[]): Promise<void> {
    console.log(`Would save ${data.length} records to database`);
    
    /*
    for (const record of data) {
      try {
        await db.kolLeaderboard.upsert({
          where: { wallet_address: record.walletAddress },
          create: {
            period: record.period,
            wallet_name: record.walletName,
            wallet_address: record.walletAddress,
            pnl_usd: record.pnlUsd,
            pnl_sol: record.pnlSol,
            telegram: record.telegram,
            twitter: record.twitter,
            wins: record.wins,
            losses: record.losses
          },
          update: {
            period: record.period,
            wallet_name: record.walletName,
            pnl_usd: record.pnlUsd,
            pnl_sol: record.pnlSol,
            telegram: record.telegram,
            twitter: record.twitter,
            wins: record.wins,
            losses: record.losses,
            updated_at: new Date()
          }
        });
      } catch (error) {
        console.error(`Error storing record for ${record.walletAddress}: ${error}`);
      }
    }
    */
  }
}

async function main(): Promise<void> {
  const scraper = new KOLScanScraper();
  
  try {
    const results = await scraper.scrapeKOLScan();

    for (const result of results) {
      console.log(`\n📊 ${result.period} Period Results:`);
      console.log(`Total traders: ${result.totalTraders}`);
      
      const stats = DataProcessor.calculateStats(result.traders);
      console.log(`Profitable traders: ${stats.profitable}/${stats.total} (${stats.profitRate.toFixed(1)}%)`);
      console.log(`Average PnL: ${stats.avgPnL.toFixed(2)} SOL`);
      
      const topTraders = DataProcessor.getTopTraders(result.traders, 5);
      console.log('\nTop 5 traders:');
      topTraders.forEach((trader, index) => {
        console.log(`${index + 1}. ${trader.walletName} (${trader.walletAddress}): ${trader.pnlSol}`);
      });
    }

    await scraper.startMonitoring(10000); // Re-scraping every 10 seconds

  } catch (error) {
    console.error('Main execution error:', error);
  } finally {
    await scraper.cleanup();
  }
}

export { KOLScanScraper, TraderData, ScrapingResult, Logger };

if (require.main === module) {
  main().catch(console.error);
}
