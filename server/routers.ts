import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

// ===================================================================
// 市场数据缓存 — 60秒TTL
// ===================================================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 60_000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ===================================================================
// 直接调用 Yahoo Finance API（服务端无CORS限制）
// ===================================================================
async function fetchYahooChart(symbol: string, interval = '5m', range = '1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (resp.status !== 200) {
    throw new Error(`Yahoo API HTTP ${resp.status}`);
  }
  return resp.json();
}

// ===================================================================
// 指数符号映射
// ===================================================================
const INDEX_SYMBOLS = [
  { symbol: '000001.SS', name: '上证指数' },
  { symbol: '399001.SZ', name: '深证成指' },
  { symbol: '399006.SZ', name: '创业板指' },
  { symbol: '^HSI', name: '恒生指数' },
  { symbol: '^GSPC', name: '标普500' },
  { symbol: 'BTC-USD', name: '比特币' },
];

// ===================================================================
// 获取单个指数数据
// ===================================================================
async function fetchIndexData(symbol: string, name: string) {
  try {
    const result = await fetchYahooChart(symbol, '5m', '1d');
    if (!result?.chart?.result?.[0]) return null;

    const data = result.chart.result[0];
    const meta = data.meta;
    const timestamps = data.timestamp || [];
    const quotes = data.indicators?.quote?.[0] || {};

    const chartData: { time: number; value: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const closeVal = quotes.close?.[i];
      if (closeVal != null && !isNaN(closeVal)) {
        chartData.push({ time: timestamps[i], value: closeVal });
      }
    }

    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    const highs = (quotes.high || []).filter((v: any) => v != null && !isNaN(v));
    const lows = (quotes.low || []).filter((v: any) => v != null && !isNaN(v));

    return {
      symbol,
      name,
      price,
      change,
      changePercent,
      high: meta.regularMarketDayHigh || (highs.length ? Math.max(...highs) : price),
      low: meta.regularMarketDayLow || (lows.length ? Math.min(...lows) : price),
      volume: meta.regularMarketVolume || 0,
      chartData,
    };
  } catch (err: any) {
    console.error(`[Market] Failed to fetch ${symbol}:`, err?.message || err);
    return null;
  }
}

// ===================================================================
// 推荐股票列表
// ===================================================================
const STOCK_SYMBOLS = [
  { symbol: '600036.SS', name: '招商银行', industry: '银行', reason: '银行龙头，ROE领先' },
  { symbol: '601318.SS', name: '中国平安', industry: '保险', reason: '保险龙头，综合金融' },
  { symbol: '600519.SS', name: '贵州茅台', industry: '白酒', reason: '消费之王，护城河深' },
  { symbol: '000858.SZ', name: '五粮液', industry: '白酒', reason: '白酒双雄，品牌溢价' },
  { symbol: '300750.SZ', name: '宁德时代', industry: '新能源', reason: '动力电池全球龙头' },
  { symbol: '601012.SS', name: '隆基绿能', industry: '光伏', reason: '光伏龙头，技术领先' },
  { symbol: '000333.SZ', name: '美的集团', industry: '家电', reason: '白电龙头，全球布局' },
  { symbol: '002594.SZ', name: '比亚迪', industry: '新能源车', reason: '新能源车销量王' },
  { symbol: '600900.SS', name: '长江电力', industry: '电力', reason: '水电龙头，稳定分红' },
  { symbol: '601899.SS', name: '紫金矿业', industry: '有色', reason: '矿业龙头，资源为王' },
];

async function fetchStockData(stock: typeof STOCK_SYMBOLS[0], rank: number) {
  try {
    const result = await fetchYahooChart(stock.symbol, '1d', '5d');
    if (!result?.chart?.result?.[0]) return null;

    const meta = result.chart.result[0].meta;
    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    const score = Math.min(99, Math.max(50, Math.round(75 + changePercent * 5 + Math.random() * 10)));
    const signal = changePercent > 1.5 ? '买入' : changePercent > 0 ? '增持' : changePercent > -1 ? '观望' : '减持';
    const capitalFlow = (Math.random() - 0.3) * 15;

    return {
      rank,
      name: stock.name,
      code: stock.symbol.replace('.SS', '').replace('.SZ', ''),
      industry: stock.industry,
      price,
      change,
      changePercent,
      score,
      signal,
      capitalFlow,
      reason: stock.reason,
    };
  } catch (err: any) {
    console.error(`[Market] Failed to fetch stock ${stock.symbol}:`, err?.message || err);
    return null;
  }
}

// ===================================================================
// tRPC 路由定义
// ===================================================================
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  market: router({
    // 获取所有指数数据
    indices: publicProcedure.query(async () => {
      const cacheKey = 'indices';
      const cached = getCached<any[]>(cacheKey);
      if (cached) return { data: cached, isLive: true, fromCache: true };

      const results = await Promise.allSettled(
        INDEX_SYMBOLS.map((idx) => fetchIndexData(idx.symbol, idx.name))
      );

      const data = results
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter(Boolean);

      if (data.length > 0) {
        setCache(cacheKey, data);
      }

      return { data, isLive: data.length > 0, fromCache: false };
    }),

    // 获取推荐股票数据
    recommendations: publicProcedure.query(async () => {
      const cacheKey = 'recommendations';
      const cached = getCached<any[]>(cacheKey);
      if (cached) return { data: cached, isLive: true };

      const results = await Promise.allSettled(
        STOCK_SYMBOLS.map((stock, i) => fetchStockData(stock, i + 1))
      );

      const data = results
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter(Boolean);

      // Sort by score
      data.sort((a: any, b: any) => (b?.score || 0) - (a?.score || 0));
      data.forEach((item: any, i: number) => { item.rank = i + 1; });

      if (data.length > 0) {
        setCache(cacheKey, data);
      }

      return { data, isLive: data.length > 0 };
    }),

    // 获取单个股票详情
    stockDetail: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        const cacheKey = `stock-${input.symbol}`;
        const cached = getCached<any>(cacheKey);
        if (cached) return cached;

        const result = await fetchYahooChart(input.symbol, '5m', '1d');
        const chartResult = result?.chart?.result?.[0] || null;

        if (chartResult) {
          setCache(cacheKey, chartResult);
        }

        return chartResult;
      }),
  }),
});

export type AppRouter = typeof appRouter;
