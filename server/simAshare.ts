// ===================================================================
// Simulated A-Share Investment Engine — 模拟A股投资系统
// ¥1,000,000 初始本金，根据A股策略模型选股+调仓
// 每天上午9:00（北京时间）更新策略
// 选股原则和交易原则与模拟数字货币投资一致
// ===================================================================

import { getDb } from "./db";
import {
  simAshareConfig,
  simAsharePortfolio,
  simAshareTrades,
  simAshareSnapshots,
} from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { getLatestRecommendations } from "./db";
import { runStrategyForMarket, STOCK_UNIVERSE, type StockDef } from "./strategyEngine";

const INITIAL_CAPITAL = 1_000_000; // ¥1,000,000 CNY

// ===================================================================
// Types
// ===================================================================
export interface SimAsharePortfolioData {
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
    strategy: string;
  };
  positions: Array<{
    symbol: string;
    name: string;
    category: string;
    industry: string;
    entryPrice: number;
    currentPrice: number;
    quantity: number;
    costBasis: number;
    currentValue: number;
    pnl: number;
    pnlPercent: number;
    weight: number;
    score: number;
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
    strategy: string;
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
  const existing = await db
    .select()
    .from(simAshareConfig)
    .where(eq(simAshareConfig.isActive, 1))
    .limit(1);
  if (existing.length > 0) return existing[0];

  // Create new config
  await db.insert(simAshareConfig).values({
    initialCapital: INITIAL_CAPITAL,
    isActive: 1,
  });
  const created = await db
    .select()
    .from(simAshareConfig)
    .where(eq(simAshareConfig.isActive, 1))
    .limit(1);
  return created[0];
}

// ===================================================================
// Allocation strategy — mirrors crypto sim logic
// Based on market sentiment (advanceRatio from strategy engine)
// ===================================================================
interface AllocationResult {
  blueChipPct: number;   // 蓝筹股配置比例 (like mainstream in crypto)
  growthPct: number;      // 成长股配置比例 (like meme in crypto)
  cashPct: number;        // 现金比例
  strategy: string;       // 策略名称
}

function calculateAllocation(advanceRatio: number, marketState: string): AllocationResult {
  // Mirror the crypto BTC dominance logic:
  // High advance ratio = bullish → more growth stocks
  // Low advance ratio = bearish → more blue chips + cash
  if (marketState === 'bearish' || advanceRatio < 35) {
    // Defensive: 50% blue chip, 10% growth, 40% cash
    return { blueChipPct: 0.50, growthPct: 0.10, cashPct: 0.40, strategy: '防御模式' };
  } else if (marketState === 'slightly_bearish' || advanceRatio < 45) {
    // Conservative: 45% blue chip, 20% growth, 35% cash
    return { blueChipPct: 0.45, growthPct: 0.20, cashPct: 0.35, strategy: '保守模式' };
  } else if (marketState === 'neutral' || advanceRatio < 55) {
    // Balanced: 40% blue chip, 30% growth, 30% cash
    return { blueChipPct: 0.40, growthPct: 0.30, cashPct: 0.30, strategy: '均衡模式' };
  } else if (marketState === 'slightly_bullish' || advanceRatio < 65) {
    // Aggressive: 30% blue chip, 45% growth, 25% cash
    return { blueChipPct: 0.30, growthPct: 0.45, cashPct: 0.25, strategy: '进攻模式' };
  } else {
    // Full attack: 20% blue chip, 60% growth, 20% cash
    return { blueChipPct: 0.20, growthPct: 0.60, cashPct: 0.20, strategy: '全面进攻' };
  }
}

// ===================================================================
// Classify stocks into blue chip vs growth
// ===================================================================
const BLUE_CHIP_INDUSTRIES = new Set([
  '银行', '保险', '白酒', '电力', '煤炭', '石油', '通信',
  '家电', '食品', '乳业', '燃气', '建材', '钢铁',
]);

interface StockPick {
  symbol: string;
  name: string;
  industry: string;
  price: number;
  score: number;
  signal: string;
  changePercent: number;
  category: 'blueChip' | 'growth';
}

