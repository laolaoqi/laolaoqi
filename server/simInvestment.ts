// ===================================================================
// Simulated Investment Engine — 模拟投资系统
// 每日$10,000本金，根据BTC主导率投资建议自动买卖
// 每天6:00和22:00（北京时间）更新模拟盘
// 目标：展示基于策略的模拟持仓收益
// ===================================================================

import { getDb } from "./db";
import { simPortfolio, simTrades, simSnapshots, simConfig } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { getCryptoBoardData, runCryptoBoardJob, type CryptoBoardData, type CryptoCoin } from "./cryptoBoard";

const INITIAL_CAPITAL = 10000; // $10,000 USD

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
}

// ===================================================================
// Get or create active config
// ===================================================================
async function getOrCreateConfig() {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(simConfig).where(eq(simConfig.isActive, 1)).limit(1);
  if (existing.length > 0) return existing[0];

  // Create new config
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
    // Defensive: 70% mainstream, 10% meme, 20% cash
    return { mainstreamPct: 0.70, memePct: 0.10, cashPct: 0.20, strategy: '防御模式' };
  } else if (btcDominance > 55) {
    // Transition: 50% mainstream, 25% meme, 25% cash
    return { mainstreamPct: 0.50, memePct: 0.25, cashPct: 0.25, strategy: '过渡模式' };
  } else if (btcDominance > 50) {
    // Alt season: 35% mainstream, 45% meme, 20% cash
    return { mainstreamPct: 0.35, memePct: 0.45, cashPct: 0.20, strategy: '山寨季模式' };
  } else {
    // Meme season: 20% mainstream, 60% meme, 20% cash
    return { mainstreamPct: 0.20, memePct: 0.60, cashPct: 0.20, strategy: '空气季模式' };
  }
}

