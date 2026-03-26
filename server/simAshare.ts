// ===================================================================
// Simulated A-Share Investment Engine — 模拟A股投资系统
// ¥1,000,000 初始本金，根据A股策略模型选股+调仓
// 每天上午9:00（北京时间）更新策略
// 周度盈亏：周一9:00开始 → 周五15:00结束，每周重新计算
// 选股原则和交易原则与模拟数字货币投资一致
// ===================================================================

import { getDb } from "./db";
import {
  simAshareConfig,
  simAsharePortfolio,
  simAshareTrades,
  simAshareSnapshots,
  simAshareWeekly,
} from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { getLatestRecommendations } from "./db";
import { runStrategyForMarket, STOCK_UNIVERSE, type StockDef } from "./strategyEngine";

const INITIAL_CAPITAL = 1_000_000; // ¥1,000,000 CNY
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ===================================================================
// Types
// ===================================================================
export interface WeeklyPnlData {
  weekLabel: string;
  weekStartDate: string;
  weekEndDate: string;
  startValue: number;
  endValue: number | null;
  weeklyPnl: number | null;
  weeklyPnlPercent: number | null;
  isComplete: boolean;
  strategy: string;
}

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
  weeklyPnl: WeeklyPnlData | null;       // Current week P&L
  weeklyHistory: WeeklyPnlData[];         // Past weeks P&L history
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
// Sina Finance API — accurate A-share real-time data
// ===================================================================
function yahooToSina(symbol: string): string {
  if (symbol.endsWith('.SS')) return 'sh' + symbol.replace('.SS', '');
  if (symbol.endsWith('.SZ')) return 'sz' + symbol.replace('.SZ', '');
  return symbol;
}

async function fetchSinaBatchPrices(symbols: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const BATCH = 40;
  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH);
    const sinaSymbols = batch.map(yahooToSina);
    try {
      const url = `https://hq.sinajs.cn/list=${sinaSymbols.join(',')}`;
      const resp = await fetch(url, {
        headers: { 'Referer': 'https://finance.sina.com.cn', 'User-Agent': UA },
        signal: AbortSignal.timeout(8000),
      });
      if (resp.status !== 200) continue;
      const buf = await resp.arrayBuffer();
      const text = new TextDecoder('gbk').decode(buf);
      const lines = text.split('\n').filter(l => l.trim());
      for (let j = 0; j < lines.length; j++) {
        const m = lines[j].match(/hq_str_(\w+)="([^"]*)"/);
        if (!m || !m[2]) continue;
        const parts = m[2].split(',');
        if (parts.length < 32) continue;
        const price = parseFloat(parts[3]) || 0;
        if (price > 0 && j < batch.length) {
          result.set(batch[j], price);
        }
      }
    } catch (err: any) {
      console.error(`[SimAshare/Sina] Batch fetch failed:`, err?.message);
    }
    if (i + BATCH < symbols.length) await new Promise(r => setTimeout(r, 200));
  }
  return result;
}

// Fetch current price for a single symbol via Sina (primary) with Yahoo fallback
async function fetchCurrentPrice(symbol: string): Promise<number> {
  // Try Sina first for A-shares
  if (symbol.endsWith('.SS') || symbol.endsWith('.SZ')) {
    const prices = await fetchSinaBatchPrices([symbol]);
    const price = prices.get(symbol);
    if (price && price > 0) return price;
  }
  // Yahoo fallback
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA },
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