// ===================================================================
// Select stocks ONLY from core Top10 recommendations
// This ensures A-share sim portfolio buys match the Top10 display,
// demonstrating the accuracy and effectiveness of our stock picks.
// ===================================================================
async function getTopStocks(): Promise<{ blueChips: StockPick[]; growthStocks: StockPick[]; advanceRatio: number; marketState: string }> {
  let top10Stocks: StockPick[] = [];
  let advanceRatio = 50;
  let marketState = 'neutral';

  try {
    // 1. Get market sentiment from strategy engine
    const result = await runStrategyForMarket('cn');
    advanceRatio = result.sentiment.advanceRatio;
    marketState = result.sentiment.marketState;

    // 2. ONLY use the Top10 recommendations from database
    //    These are the same stocks shown in the "核心推荐TOP10" panel
    const dbRecs = await getLatestRecommendations('cn');
    if (dbRecs.length > 0) {
      // Take only the top 10 (sorted by score descending in DB)
      top10Stocks = dbRecs.slice(0, 10).map(r => ({
        symbol: r.symbol,
        name: r.nameZh,
        industry: r.industry || '',
        price: r.price,
        score: r.score,
        signal: r.signal,
        changePercent: r.changePercent,
        category: BLUE_CHIP_INDUSTRIES.has(r.industry || '') ? 'blueChip' as const : 'growth' as const,
      }));
      console.log(`[SimAshare] Using Top10 recommendations: ${top10Stocks.map(s => s.name).join(', ')}`);
    }

    // 3. If DB has no recommendations yet, use fresh strategy results (top 10 only)
    if (top10Stocks.length === 0 && result.stocks.length > 0) {
      top10Stocks = result.stocks.slice(0, 10).map(s => ({
        symbol: s.symbol,
        name: s.nameZh,
        industry: s.industry,
        price: s.price,
        score: s.score,
        signal: s.signal,
        changePercent: s.changePercent,
        category: BLUE_CHIP_INDUSTRIES.has(s.industry) ? 'blueChip' : 'growth',
      }));
      console.log(`[SimAshare] Using fresh strategy Top10: ${top10Stocks.map(s => s.name).join(', ')}`);
    }
  } catch (err: any) {
    console.error('[SimAshare] Failed to get Top10 data:', err?.message);
  }

  // Fallback: if no Top10 available, pick a few from STOCK_UNIVERSE
  if (top10Stocks.length === 0) {
    const cnStocks = STOCK_UNIVERSE.cn || [];
    top10Stocks = cnStocks.slice(0, 10).map(s => ({
      symbol: s.symbol,
      name: s.nameZh,
      industry: s.industry,
      price: 0,
      score: 60,
      signal: 'hold',
      changePercent: 0,
      category: BLUE_CHIP_INDUSTRIES.has(s.industry) ? 'blueChip' as const : 'growth' as const,
    }));
  }

  // Sort by score descending
  top10Stocks.sort((a, b) => b.score - a.score);

  // Split into blue chip and growth from the Top10
  const blueChips = top10Stocks.filter(s => s.category === 'blueChip');
  const growthStocks = top10Stocks.filter(s => s.category === 'growth');

  return { blueChips, growthStocks, advanceRatio, marketState };
}

// ===================================================================
// Fetch current price for a symbol via Yahoo Finance
// ===================================================================
async function fetchCurrentPrice(symbol: string): Promise<number> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (resp.status !== 200) return 0;
    const data = await resp.json();
    const quote = data?.quoteResponse?.result?.[0];
    return quote?.regularMarketPrice || 0;
  } catch {
    return 0;
  }
}