// ===================================================================
// Select top coins for investment (by 24h performance & volume)
// ===================================================================
function selectCoins(coins: CryptoCoin[], maxCount: number): CryptoCoin[] {
  // Filter out coins with no price data
  const valid = coins.filter(c => c.price > 0);
  // Sort by a composite score: positive momentum + volume
  const scored = valid.map(c => ({
    coin: c,
    score: (c.change24h > 0 ? c.change24h * 2 : c.change24h * 0.5) + (c.volume24h ? Math.log10(c.volume24h) : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxCount).map(s => s.coin);
}

// ===================================================================
// Main rebalance logic — runs at 6:00 and 22:00 Beijing time
// ===================================================================
export async function runSimRebalance(): Promise<void> {
  console.log('[SimInvestment] Starting rebalance...');

  try {
    // 0. Get database connection
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

    // 2. Get or create config
    const config = await getOrCreateConfig();
    if (!config) {
      console.error('[SimInvestment] Failed to get/create config');
      return;
    }

    // 3. Get current positions
    const currentPositions = await db.select().from(simPortfolio);

    // 4. Calculate current total value
    let cashBalance: number;
    if (currentPositions.length === 0) {
      // First run — start with full capital
      cashBalance = config.initialCapital;
    } else {
      // Calculate from last snapshot or positions
      const lastSnapshot = await db.select().from(simSnapshots).orderBy(desc(simSnapshots.id)).limit(1);
      cashBalance = lastSnapshot.length > 0 ? lastSnapshot[0].cashBalance : config.initialCapital;

      // Update current prices for existing positions
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

    // 5. Determine allocation
    const allocation = calculateAllocation(boardData.btcDominance);
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
    const topMainstream = selectCoins(boardData.mainstream, 3); // Top 3 mainstream
    const topMeme = selectCoins(boardData.meme, 3);             // Top 3 meme

    // 7.5 Safety: if no coins selected but we have existing positions, keep them (API may be down)
    if (topMainstream.length === 0 && topMeme.length === 0 && currentPositions.length > 0) {
      console.log('[SimInvestment] No coins selected (API may be limited), keeping existing positions');
      // Still save snapshot with updated prices
      const updatedPositions = await db.select().from(simPortfolio);
      const investedVal = updatedPositions.reduce((s: number, p: any) => s + p.currentValue, 0);
      const totalVal = cashBalance + investedVal;
      const pnl = totalVal - config.initialCapital;
      const pnlPct = config.initialCapital > 0 ? (pnl / config.initialCapital) * 100 : 0;
      await db.insert(simSnapshots).values({
        totalValue: totalVal,
        cashBalance: cashBalance,
        investedValue: investedVal,
        totalPnl: pnl,
        totalPnlPercent: pnlPct,
        positionCount: updatedPositions.length,
        snapshotTime: new Date().toISOString(),
      });
      console.log(`[SimInvestment] Snapshot saved (hold): Total=$${totalVal.toFixed(2)}, P&L=$${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%)`);
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

        // Record trade
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

        // Remove position
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
      if (existingSymbols.includes(coin.symbol)) continue; // Already holding
      if (perMainstreamBudget < 10) continue; // Min $10 per position

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
      if (perMemeBudget < 5) continue; // Min $5 per meme position

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
    const now = new Date();
    const bjHour = (now.getUTCHours() + 8) % 24;
    const snapshotTime = bjHour < 14 ? '06:00' : '22:00';

    await db.insert(simSnapshots).values({
      totalValue: finalTotalValue,
      cashBalance: cashBalance,
      investedValue: investedValue,
      totalPnl: totalPnl,
      totalPnlPercent: totalPnlPercent,
      positionCount: finalPositions.length,
      snapshotTime: snapshotTime,
    });

    console.log(`[SimInvestment] Rebalance complete: Total=$${finalTotalValue.toFixed(2)}, Cash=$${cashBalance.toFixed(2)}, P&L=${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)} (${totalPnlPercent >= 0 ? '+' : ''}${totalPnlPercent.toFixed(2)}%)`);

  } catch (err: any) {
    console.error('[SimInvestment] Rebalance failed:', err?.message);
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
  const snapshots = db ? await db.select().from(simSnapshots).orderBy(desc(simSnapshots.id)).limit(30) : [];

  const activeConfig = config[0];
  const investedValue = positions.reduce((sum: number, p: any) => sum + p.currentValue, 0);
  const lastSnapshot = snapshots[0];
  const cashBalance = lastSnapshot?.cashBalance ?? (activeConfig?.initialCapital ?? INITIAL_CAPITAL);
  const totalValue = cashBalance + investedValue;
  const totalPnl = totalValue - (activeConfig?.initialCapital ?? INITIAL_CAPITAL);
  const totalPnlPercent = ((totalPnl) / (activeConfig?.initialCapital ?? INITIAL_CAPITAL)) * 100;

  return {
    config: {
      initialCapital: activeConfig?.initialCapital ?? INITIAL_CAPITAL,
      startDate: activeConfig?.startDate?.toISOString() ?? new Date().toISOString(),
      isActive: !!activeConfig?.isActive,
    },
    summary: {
      totalValue,
      cashBalance,
      investedValue,
      totalPnl,
      totalPnlPercent,
      positionCount: positions.length,
      lastUpdateTime: lastSnapshot?.createdAt?.toISOString() ?? '',
    },
    positions: positions.map((p: any) => ({
      symbol: p.symbol,
      name: p.name,
      category: p.category,
      entryPrice: p.entryPrice,
      currentPrice: p.currentPrice,
      quantity: p.quantity,
      costBasis: p.costBasis,
      currentValue: p.currentValue,
      pnl: p.pnl,
      pnlPercent: p.pnlPercent,
      weight: p.weight,
    })),
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
  };
}

// ===================================================================
// Scheduler — 每天6:00和22:00（北京时间）运行
// UTC 22:00 = 北京 06:00, UTC 14:00 = 北京 22:00
// ===================================================================
export function startSimInvestmentScheduler() {
  // Run initial rebalance 30s after startup (after crypto data loads)
  setTimeout(async () => {
    console.log('[SimInvestment] Initial rebalance starting...');
    await runSimRebalance();
  }, 30_000);

  // Check every 10 minutes if it's time to rebalance
  setInterval(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    // UTC 22:00 = Beijing 06:00, UTC 14:00 = Beijing 22:00
    // Run within the first 10 minutes of each target hour
    if ((utcHour === 22 || utcHour === 14) && utcMinute < 10) {
      console.log(`[SimInvestment] Scheduled rebalance at UTC ${utcHour}:${utcMinute.toString().padStart(2, '0')}`);
      runSimRebalance();
    }
  }, 10 * 60 * 1000); // Check every 10 minutes

  console.log('[SimInvestment] Scheduler registered: initial in 30s, then at 06:00 & 22:00 Beijing time');
}