// Batch update all position prices via Sina
async function batchUpdatePositionPrices(db: any, positions: any[]): Promise<void> {
  if (positions.length === 0) return;
  const symbols = positions.map(p => p.symbol);
  const prices = await fetchSinaBatchPrices(symbols);
  
  for (const pos of positions) {
    const currentPrice = prices.get(pos.symbol);
    if (currentPrice && currentPrice > 0) {
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
  }
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
// ===================================================================
interface AllocationResult {
  blueChipPct: number;
  growthPct: number;
  cashPct: number;
  strategy: string;
}

function calculateAllocation(advanceRatio: number, marketState: string): AllocationResult {
  if (marketState === 'bearish' || advanceRatio < 35) {
    return { blueChipPct: 0.50, growthPct: 0.10, cashPct: 0.40, strategy: '防御模式' };
  } else if (marketState === 'slightly_bearish' || advanceRatio < 45) {
    return { blueChipPct: 0.45, growthPct: 0.20, cashPct: 0.35, strategy: '保守模式' };
  } else if (marketState === 'neutral' || advanceRatio < 55) {
    return { blueChipPct: 0.40, growthPct: 0.30, cashPct: 0.30, strategy: '均衡模式' };
  } else if (marketState === 'slightly_bullish' || advanceRatio < 65) {
    return { blueChipPct: 0.30, growthPct: 0.45, cashPct: 0.25, strategy: '进攻模式' };
  } else {
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
// ===================================================================
async function getTopStocks(): Promise<{ blueChips: StockPick[]; growthStocks: StockPick[]; advanceRatio: number; marketState: string }> {
  let top10Stocks: StockPick[] = [];
  let advanceRatio = 50;
  let marketState = 'neutral';

  try {
    const result = await runStrategyForMarket('cn');
    advanceRatio = result.sentiment.advanceRatio;
    marketState = result.sentiment.marketState;

    const dbRecs = await getLatestRecommendations('cn');
    if (dbRecs.length > 0) {
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

  top10Stocks.sort((a, b) => b.score - a.score);
  const blueChips = top10Stocks.filter(s => s.category === 'blueChip');
  const growthStocks = top10Stocks.filter(s => s.category === 'growth');

  return { blueChips, growthStocks, advanceRatio, marketState };
}

// ===================================================================
// Weekly P&L helpers
// ===================================================================
function getBeijingDate(): Date {
  // Get current time in Beijing timezone (UTC+8)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 8 * 3600000);
}

function getWeekLabel(date: Date): string {
  // ISO week number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function getFridayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -2 : 5); // Friday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Record weekly start (Mon 9:00) or end (Fri 15:00)
async function recordWeeklySnapshot(
  totalValue: number,
  cashBalance: number,
  positionCount: number,
  strategy: string,
  type: 'start' | 'end'
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const bjDate = getBeijingDate();
  const weekLabel = getWeekLabel(bjDate);
  const mondayDate = getMondayOfWeek(bjDate);
  const fridayDate = getFridayOfWeek(bjDate);

  // Check if this week's record exists
  const existing = await db
    .select()
    .from(simAshareWeekly)
    .where(eq(simAshareWeekly.weekLabel, weekLabel))
    .limit(1);

  if (type === 'start') {
    if (existing.length === 0) {
      // Create new week record
      await db.insert(simAshareWeekly).values({
        weekLabel,
        weekStartDate: mondayDate,
        weekEndDate: fridayDate,
        startValue: totalValue,
        startCash: cashBalance,
        startPositionCount: positionCount,
        strategy,
        isComplete: 0,
      });
      console.log(`[SimAshare] Weekly start recorded: ${weekLabel}, value=¥${totalValue.toFixed(2)}`);
    } else if (!existing[0].isComplete) {
      // Update start value if week not complete (re-run on Monday)
      await db
        .update(simAshareWeekly)
        .set({
          startValue: totalValue,
          startCash: cashBalance,
          startPositionCount: positionCount,
          strategy,
        })
        .where(eq(simAshareWeekly.id, existing[0].id));
      console.log(`[SimAshare] Weekly start updated: ${weekLabel}, value=¥${totalValue.toFixed(2)}`);
    }
  } else if (type === 'end') {
    if (existing.length > 0 && !existing[0].isComplete) {
      const weeklyPnl = totalValue - existing[0].startValue;
      const weeklyPnlPercent = existing[0].startValue > 0
        ? (weeklyPnl / existing[0].startValue) * 100
        : 0;

      await db
        .update(simAshareWeekly)
        .set({
          endValue: totalValue,
          endCash: cashBalance,
          endPositionCount: positionCount,
          weeklyPnl,
          weeklyPnlPercent,
          isComplete: 1,
          strategy,
        })
        .where(eq(simAshareWeekly.id, existing[0].id));
      console.log(`[SimAshare] Weekly end recorded: ${weekLabel}, P&L=¥${weeklyPnl.toFixed(2)} (${weeklyPnlPercent.toFixed(2)}%)`);
    } else if (existing.length === 0) {
      // No start record, create a complete record with same start/end
      await db.insert(simAshareWeekly).values({
        weekLabel,
        weekStartDate: mondayDate,
        weekEndDate: fridayDate,
        startValue: totalValue,
        endValue: totalValue,
        startCash: cashBalance,
        endCash: cashBalance,
        startPositionCount: positionCount,
        endPositionCount: positionCount,
        weeklyPnl: 0,
        weeklyPnlPercent: 0,
        strategy,
        isComplete: 1,
      });
    }
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

    const config = await getOrCreateConfig();
    if (!config) {
      console.error('[SimAshare] Failed to get/create config');
      return;
    }

    const { blueChips, growthStocks, advanceRatio, marketState } = await getTopStocks();
    console.log(`[SimAshare] Market state: ${marketState}, advance ratio: ${advanceRatio.toFixed(1)}%`);
    console.log(`[SimAshare] Blue chips: ${blueChips.map(s => s.name).join(', ')}`);
    console.log(`[SimAshare] Growth stocks: ${growthStocks.map(s => s.name).join(', ')}`);

    const allocation = calculateAllocation(advanceRatio, marketState);
    console.log(`[SimAshare] Strategy: ${allocation.strategy}`);

    const currentPositions = await db.select().from(simAsharePortfolio);

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

    // Batch update prices via Sina API (much faster than one-by-one Yahoo)
    await batchUpdatePositionPrices(db, currentPositions);

    const updatedPositions = await db.select().from(simAsharePortfolio);
    const investedValue = updatedPositions.reduce((sum: number, p) => sum + p.currentValue, 0);
    const totalPortfolioValue = cashBalance + investedValue;

    const targetBlueChipValue = totalPortfolioValue * allocation.blueChipPct;
    const targetGrowthValue = totalPortfolioValue * allocation.growthPct;

    // Check if it's Monday (record weekly start)
    const bjDate = getBeijingDate();
    const dayOfWeek = bjDate.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri

    if (dayOfWeek === 1) {
      // Monday 9:00 — record weekly start BEFORE rebalance
      await recordWeeklySnapshot(totalPortfolioValue, cashBalance, updatedPositions.length, allocation.strategy, 'start');
    }

    // Safety: if no stocks selected but we have positions, keep them
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
      return;
    }

    // Sell positions that are no longer in top picks or have >8% loss
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
        console.log(`[SimAshare] SELL ${pos.name}: ${pos.quantity}股 @ ¥${pos.currentPrice.toFixed(2)}`);
      }
    }

    // Buy new positions
    const remainingPositions = await db.select().from(simAsharePortfolio);
    const existingSymbols = remainingPositions.map(p => p.symbol);

    // Buy blue chips
    const blueChipBudget = Math.min(cashBalance * 0.6, targetBlueChipValue);
    const perBlueChipBudget = blueChips.length > 0 ? blueChipBudget / blueChips.length : 0;

    for (const stock of blueChips) {
      if (existingSymbols.includes(stock.symbol)) continue;
      if (perBlueChipBudget < 5000) continue;

      let price = stock.price;
      if (price <= 0) {
        price = await fetchCurrentPrice(stock.symbol);
      }
      if (price <= 0) continue;

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

      console.log(`[SimAshare] BUY ${stock.name}: ${quantity}股 @ ¥${price.toFixed(2)}`);
    }

    // Buy growth stocks
    const growthBudget = Math.min(cashBalance * 0.8, targetGrowthValue);
    const perGrowthBudget = growthStocks.length > 0 ? growthBudget / growthStocks.length : 0;

    for (const stock of growthStocks) {
      if (existingSymbols.includes(stock.symbol)) continue;
      if (perGrowthBudget < 3000) continue;

      let price = stock.price;
      if (price <= 0) {
        price = await fetchCurrentPrice(stock.symbol);
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

      console.log(`[SimAshare] BUY ${stock.name}: ${quantity}股 @ ¥${price.toFixed(2)}`);
    }

    // Update all position weights
    const finalPositions = await db.select().from(simAsharePortfolio);
    const finalInvestedValue = finalPositions.reduce((sum: number, p) => sum + p.currentValue, 0);
    const finalTotalValue = cashBalance + finalInvestedValue;

    for (const pos of finalPositions) {
      await db
        .update(simAsharePortfolio)
        .set({ weight: (pos.currentValue / finalTotalValue) * 100 })
        .where(eq(simAsharePortfolio.id, pos.id));
    }

    // Save snapshot
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
// Friday 15:00 close — record weekly end snapshot
// ===================================================================
export async function runFridayClose(): Promise<void> {
  console.log('[SimAshare] Friday 15:00 close — recording weekly end...');

  try {
    const db = await getDb();
    if (!db) return;

    const config = await getOrCreateConfig();
    if (!config) return;

    const positions = await db.select().from(simAsharePortfolio);

    // Batch update prices via Sina
    await batchUpdatePositionPrices(db, positions);

    const updatedPositions = await db.select().from(simAsharePortfolio);
    const investedValue = updatedPositions.reduce((sum: number, p) => sum + p.currentValue, 0);

    const lastSnapshot = await db
      .select()
      .from(simAshareSnapshots)
      .orderBy(desc(simAshareSnapshots.id))
      .limit(1);
    const cashBalance = lastSnapshot.length > 0 ? lastSnapshot[0].cashBalance : config.initialCapital;
    const totalValue = cashBalance + investedValue;

    // Record weekly end
    const allocation = calculateAllocation(50, 'neutral'); // Use neutral for end-of-week
    await recordWeeklySnapshot(totalValue, cashBalance, updatedPositions.length, allocation.strategy, 'end');

    // Save a 15:00 snapshot
    const totalPnl = totalValue - config.initialCapital;
    const totalPnlPercent = (totalPnl / config.initialCapital) * 100;

    await db.insert(simAshareSnapshots).values({
      totalValue,
      cashBalance,
      investedValue,
      totalPnl,
      totalPnlPercent,
      positionCount: updatedPositions.length,
      strategy: '周五收盘',
      snapshotTime: '15:00',
    });

    console.log(`[SimAshare] Friday close: Total=¥${totalValue.toFixed(2)}, Weekly P&L recorded`);
  } catch (err: any) {
    console.error('[SimAshare] Friday close failed:', err?.message);
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

  // Get weekly P&L data
  const weeklyRecords = db
    ? await db.select().from(simAshareWeekly).orderBy(desc(simAshareWeekly.id)).limit(12)
    : [];

  const activeConfig = config[0];
  const investedValue = positions.reduce((sum: number, p) => sum + p.currentValue, 0);
  const lastSnapshot = snapshots[0];
  const cashBalance = lastSnapshot?.cashBalance ?? (activeConfig?.initialCapital ?? INITIAL_CAPITAL);
  const totalValue = cashBalance + investedValue;
  const totalPnl = totalValue - (activeConfig?.initialCapital ?? INITIAL_CAPITAL);
  const totalPnlPercent = (totalPnl / (activeConfig?.initialCapital ?? INITIAL_CAPITAL)) * 100;

  // Current week (first incomplete or most recent)
  const currentWeek = weeklyRecords.find(w => !w.isComplete) || weeklyRecords[0] || null;
  const weeklyPnl: WeeklyPnlData | null = currentWeek ? {
    weekLabel: currentWeek.weekLabel,
    weekStartDate: currentWeek.weekStartDate,
    weekEndDate: currentWeek.weekEndDate,
    startValue: currentWeek.startValue,
    endValue: currentWeek.endValue,
    weeklyPnl: currentWeek.isComplete
      ? currentWeek.weeklyPnl
      : totalValue - currentWeek.startValue, // Live calculation for current week
    weeklyPnlPercent: currentWeek.isComplete
      ? currentWeek.weeklyPnlPercent
      : currentWeek.startValue > 0
        ? ((totalValue - currentWeek.startValue) / currentWeek.startValue) * 100
        : 0,
    isComplete: !!currentWeek.isComplete,
    strategy: currentWeek.strategy || '',
  } : null;

  // Past completed weeks
  const weeklyHistory: WeeklyPnlData[] = weeklyRecords
    .filter(w => w.isComplete)
    .map(w => ({
      weekLabel: w.weekLabel,
      weekStartDate: w.weekStartDate,
      weekEndDate: w.weekEndDate,
      startValue: w.startValue,
      endValue: w.endValue,
      weeklyPnl: w.weeklyPnl,
      weeklyPnlPercent: w.weeklyPnlPercent,
      isComplete: true,
      strategy: w.strategy || '',
    }));

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
    weeklyPnl,
    weeklyHistory,
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
// Scheduler
// 每天9:00（北京时间=UTC 01:00）运行调仓
// 周五15:00（北京时间=UTC 07:00）记录周末终值
// ===================================================================
export function startSimAshareScheduler() {
  // Run initial rebalance 45s after startup
  setTimeout(async () => {
    console.log('[SimAshare] Initial rebalance starting...');
    await runAshareRebalance();
  }, 45_000);

  // Check every 10 minutes
  setInterval(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 5=Fri

    // UTC 01:00 = Beijing 09:00 — daily rebalance (Mon-Fri)
    if (utcHour === 1 && utcMinute < 10 && utcDay >= 1 && utcDay <= 5) {
      console.log(`[SimAshare] Scheduled rebalance (Beijing 09:00)`);
      runAshareRebalance();
    }

    // UTC 07:00 = Beijing 15:00 — Friday close
    if (utcHour === 7 && utcMinute < 10 && utcDay === 5) {
      console.log(`[SimAshare] Friday 15:00 close`);
      runFridayClose();
    }
  }, 10 * 60 * 1000);

  console.log('[SimAshare] Scheduler registered: daily 09:00 rebalance + Friday 15:00 close');
}