// ===================================================================
// Main rebalance logic — runs at 9:00 Beijing time daily
// ===================================================================
export async function runAshareRebalance(): Promise<void> {
  console.log('[SimAshare] Starting A-share rebalance...');

  try {
    const db = await getDb();
    if (!db) {
      console.error('[SimAshare] No database connection');
      return;
    }

    // 1. Get or create config
    const config = await getOrCreateConfig();
    if (!config) {
      console.error('[SimAshare] Failed to get/create config');
      return;
    }

    // 2. Get top stocks from strategy engine
    const { blueChips, growthStocks, advanceRatio, marketState } = await getTopStocks();
    console.log(`[SimAshare] Market state: ${marketState}, advance ratio: ${advanceRatio.toFixed(1)}%`);
    console.log(`[SimAshare] Blue chips: ${blueChips.map(s => s.name).join(', ')}`);
    console.log(`[SimAshare] Growth stocks: ${growthStocks.map(s => s.name).join(', ')}`);

    // 3. Calculate allocation
    const allocation = calculateAllocation(advanceRatio, marketState);
    console.log(`[SimAshare] Strategy: ${allocation.strategy}`);

    // 4. Get current positions
    const currentPositions = await db.select().from(simAsharePortfolio);

    // 5. Calculate current cash balance
    let cashBalance: number;
    if (currentPositions.length === 0) {
      cashBalance = config.initialCapital;
    } else {
      const lastSnapshot = await db
        .select()
        .from(simAshareSnapshots)
        .orderBy(desc(simAshareSnapshots.id))
        .limit(1);
      cashBalance = lastSnapshot.length > 0 ? lastSnapshot[0].cashBalance : config.initialCapital;
    }

    // 6. Update current prices for existing positions
    for (const pos of currentPositions) {
      const currentPrice = await fetchCurrentPrice(pos.symbol);
      if (currentPrice > 0) {
        const newValue = pos.quantity * currentPrice;
        const newPnl = newValue - pos.costBasis;
        const newPnlPct = pos.costBasis > 0 ? (newPnl / pos.costBasis) * 100 : 0;
        await db
          .update(simAsharePortfolio)
          .set({
            currentPrice,
            currentValue: newValue,
            pnl: newPnl,
            pnlPercent: newPnlPct,
          })
          .where(eq(simAsharePortfolio.id, pos.id));
      }
      // Small delay to avoid Yahoo throttling
      await new Promise(r => setTimeout(r, 200));
    }

    // 7. Calculate total portfolio value
    const updatedPositions = await db.select().from(simAsharePortfolio);
    const investedValue = updatedPositions.reduce((sum: number, p) => sum + p.currentValue, 0);
    const totalPortfolioValue = cashBalance + investedValue;

    const targetBlueChipValue = totalPortfolioValue * allocation.blueChipPct;
    const targetGrowthValue = totalPortfolioValue * allocation.growthPct;

    // 8. Safety: if no stocks selected but we have positions, keep them
    if (blueChips.length === 0 && growthStocks.length === 0 && currentPositions.length > 0) {
      console.log('[SimAshare] No stocks selected (data may be limited), keeping existing positions');
      const pnl = totalPortfolioValue - config.initialCapital;
      const pnlPct = config.initialCapital > 0 ? (pnl / config.initialCapital) * 100 : 0;
      await db.insert(simAshareSnapshots).values({
        totalValue: totalPortfolioValue,
        cashBalance,
        investedValue,
        totalPnl: pnl,
        totalPnlPercent: pnlPct,
        positionCount: updatedPositions.length,
        strategy: allocation.strategy,
        snapshotTime: '09:00',
      });
      console.log(`[SimAshare] Snapshot saved (hold): Total=¥${totalPortfolioValue.toFixed(2)}`);
      return;
    }

    // 9. Sell positions that are no longer in top picks or have >8% loss
    const topSymbols = [...blueChips, ...growthStocks].map(s => s.symbol);
    const refreshedPositions = await db.select().from(simAsharePortfolio);

    for (const pos of refreshedPositions) {
      const pnlPct = pos.costBasis > 0
        ? ((pos.currentValue - pos.costBasis) / pos.costBasis) * 100
        : 0;

      const shouldSell = !topSymbols.includes(pos.symbol) || pnlPct < -8;

      if (shouldSell) {
        const sellValue = pos.currentValue;
        cashBalance += sellValue;

        await db.insert(simAshareTrades).values({
          symbol: pos.symbol,
          name: pos.name,
          action: 'SELL',
          price: pos.currentPrice,
          quantity: pos.quantity,
          value: sellValue,
          reason: pnlPct < -8
            ? `止损卖出 (亏损${pnlPct.toFixed(1)}%)`
            : `调仓卖出 (不在TOP推荐中)`,
        });

        await db.delete(simAsharePortfolio).where(eq(simAsharePortfolio.id, pos.id));
        console.log(`[SimAshare] SELL ${pos.name}(${pos.symbol}): ${pos.quantity}股 @ ¥${pos.currentPrice.toFixed(2)} = ¥${sellValue.toFixed(2)}`);
      }
    }

    // 10. Buy new positions
    const remainingPositions = await db.select().from(simAsharePortfolio);
    const existingSymbols = remainingPositions.map(p => p.symbol);

    // Buy blue chips
    const blueChipBudget = Math.min(cashBalance * 0.6, targetBlueChipValue);
    const perBlueChipBudget = blueChips.length > 0 ? blueChipBudget / blueChips.length : 0;

    for (const stock of blueChips) {
      if (existingSymbols.includes(stock.symbol)) continue;
      if (perBlueChipBudget < 5000) continue; // Min ¥5000 per position

      let price = stock.price;
      if (price <= 0) {
        price = await fetchCurrentPrice(stock.symbol);
        await new Promise(r => setTimeout(r, 200));
      }
      if (price <= 0) continue;

      // A-shares trade in lots of 100
      const lots = Math.floor(perBlueChipBudget / (price * 100));
      if (lots < 1) continue;
      const quantity = lots * 100;
      const buyValue = quantity * price;

      if (cashBalance < buyValue) continue;
      cashBalance -= buyValue;

      await db.insert(simAsharePortfolio).values({
        symbol: stock.symbol,
        name: stock.name,
        category: 'blueChip',
        industry: stock.industry,
        entryPrice: price,
        currentPrice: price,
        quantity,
        costBasis: buyValue,
        currentValue: buyValue,
        pnl: 0,
        pnlPercent: 0,
        weight: (buyValue / totalPortfolioValue) * 100,
        score: stock.score,
      });

      await db.insert(simAshareTrades).values({
        symbol: stock.symbol,
        name: stock.name,
        action: 'BUY',
        price,
        quantity,
        value: buyValue,
        reason: `${allocation.strategy} — 蓝筹股配置 (评分${stock.score})`,
      });

      console.log(`[SimAshare] BUY ${stock.name}: ${quantity}股 @ ¥${price.toFixed(2)} = ¥${buyValue.toFixed(2)}`);
    }

    // Buy growth stocks
    const growthBudget = Math.min(cashBalance * 0.8, targetGrowthValue);
    const perGrowthBudget = growthStocks.length > 0 ? growthBudget / growthStocks.length : 0;

    for (const stock of growthStocks) {
      if (existingSymbols.includes(stock.symbol)) continue;
      if (perGrowthBudget < 3000) continue; // Min ¥3000 per position

      let price = stock.price;
      if (price <= 0) {
        price = await fetchCurrentPrice(stock.symbol);
        await new Promise(r => setTimeout(r, 200));
      }
      if (price <= 0) continue;

      const lots = Math.floor(perGrowthBudget / (price * 100));
      if (lots < 1) continue;
      const quantity = lots * 100;
      const buyValue = quantity * price;

      if (cashBalance < buyValue) continue;
      cashBalance -= buyValue;

      await db.insert(simAsharePortfolio).values({
        symbol: stock.symbol,
        name: stock.name,
        category: 'growth',
        industry: stock.industry,
        entryPrice: price,
        currentPrice: price,
        quantity,
        costBasis: buyValue,
        currentValue: buyValue,
        pnl: 0,
        pnlPercent: 0,
        weight: (buyValue / totalPortfolioValue) * 100,
        score: stock.score,
      });

      await db.insert(simAshareTrades).values({
        symbol: stock.symbol,
        name: stock.name,
        action: 'BUY',
        price,
        quantity,
        value: buyValue,
        reason: `${allocation.strategy} — 成长股配置 (评分${stock.score})`,
      });

      console.log(`[SimAshare] BUY ${stock.name}: ${quantity}股 @ ¥${price.toFixed(2)} = ¥${buyValue.toFixed(2)}`);
    }

    // 11. Update all position weights
    const finalPositions = await db.select().from(simAsharePortfolio);
    const finalInvestedValue = finalPositions.reduce((sum: number, p) => sum + p.currentValue, 0);
    const finalTotalValue = cashBalance + finalInvestedValue;

    for (const pos of finalPositions) {
      await db
        .update(simAsharePortfolio)
        .set({ weight: (pos.currentValue / finalTotalValue) * 100 })
        .where(eq(simAsharePortfolio.id, pos.id));
    }

    // 12. Save snapshot
    const totalPnl = finalTotalValue - config.initialCapital;
    const totalPnlPercent = (totalPnl / config.initialCapital) * 100;

    await db.insert(simAshareSnapshots).values({
      totalValue: finalTotalValue,
      cashBalance,
      investedValue: finalInvestedValue,
      totalPnl,
      totalPnlPercent,
      positionCount: finalPositions.length,
      strategy: allocation.strategy,
      snapshotTime: '09:00',
    });

    console.log(
      `[SimAshare] Rebalance complete: Total=¥${finalTotalValue.toFixed(2)}, Cash=¥${cashBalance.toFixed(2)}, P&L=${totalPnl >= 0 ? '+' : ''}¥${totalPnl.toFixed(2)} (${totalPnlPercent >= 0 ? '+' : ''}${totalPnlPercent.toFixed(2)}%)`
    );
  } catch (err: any) {
    console.error('[SimAshare] Rebalance failed:', err?.message);
  }
}

