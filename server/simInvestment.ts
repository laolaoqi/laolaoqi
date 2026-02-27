// ===================================================================
// Simulated Investment Engine — 模拟投资系统
// 每日$100,000本金，每天8:00（北京时间）清零重建
// 24小时持续交易：每30分钟更新价格，每2小时调仓检查
// 记录每日收益历史，支持单日/当月/一年收益统计
// ===================================================================

import { getDb } from "./db";
import { simPortfolio, simTrades, simSnapshots, simConfig, simDailyPnl } from "../drizzle/schema";
import { eq, desc, gte, and, sql } from "drizzle-orm";
import { getCryptoBoardData, runCryptoBoardJob, type CryptoBoardData, type CryptoCoin } from "./cryptoBoard";

const INITIAL_CAPITAL = 100_000; // $100,000 USD

// ===================================================================
// Types
// ===================================================================
export interface SimPortfolioData {
  config: {
    initialCapital: number;
    startDate: string;
    isActive: boolean;
  };
  summary: {
    totalValue: number;
    cashBalance: number;
    investedValue: number;
    totalPnl: number;
    totalPnlPercent: number;
    positionCount: number;
    lastUpdateTime: string;
  };
  positions: Array<{
    symbol: string;
    name: string;
    category: string;
    entryPrice: number;
    currentPrice: number;
    quantity: number;
    costBasis: number;
    currentValue: number;
    pnl: number;
    pnlPercent: number;
    weight: number;
  }>;
  trades: Array<{
    symbol: string;
    name: string;
    action: string;
    price: number;
    quantity: number;
    value: number;
    reason: string;
    time: string;
  }>;
  snapshots: Array<{
    totalValue: number;
    totalPnl: number;
    totalPnlPercent: number;
    snapshotTime: string;
    createdAt: string;
  }>;
  pnlStats: {
    todayPnl: number;
    todayPnlPercent: number;
    monthPnl: number;
    monthPnlPercent: number;
    yearPnl: number;
    yearPnlPercent: number;
    totalDays: number;
    profitDays: number;
    lossDays: number;
    winRate: number;
    bestDay: { date: string; pnl: number; pnlPercent: number } | null;
    worstDay: { date: string; pnl: number; pnlPercent: number } | null;
  };
}

// ===================================================================
// Helper: Get Beijing date string (YYYY-MM-DD)
// ===================================================================
function getBeijingDateStr(d?: Date): string {
  const now = d || new Date();
  const bjTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return bjTime.toISOString().slice(0, 10);
}

function getBeijingHour(d?: Date): number {
  const now = d || new Date();
  return (now.getUTCHours() + 8) % 24;
}

function getBeijingTimeStr(): string {
  const now = new Date();
  const bjTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return bjTime.toISOString().slice(11, 16); // HH:MM
}

// ===================================================================
// Get or create active config
// ===================================================================
async function getOrCreateConfig() {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(simConfig).where(eq(simConfig.isActive, 1)).limit(1);
  if (existing.length > 0) {
    if (existing[0].initialCapital !== INITIAL_CAPITAL) {
      await db.update(simConfig).set({ initialCapital: INITIAL_CAPITAL }).where(eq(simConfig.id, existing[0].id));
      return { ...existing[0], initialCapital: INITIAL_CAPITAL };
    }
    return existing[0];
  }

  await db.insert(simConfig).values({
    initialCapital: INITIAL_CAPITAL,
    isActive: 1,
  });
  const created = await db.select().from(simConfig).where(eq(simConfig.isActive, 1)).limit(1);
  return created[0];
}

// ===================================================================
// Calculate portfolio allocation based on BTC dominance
// ===================================================================
function calculateAllocation(btcDominance: number): {
  mainstreamPct: number;
  memePct: number;
  cashPct: number;
  strategy: string;
} {
  if (btcDominance > 60) {
    return { mainstreamPct: 0.70, memePct: 0.10, cashPct: 0.20, strategy: '防御模式' };
  } else if (btcDominance > 55) {
    return { mainstreamPct: 0.50, memePct: 0.25, cashPct: 0.25, strategy: '过渡模式' };
  } else if (btcDominance > 50) {
    return { mainstreamPct: 0.35, memePct: 0.45, cashPct: 0.20, strategy: '山寨季模式' };
  } else {
    return { mainstreamPct: 0.20, memePct: 0.60, cashPct: 0.20, strategy: '空气季模式' };
  }
}

// ===================================================================
// Select top coins for investment (by 24h performance & volume)
// ===================================================================
function selectCoins(coins: CryptoCoin[], maxCount: number): CryptoCoin[] {
  const valid = coins.filter(c => c.price > 0);
  const scored = valid.map(c => ({
    coin: c,
    score: (c.change24h > 0 ? c.change24h * 2 : c.change24h * 0.5) + (c.volume24h ? Math.log10(c.volume24h) : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxCount).map(s => s.coin);
}

// ===================================================================
// Save daily settlement — record the day's P&L before resetting
// ===================================================================
async function saveDailySettlement(strategy: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const config = await getOrCreateConfig();
  if (!config) return;

  const positions = await db.select().from(simPortfolio);
  const lastSnapshot = await db.select().from(simSnapshots).orderBy(desc(simSnapshots.id)).limit(1);
  const cashBalance = lastSnapshot.length > 0 ? lastSnapshot[0].cashBalance : config.initialCapital;

  const boardData = getCryptoBoardData();
  let investedValue = 0;
  for (const pos of positions) {
    const allCoins = boardData ? [...boardData.mainstream, ...boardData.meme] : [];
    const latest = allCoins.find(c => c.symbol === pos.symbol);
    const currentPrice = latest && latest.price > 0 ? latest.price : pos.currentPrice;
    investedValue += pos.quantity * currentPrice;
  }

  const totalValue = cashBalance + investedValue;
  const dailyPnl = totalValue - config.initialCapital;
  const dailyPnlPercent = config.initialCapital > 0 ? (dailyPnl / config.initialCapital) * 100 : 0;
  const todayStr = getBeijingDateStr();

  const existing = await db.select().from(simDailyPnl).where(eq(simDailyPnl.date, todayStr)).limit(1);
  if (existing.length > 0) {
    await db.update(simDailyPnl).set({
      finalValue: totalValue,
      dailyPnl: dailyPnl,
      dailyPnlPercent: dailyPnlPercent,
      positionCount: positions.length,
      strategy: strategy,
    }).where(eq(simDailyPnl.id, existing[0].id));
  } else {
    await db.insert(simDailyPnl).values({
      date: todayStr,
      initialCapital: config.initialCapital,
      finalValue: totalValue,
      dailyPnl: dailyPnl,
      dailyPnlPercent: dailyPnlPercent,
      positionCount: positions.length,
      strategy: strategy,
    });
  }

  console.log(`[SimInvestment] Daily settlement saved: date=${todayStr}, P&L=$${dailyPnl.toFixed(2)} (${dailyPnlPercent.toFixed(2)}%)`);
}

// ===================================================================
// Reset portfolio — clear all positions and trades, start fresh
// ===================================================================
async function resetPortfolio(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(simPortfolio);
  // Keep last 500 trades for history
  const tradeCount = await db.select({ count: sql<number>`COUNT(*)` }).from(simTrades);
  if (tradeCount[0]?.count > 500) {
    const keepFrom = await db.select({ id: simTrades.id }).from(simTrades).orderBy(desc(simTrades.id)).limit(500);
    const minId = keepFrom[keepFrom.length - 1]?.id ?? 0;
    await db.delete(simTrades).where(sql`${simTrades.id} < ${minId}`);
  }
  // Keep last 200 snapshots
  const snapCount = await db.select({ count: sql<number>`COUNT(*)` }).from(simSnapshots);
  if (snapCount[0]?.count > 200) {
    const keepFrom = await db.select({ id: simSnapshots.id }).from(simSnapshots).orderBy(desc(simSnapshots.id)).limit(200);
    const minId = keepFrom[keepFrom.length - 1]?.id ?? 0;
    await db.delete(simSnapshots).where(sql`${simSnapshots.id} < ${minId}`);
  }

  const config = await db.select().from(simConfig).where(eq(simConfig.isActive, 1)).limit(1);
  if (config.length > 0) {
    await db.update(simConfig).set({
      initialCapital: INITIAL_CAPITAL,
      startDate: new Date(),
    }).where(eq(simConfig.id, config[0].id));
  }

  console.log(`[SimInvestment] Portfolio reset: $${INITIAL_CAPITAL.toLocaleString()} fresh start`);
}

// ===================================================================
// Update prices only — refresh current prices from CryptoBoard data
// Runs every 30 minutes, 24/7
// ===================================================================
async function updatePositionPrices(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const positions = await db.select().from(simPortfolio);
  if (positions.length === 0) return;

  let boardData = getCryptoBoardData();
  if (!boardData || boardData.mainstream.length === 0) {
    // Try to fetch fresh data
    boardData = await runCryptoBoardJob();
  }
  if (!boardData) return;

  const allCoins = [...boardData.mainstream, ...boardData.meme];
  let updatedCount = 0;
  let totalInvested = 0;

  for (const pos of positions) {
    const latest = allCoins.find(c => c.symbol === pos.symbol);
    if (latest && latest.price > 0) {
      const newValue = pos.quantity * latest.price;
      const newPnl = newValue - pos.costBasis;
      const newPnlPct = pos.costBasis > 0 ? (newPnl / pos.costBasis) * 100 : 0;
      await db.update(simPortfolio).set({
        currentPrice: latest.price,
        currentValue: newValue,
        pnl: newPnl,
        pnlPercent: newPnlPct,
      }).where(eq(simPortfolio.id, pos.id));
      totalInvested += newValue;
      updatedCount++;
    } else {
      totalInvested += pos.currentValue;
    }
  }

  // Save a snapshot with updated prices
  const config = await getOrCreateConfig();
  const lastSnapshot = await db.select().from(simSnapshots).orderBy(desc(simSnapshots.id)).limit(1);
  const cashBalance = lastSnapshot.length > 0 ? lastSnapshot[0].cashBalance : (config?.initialCapital ?? INITIAL_CAPITAL);
  const totalValue = cashBalance + totalInvested;
  const capital = config?.initialCapital ?? INITIAL_CAPITAL;
  const totalPnl = totalValue - capital;
  const totalPnlPercent = capital > 0 ? (totalPnl / capital) * 100 : 0;

  await db.insert(simSnapshots).values({
    totalValue,
    cashBalance,
    investedValue: totalInvested,
    totalPnl,
    totalPnlPercent,
    positionCount: positions.length,
    snapshotTime: getBeijingTimeStr(),
  });

  console.log(`[SimInvestment] Price update: ${updatedCount}/${positions.length} positions updated, Total=$${totalValue.toFixed(2)}, P&L=${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)} (${totalPnlPercent >= 0 ? '+' : ''}${totalPnlPercent.toFixed(2)}%)`);
}

// ===================================================================
// Main rebalance logic — full buy/sell decisions
// Runs at 8:00 (reset + rebalance) and every 2 hours for adjustments
// ===================================================================
export async function runSimRebalance(isReset: boolean = false): Promise<void> {
  console.log(`[SimInvestment] Starting ${isReset ? 'daily reset + rebalance' : 'rebalance'} at Beijing ${getBeijingTimeStr()}...`);

  try {
    const db = await getDb();
    if (!db) {
      console.error('[SimInvestment] No database connection');
      return;
    }

    // 1. Get crypto board data
    let boardData = getCryptoBoardData();
    if (!boardData) {
      boardData = await runCryptoBoardJob();
    }
    if (!boardData || boardData.mainstream.length === 0) {
      console.log('[SimInvestment] No crypto data available, skipping rebalance');
      return;
    }

    const allocation = calculateAllocation(boardData.btcDominance);

    // 2. If this is a daily reset (8:00 Beijing time), save settlement and clear
    if (isReset) {
      await saveDailySettlement(allocation.strategy);
      await resetPortfolio();
    }

    // 3. Get or create config
    const config = await getOrCreateConfig();
    if (!config) {
      console.error('[SimInvestment] Failed to get/create config');
      return;
    }

    // 4. Get current positions
    const currentPositions = await db.select().from(simPortfolio);

    // 5. Calculate current total value
    let cashBalance: number;
    if (currentPositions.length === 0) {
      cashBalance = config.initialCapital;
    } else {
      const lastSnapshot = await db.select().from(simSnapshots).orderBy(desc(simSnapshots.id)).limit(1);
      cashBalance = lastSnapshot.length > 0 ? lastSnapshot[0].cashBalance : config.initialCapital;

      // Update current prices
      for (const pos of currentPositions) {
        const allCoins = [...boardData.mainstream, ...boardData.meme];
        const latestCoin = allCoins.find(c => c.symbol === pos.symbol);
        if (latestCoin && latestCoin.price > 0) {
          const newValue = pos.quantity * latestCoin.price;
          const newPnl = newValue - pos.costBasis;
          const newPnlPct = pos.costBasis > 0 ? (newPnl / pos.costBasis) * 100 : 0;
          await db.update(simPortfolio).set({
            currentPrice: latestCoin.price,
            currentValue: newValue,
            pnl: newPnl,
            pnlPercent: newPnlPct,
          }).where(eq(simPortfolio.id, pos.id));
        }
      }
    }

    console.log(`[SimInvestment] Strategy: ${allocation.strategy}, BTC dom: ${boardData.btcDominance.toFixed(1)}%`);

    // 6. Calculate target amounts
    const totalPortfolioValue = cashBalance + currentPositions.reduce((sum: number, p: any) => {
      const allCoins = [...boardData!.mainstream, ...boardData!.meme];
      const latest = allCoins.find(c => c.symbol === p.symbol);
      return sum + (latest && latest.price > 0 ? p.quantity * latest.price : p.currentValue);
    }, 0);

    const targetMainstreamValue = totalPortfolioValue * allocation.mainstreamPct;
    const targetMemeValue = totalPortfolioValue * allocation.memePct;

    // 7. Select coins to invest in
    const topMainstream = selectCoins(boardData.mainstream, 3);
    const topMeme = selectCoins(boardData.meme, 3);

    // 7.5 Safety: if no coins selected but we have existing positions, just update prices
    if (topMainstream.length === 0 && topMeme.length === 0 && currentPositions.length > 0) {
      console.log('[SimInvestment] No coins selected (API may be limited), keeping existing positions');
      await updatePositionPrices();
      return;
    }

    // 8. Sell positions that are no longer in top picks or have >15% loss
    const topSymbols = [...topMainstream, ...topMeme].map(c => c.symbol);
    const refreshedPositions = await db.select().from(simPortfolio);

    for (const pos of refreshedPositions) {
      const allCoins = [...boardData.mainstream, ...boardData.meme];
      const latest = allCoins.find(c => c.symbol === pos.symbol);
      const currentPrice = latest && latest.price > 0 ? latest.price : pos.currentPrice;
      const pnlPct = pos.costBasis > 0 ? ((pos.quantity * currentPrice - pos.costBasis) / pos.costBasis) * 100 : 0;

      const shouldSell = !topSymbols.includes(pos.symbol) || pnlPct < -15;

      if (shouldSell) {
        const sellValue = pos.quantity * currentPrice;
        cashBalance += sellValue;

        await db.insert(simTrades).values({
          symbol: pos.symbol,
          name: pos.name,
          action: 'SELL',
          price: currentPrice,
          quantity: pos.quantity,
          value: sellValue,
          reason: pnlPct < -15
            ? `止损卖出 (亏损${pnlPct.toFixed(1)}%)`
            : `调仓卖出 (不在TOP推荐中)`,
        });

        await db.delete(simPortfolio).where(eq(simPortfolio.id, pos.id));
        console.log(`[SimInvestment] SELL ${pos.symbol}: ${pos.quantity.toFixed(6)} @ $${currentPrice.toFixed(2)} = $${sellValue.toFixed(2)}`);
      }
    }

    // 9. Buy new positions
    const remainingPositions = await db.select().from(simPortfolio);
    const existingSymbols = remainingPositions.map((p: any) => p.symbol);

    // Allocate to mainstream
    const mainstreamBudget = Math.min(cashBalance * 0.7, targetMainstreamValue);
    const perMainstreamBudget = topMainstream.length > 0 ? mainstreamBudget / topMainstream.length : 0;

    for (const coin of topMainstream) {
      if (existingSymbols.includes(coin.symbol)) continue;
      if (perMainstreamBudget < 100) continue;

      const buyQty = perMainstreamBudget / coin.price;
      const buyValue = buyQty * coin.price;

      if (cashBalance < buyValue) continue;
      cashBalance -= buyValue;

      await db.insert(simPortfolio).values({
        symbol: coin.symbol,
        name: coin.name,
        category: 'mainstream',
        entryPrice: coin.price,
        currentPrice: coin.price,
        quantity: buyQty,
        costBasis: buyValue,
        currentValue: buyValue,
        pnl: 0,
        pnlPercent: 0,
        weight: (buyValue / totalPortfolioValue) * 100,
      });

      await db.insert(simTrades).values({
        symbol: coin.symbol,
        name: coin.name,
        action: 'BUY',
        price: coin.price,
        quantity: buyQty,
        value: buyValue,
        reason: `${allocation.strategy} — 主流币配置`,
      });

      console.log(`[SimInvestment] BUY ${coin.symbol}: ${buyQty.toFixed(6)} @ $${coin.price.toFixed(2)} = $${buyValue.toFixed(2)}`);
    }

    // Allocate to meme
    const memeBudget = Math.min(cashBalance * 0.8, targetMemeValue);
    const perMemeBudget = topMeme.length > 0 ? memeBudget / topMeme.length : 0;

    for (const coin of topMeme) {
      if (existingSymbols.includes(coin.symbol)) continue;
      if (perMemeBudget < 50) continue;

      const buyQty = perMemeBudget / coin.price;
      const buyValue = buyQty * coin.price;

      if (cashBalance < buyValue) continue;
      cashBalance -= buyValue;

      await db.insert(simPortfolio).values({
        symbol: coin.symbol,
        name: coin.name,
        category: 'meme',
        entryPrice: coin.price,
        currentPrice: coin.price,
        quantity: buyQty,
        costBasis: buyValue,
        currentValue: buyValue,
        pnl: 0,
        pnlPercent: 0,
        weight: (buyValue / totalPortfolioValue) * 100,
      });

      await db.insert(simTrades).values({
        symbol: coin.symbol,
        name: coin.name,
        action: 'BUY',
        price: coin.price,
        quantity: buyQty,
        value: buyValue,
        reason: `${allocation.strategy} — 空气币配置`,
      });

      console.log(`[SimInvestment] BUY ${coin.symbol}: ${buyQty.toFixed(6)} @ $${coin.price.toFixed(2)} = $${buyValue.toFixed(2)}`);
    }

    // 10. Update all position weights
    const finalPositions = await db.select().from(simPortfolio);
    const investedValue = finalPositions.reduce((sum: number, p: any) => sum + p.currentValue, 0);
    const finalTotalValue = cashBalance + investedValue;

    for (const pos of finalPositions) {
      await db.update(simPortfolio).set({
        weight: (pos.currentValue / finalTotalValue) * 100,
      }).where(eq(simPortfolio.id, pos.id));
    }

    // 11. Save snapshot
    const totalPnl = finalTotalValue - config.initialCapital;
    const totalPnlPercent = (totalPnl / config.initialCapital) * 100;

    await db.insert(simSnapshots).values({
      totalValue: finalTotalValue,
      cashBalance: cashBalance,
      investedValue: investedValue,
      totalPnl: totalPnl,
      totalPnlPercent: totalPnlPercent,
      positionCount: finalPositions.length,
      snapshotTime: getBeijingTimeStr(),
    });

    console.log(`[SimInvestment] Rebalance complete: Total=$${finalTotalValue.toFixed(2)}, Cash=$${cashBalance.toFixed(2)}, Positions=${finalPositions.length}, P&L=${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)} (${totalPnlPercent >= 0 ? '+' : ''}${totalPnlPercent.toFixed(2)}%)`);

  } catch (err: any) {
    console.error('[SimInvestment] Rebalance failed:', err?.message);
  }
}

// ===================================================================
// Get P&L statistics (daily, monthly, yearly)
// ===================================================================
export async function getPnlStats(): Promise<SimPortfolioData['pnlStats']> {
  const db = await getDb();
  const defaultStats: SimPortfolioData['pnlStats'] = {
    todayPnl: 0, todayPnlPercent: 0,
    monthPnl: 0, monthPnlPercent: 0,
    yearPnl: 0, yearPnlPercent: 0,
    totalDays: 0, profitDays: 0, lossDays: 0, winRate: 0,
    bestDay: null, worstDay: null,
  };

  if (!db) return defaultStats;

  try {
    const todayStr = getBeijingDateStr();
    const now = new Date();
    const bjTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const monthStart = bjTime.toISOString().slice(0, 7) + '-01';
    const yearStart = bjTime.getFullYear() + '-01-01';

    const allRecords = await db.select().from(simDailyPnl).orderBy(desc(simDailyPnl.date));

    // Always calculate live P&L from current positions
    const config = await db.select().from(simConfig).where(eq(simConfig.isActive, 1)).limit(1);
    const positions = await db.select().from(simPortfolio);
    const lastSnapshot = await db.select().from(simSnapshots).orderBy(desc(simSnapshots.id)).limit(1);
    const capital = config[0]?.initialCapital ?? INITIAL_CAPITAL;
    const cash = lastSnapshot[0]?.cashBalance ?? capital;

    // Use latest crypto prices for live calculation
    const boardData = getCryptoBoardData();
    let invested = 0;
    for (const pos of positions) {
      const allCoins = boardData ? [...boardData.mainstream, ...boardData.meme] : [];
      const latest = allCoins.find(c => c.symbol === pos.symbol);
      const currentPrice = latest && latest.price > 0 ? latest.price : pos.currentPrice;
      invested += pos.quantity * currentPrice;
    }
    const totalVal = cash + invested;
    const todayPnl = totalVal - capital;
    const todayPnlPercent = capital > 0 ? (todayPnl / capital) * 100 : 0;

    if (allRecords.length === 0) {
      return {
        ...defaultStats,
        todayPnl,
        todayPnlPercent,
      };
    }

    // Monthly P&L (from history, excluding today which is live)
    const monthRecords = allRecords.filter(r => r.date >= monthStart && r.date !== todayStr);
    const monthHistoryPnl = monthRecords.reduce((sum, r) => sum + r.dailyPnl, 0);
    const monthHistoryPnlPct = monthRecords.reduce((sum, r) => sum + r.dailyPnlPercent, 0);

    // Yearly P&L (from history, excluding today)
    const yearRecords = allRecords.filter(r => r.date >= yearStart && r.date !== todayStr);
    const yearHistoryPnl = yearRecords.reduce((sum, r) => sum + r.dailyPnl, 0);
    const yearHistoryPnlPct = yearRecords.reduce((sum, r) => sum + r.dailyPnlPercent, 0);

    // Win/loss stats (from settled days only)
    const settledRecords = allRecords.filter(r => r.date !== todayStr);
    const totalDays = settledRecords.length;
    const profitDays = settledRecords.filter(r => r.dailyPnl > 0).length;
    const lossDays = settledRecords.filter(r => r.dailyPnl < 0).length;
    const winRate = totalDays > 0 ? (profitDays / totalDays) * 100 : 0;

    // Best/worst day
    const sorted = [...settledRecords].sort((a, b) => b.dailyPnl - a.dailyPnl);
    const bestDay = sorted[0] ? { date: sorted[0].date, pnl: sorted[0].dailyPnl, pnlPercent: sorted[0].dailyPnlPercent } : null;
    const worstDay = sorted[sorted.length - 1] ? { date: sorted[sorted.length - 1].date, pnl: sorted[sorted.length - 1].dailyPnl, pnlPercent: sorted[sorted.length - 1].dailyPnlPercent } : null;

    return {
      todayPnl,
      todayPnlPercent,
      monthPnl: monthHistoryPnl + todayPnl,
      monthPnlPercent: monthHistoryPnlPct + todayPnlPercent,
      yearPnl: yearHistoryPnl + todayPnl,
      yearPnlPercent: yearHistoryPnlPct + todayPnlPercent,
      totalDays,
      profitDays,
      lossDays,
      winRate,
      bestDay,
      worstDay,
    };
  } catch (err: any) {
    console.error('[SimInvestment] getPnlStats error:', err?.message);
    return defaultStats;
  }
}

// ===================================================================
// Get portfolio data for frontend
// ===================================================================
export async function getSimPortfolioData(): Promise<SimPortfolioData> {
  const db = await getDb();
  const config = db ? await db.select().from(simConfig).where(eq(simConfig.isActive, 1)).limit(1) : [];
  const positions = db ? await db.select().from(simPortfolio) : [];
  const trades = db ? await db.select().from(simTrades).orderBy(desc(simTrades.id)).limit(50) : [];
  const snapshots = db ? await db.select().from(simSnapshots).orderBy(desc(simSnapshots.id)).limit(50) : [];

  const activeConfig = config[0];
  const capital = activeConfig?.initialCapital ?? INITIAL_CAPITAL;

  // Use latest crypto prices for live calculation
  const boardData = getCryptoBoardData();
  let investedValue = 0;
  const livePositions = positions.map((p: any) => {
    const allCoins = boardData ? [...boardData.mainstream, ...boardData.meme] : [];
    const latest = allCoins.find(c => c.symbol === p.symbol);
    const currentPrice = latest && latest.price > 0 ? latest.price : p.currentPrice;
    const currentValue = p.quantity * currentPrice;
    const pnl = currentValue - p.costBasis;
    const pnlPercent = p.costBasis > 0 ? (pnl / p.costBasis) * 100 : 0;
    investedValue += currentValue;
    return {
      symbol: p.symbol,
      name: p.name,
      category: p.category,
      entryPrice: p.entryPrice,
      currentPrice,
      quantity: p.quantity,
      costBasis: p.costBasis,
      currentValue,
      pnl,
      pnlPercent,
      weight: 0, // will be calculated below
    };
  });

  const lastSnapshot = snapshots[0];
  const cashBalance = lastSnapshot?.cashBalance ?? capital;
  const totalValue = cashBalance + investedValue;
  const totalPnl = totalValue - capital;
  const totalPnlPercent = capital > 0 ? (totalPnl / capital) * 100 : 0;

  // Calculate weights
  for (const pos of livePositions) {
    pos.weight = totalValue > 0 ? (pos.currentValue / totalValue) * 100 : 0;
  }

  const pnlStats = await getPnlStats();

  return {
    config: {
      initialCapital: capital,
      startDate: activeConfig?.startDate?.toISOString() ?? new Date().toISOString(),
      isActive: !!activeConfig?.isActive,
    },
    summary: {
      totalValue,
      cashBalance,
      investedValue,
      totalPnl,
      totalPnlPercent,
      positionCount: livePositions.length,
      lastUpdateTime: lastSnapshot?.createdAt?.toISOString() ?? '',
    },
    positions: livePositions,
    trades: trades.map((t: any) => ({
      symbol: t.symbol,
      name: t.name,
      action: t.action,
      price: t.price,
      quantity: t.quantity,
      value: t.value,
      reason: t.reason ?? '',
      time: t.createdAt?.toISOString() ?? '',
    })),
    snapshots: snapshots.map((s: any) => ({
      totalValue: s.totalValue,
      totalPnl: s.totalPnl,
      totalPnlPercent: s.totalPnlPercent,
      snapshotTime: s.snapshotTime,
      createdAt: s.createdAt?.toISOString() ?? '',
    })),
    pnlStats,
  };
}

// ===================================================================
// Scheduler — 24/7 continuous trading
// - 每日08:00北京时间: 清零重建 (daily reset + rebalance)
// - 每30分钟: 更新持仓价格 (price update)
// - 每2小时: 调仓检查 (rebalance check for stop-loss/rotation)
// ===================================================================
let lastResetDate = '';
let lastRebalanceHour = -1;

export function startSimInvestmentScheduler() {
  // Run initial rebalance 60s after startup (wait for CryptoBoard data)
  setTimeout(async () => {
    console.log('[SimInvestment] Initial rebalance starting...');
    await runSimRebalance(false);
  }, 60_000);

  // Main loop: check every 15 minutes
  setInterval(async () => {
    const now = new Date();
    const bjHour = getBeijingHour(now);
    const bjMinute = now.getUTCMinutes(); // minutes are same in any timezone
    const todayStr = getBeijingDateStr(now);

    // 1. Daily reset at 08:00 Beijing time (UTC 00:00)
    if (bjHour === 8 && bjMinute < 15 && lastResetDate !== todayStr) {
      lastResetDate = todayStr;
      lastRebalanceHour = bjHour;
      console.log(`[SimInvestment] Daily reset at Beijing 08:00`);
      await runSimRebalance(true); // isReset = true
      return;
    }

    // 2. Rebalance check every 2 hours (at :00-:15 of even hours)
    const isRebalanceHour = bjHour % 2 === 0 && bjMinute < 15 && lastRebalanceHour !== bjHour;
    if (isRebalanceHour && bjHour !== 8) { // Skip 08:00 since it's handled above
      lastRebalanceHour = bjHour;
      console.log(`[SimInvestment] Rebalance check at Beijing ${bjHour.toString().padStart(2, '0')}:00`);
      await runSimRebalance(false);
      return;
    }

    // 3. Price update every 30 minutes (at :15 and :45)
    if (bjMinute >= 13 && bjMinute <= 17) {
      await updatePositionPrices();
    } else if (bjMinute >= 43 && bjMinute <= 47) {
      await updatePositionPrices();
    }
  }, 15 * 60 * 1000); // Check every 15 minutes

  console.log('[SimInvestment] Scheduler registered: 24/7 trading — initial in 60s, daily reset at 08:00, rebalance every 2h, price update every 30min');
}