// ===================================================================
// Get portfolio data for frontend
// ===================================================================
export async function getSimAshareData(): Promise<SimAsharePortfolioData> {
  const db = await getDb();
  const config = db
    ? await db.select().from(simAshareConfig).where(eq(simAshareConfig.isActive, 1)).limit(1)
    : [];
  const positions = db ? await db.select().from(simAsharePortfolio) : [];
  const trades = db
    ? await db.select().from(simAshareTrades).orderBy(desc(simAshareTrades.id)).limit(50)
    : [];
  const snapshots = db
    ? await db.select().from(simAshareSnapshots).orderBy(desc(simAshareSnapshots.id)).limit(30)
    : [];

  const activeConfig = config[0];
  const investedValue = positions.reduce((sum: number, p) => sum + p.currentValue, 0);
  const lastSnapshot = snapshots[0];
  const cashBalance = lastSnapshot?.cashBalance ?? (activeConfig?.initialCapital ?? INITIAL_CAPITAL);
  const totalValue = cashBalance + investedValue;
  const totalPnl = totalValue - (activeConfig?.initialCapital ?? INITIAL_CAPITAL);
  const totalPnlPercent = (totalPnl / (activeConfig?.initialCapital ?? INITIAL_CAPITAL)) * 100;

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
      strategy: lastSnapshot?.strategy ?? '初始化中',
    },
    positions: positions.map(p => ({
      symbol: p.symbol,
      name: p.name,
      category: p.category,
      industry: p.industry || '',
      entryPrice: p.entryPrice,
      currentPrice: p.currentPrice,
      quantity: p.quantity,
      costBasis: p.costBasis,
      currentValue: p.currentValue,
      pnl: p.pnl,
      pnlPercent: p.pnlPercent,
      weight: p.weight,
      score: p.score || 0,
    })),
    trades: trades.map(t => ({
      symbol: t.symbol,
      name: t.name,
      action: t.action,
      price: t.price,
      quantity: t.quantity,
      value: t.value,
      reason: t.reason ?? '',
      time: t.createdAt?.toISOString() ?? '',
    })),
    snapshots: snapshots.map(s => ({
      totalValue: s.totalValue,
      totalPnl: s.totalPnl,
      totalPnlPercent: s.totalPnlPercent,
      strategy: s.strategy || '',
      snapshotTime: s.snapshotTime,
      createdAt: s.createdAt?.toISOString() ?? '',
    })),
  };
}

// ===================================================================
// Scheduler — 每天9:00（北京时间）运行 = UTC 01:00
// ===================================================================
export function startSimAshareScheduler() {
  // Run initial rebalance 45s after startup (after strategy engine loads)
  setTimeout(async () => {
    console.log('[SimAshare] Initial rebalance starting...');
    await runAshareRebalance();
  }, 45_000);

  // Check every 10 minutes if it's time to rebalance
  setInterval(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    // UTC 01:00 = Beijing 09:00
    // Run within the first 10 minutes of the target hour
    if (utcHour === 1 && utcMinute < 10) {
      console.log(`[SimAshare] Scheduled rebalance at UTC ${utcHour}:${utcMinute.toString().padStart(2, '0')} (Beijing 09:00)`);
      runAshareRebalance();
    }
  }, 10 * 60 * 1000); // Check every 10 minutes

  console.log('[SimAshare] Scheduler registered: initial in 45s, then daily at 09:00 Beijing time');
}
