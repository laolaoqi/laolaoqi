import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

// ===================================================================
// 缓存系统
// ===================================================================
interface CacheEntry<T> { data: T; timestamp: number; }
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, ttl: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttl) return entry.data as T;
  return null;
}
function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

const INDEX_CACHE_TTL = 60_000;       // 指数 60秒
const RECS_CACHE_TTL = 30 * 60_000;   // 推荐 30分钟

// ===================================================================
// Yahoo Finance API
// ===================================================================
async function fetchYahooChart(symbol: string, interval = '5m', range = '1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    signal: AbortSignal.timeout(10000),
  });
  if (resp.status !== 200) throw new Error(`Yahoo API HTTP ${resp.status}`);
  return resp.json();
}

// ===================================================================
// 市场配置 — 按市场分类
// ===================================================================
type MarketId = 'cn' | 'hk' | 'us' | 'crypto';

interface IndexConfig { symbol: string; nameZh: string; nameEn: string; nameJa: string; nameKo: string; nameAr: string; }
interface StockConfig { symbol: string; nameZh: string; nameEn: string; industry: string; reasonZh: string; reasonEn: string; }

const MARKET_INDICES: Record<MarketId, IndexConfig[]> = {
  cn: [
    { symbol: '000001.SS', nameZh: '上证指数', nameEn: 'SSE Composite', nameJa: '上海総合', nameKo: '상하이종합', nameAr: 'مؤشر شنغهاي' },
    { symbol: '399001.SZ', nameZh: '深证成指', nameEn: 'SZSE Component', nameJa: '深セン成分', nameKo: '선전성분', nameAr: 'مؤشر شنتشن' },
    { symbol: '399006.SZ', nameZh: '创业板指', nameEn: 'ChiNext', nameJa: '創業板', nameKo: '창업판', nameAr: 'تشاينكست' },
  ],
  hk: [
    { symbol: '^HSI', nameZh: '恒生指数', nameEn: 'Hang Seng', nameJa: 'ハンセン', nameKo: '항셍', nameAr: 'هانغ سنغ' },
    { symbol: '^HSCE', nameZh: '国企指数', nameEn: 'H-Share', nameJa: 'H株', nameKo: 'H주', nameAr: 'مؤشر H' },
    { symbol: '3032.HK', nameZh: '恒生科技ETF', nameEn: 'HS Tech ETF', nameJa: 'HSテックETF', nameKo: 'HS테크ETF', nameAr: 'HS تك ETF' },
  ],
  us: [
    { symbol: '^GSPC', nameZh: '标普500', nameEn: 'S&P 500', nameJa: 'S&P 500', nameKo: 'S&P 500', nameAr: 'S&P 500' },
    { symbol: '^DJI', nameZh: '道琼斯', nameEn: 'Dow Jones', nameJa: 'ダウ', nameKo: '다우존스', nameAr: 'داو جونز' },
    { symbol: '^IXIC', nameZh: '纳斯达克', nameEn: 'NASDAQ', nameJa: 'ナスダック', nameKo: '나스닥', nameAr: 'ناسداك' },
  ],
  crypto: [
    { symbol: 'BTC-USD', nameZh: '比特币', nameEn: 'Bitcoin', nameJa: 'ビットコイン', nameKo: '비트코인', nameAr: 'بيتكوين' },
    { symbol: 'ETH-USD', nameZh: '以太坊', nameEn: 'Ethereum', nameJa: 'イーサリアム', nameKo: '이더리움', nameAr: 'إيثريوم' },
    { symbol: 'SOL-USD', nameZh: '索拉纳', nameEn: 'Solana', nameJa: 'ソラナ', nameKo: '솔라나', nameAr: 'سولانا' },
  ],
};

const MARKET_STOCKS: Record<MarketId, StockConfig[]> = {
  cn: [
    { symbol: '600036.SS', nameZh: '招商银行', nameEn: 'CMB', industry: '银行', reasonZh: '银行龙头，ROE领先', reasonEn: 'Leading bank, top ROE' },
    { symbol: '601318.SS', nameZh: '中国平安', nameEn: 'Ping An', industry: '保险', reasonZh: '保险龙头，综合金融', reasonEn: 'Insurance leader' },
    { symbol: '600519.SS', nameZh: '贵州茅台', nameEn: 'Moutai', industry: '白酒', reasonZh: '消费之王，护城河深', reasonEn: 'Consumer king, deep moat' },
    { symbol: '000858.SZ', nameZh: '五粮液', nameEn: 'Wuliangye', industry: '白酒', reasonZh: '白酒双雄，品牌溢价', reasonEn: 'Premium liquor brand' },
    { symbol: '300750.SZ', nameZh: '宁德时代', nameEn: 'CATL', industry: '新能源', reasonZh: '动力电池全球龙头', reasonEn: 'Global battery leader' },
    { symbol: '601012.SS', nameZh: '隆基绿能', nameEn: 'LONGi', industry: '光伏', reasonZh: '光伏龙头，技术领先', reasonEn: 'Solar tech leader' },
    { symbol: '000333.SZ', nameZh: '美的集团', nameEn: 'Midea', industry: '家电', reasonZh: '白电龙头，全球布局', reasonEn: 'Home appliance giant' },
    { symbol: '002594.SZ', nameZh: '比亚迪', nameEn: 'BYD', industry: '新能源车', reasonZh: '新能源车销量王', reasonEn: 'EV sales champion' },
    { symbol: '600900.SS', nameZh: '长江电力', nameEn: 'CYPC', industry: '电力', reasonZh: '水电龙头，稳定分红', reasonEn: 'Hydro power, stable dividend' },
    { symbol: '601899.SS', nameZh: '紫金矿业', nameEn: 'Zijin Mining', industry: '有色', reasonZh: '矿业龙头，资源为王', reasonEn: 'Mining leader' },
  ],
  hk: [
    { symbol: '0700.HK', nameZh: '腾讯控股', nameEn: 'Tencent', industry: '互联网', reasonZh: '社交+游戏双引擎', reasonEn: 'Social + gaming engine' },
    { symbol: '9988.HK', nameZh: '阿里巴巴', nameEn: 'Alibaba', industry: '电商', reasonZh: '电商龙头，云计算增长', reasonEn: 'E-commerce + cloud' },
    { symbol: '3690.HK', nameZh: '美团', nameEn: 'Meituan', industry: '本地生活', reasonZh: '本地生活服务龙头', reasonEn: 'Local services leader' },
    { symbol: '1810.HK', nameZh: '小米集团', nameEn: 'Xiaomi', industry: '消费电子', reasonZh: 'IoT生态+汽车新故事', reasonEn: 'IoT + EV new story' },
    { symbol: '2318.HK', nameZh: '中国平安', nameEn: 'Ping An', industry: '金融', reasonZh: '综合金融龙头', reasonEn: 'Financial conglomerate' },
    { symbol: '0941.HK', nameZh: '中国移动', nameEn: 'China Mobile', industry: '通信', reasonZh: '高股息+算力概念', reasonEn: 'High dividend + AI compute' },
    { symbol: '1024.HK', nameZh: '快手', nameEn: 'Kuaishou', industry: '短视频', reasonZh: '短视频+电商增长', reasonEn: 'Short video + e-commerce' },
    { symbol: '9618.HK', nameZh: '京东集团', nameEn: 'JD.com', industry: '电商', reasonZh: '自营电商+物流壁垒', reasonEn: 'Self-operated + logistics' },
    { symbol: '0388.HK', nameZh: '港交所', nameEn: 'HKEX', industry: '金融', reasonZh: '交易所垄断地位', reasonEn: 'Exchange monopoly' },
    { symbol: '2020.HK', nameZh: '安踏体育', nameEn: 'Anta Sports', industry: '运动', reasonZh: '运动品牌龙头', reasonEn: 'Sportswear leader' },
  ],
  us: [
    { symbol: 'AAPL', nameZh: '苹果', nameEn: 'Apple', industry: '科技', reasonZh: '生态系统无可替代', reasonEn: 'Irreplaceable ecosystem' },
    { symbol: 'MSFT', nameZh: '微软', nameEn: 'Microsoft', industry: '软件', reasonZh: 'AI+云双轮驱动', reasonEn: 'AI + Cloud dual engine' },
    { symbol: 'NVDA', nameZh: '英伟达', nameEn: 'NVIDIA', industry: '半导体', reasonZh: 'AI芯片绝对龙头', reasonEn: 'AI chip absolute leader' },
    { symbol: 'GOOGL', nameZh: '谷歌', nameEn: 'Alphabet', industry: '互联网', reasonZh: '搜索+AI+云计算', reasonEn: 'Search + AI + Cloud' },
    { symbol: 'AMZN', nameZh: '亚马逊', nameEn: 'Amazon', industry: '电商', reasonZh: 'AWS+电商双引擎', reasonEn: 'AWS + E-commerce' },
    { symbol: 'META', nameZh: 'Meta', nameEn: 'Meta', industry: '社交', reasonZh: '社交广告+元宇宙', reasonEn: 'Social ads + Metaverse' },
    { symbol: 'TSLA', nameZh: '特斯拉', nameEn: 'Tesla', industry: '新能源车', reasonZh: 'EV+自动驾驶+储能', reasonEn: 'EV + FSD + Energy' },
    { symbol: 'TSM', nameZh: '台积电', nameEn: 'TSMC', industry: '半导体', reasonZh: '晶圆代工绝对垄断', reasonEn: 'Foundry monopoly' },
    { symbol: 'BRK-B', nameZh: '伯克希尔', nameEn: 'Berkshire', industry: '综合', reasonZh: '巴菲特价值投资标杆', reasonEn: 'Buffett value benchmark' },
    { symbol: 'LLY', nameZh: '礼来', nameEn: 'Eli Lilly', industry: '医药', reasonZh: 'GLP-1减肥药龙头', reasonEn: 'GLP-1 obesity drug leader' },
  ],
  crypto: [
    { symbol: 'BTC-USD', nameZh: '比特币', nameEn: 'Bitcoin', industry: 'L1', reasonZh: '数字黄金，共识最强', reasonEn: 'Digital gold, strongest consensus' },
    { symbol: 'ETH-USD', nameZh: '以太坊', nameEn: 'Ethereum', industry: 'L1', reasonZh: '智能合约平台龙头', reasonEn: 'Smart contract platform leader' },
    { symbol: 'SOL-USD', nameZh: '索拉纳', nameEn: 'Solana', industry: 'L1', reasonZh: '高性能公链，生态爆发', reasonEn: 'High-perf chain, ecosystem boom' },
    { symbol: 'BNB-USD', nameZh: '币安币', nameEn: 'BNB', industry: '交易所', reasonZh: '最大交易所平台币', reasonEn: 'Largest exchange token' },
    { symbol: 'XRP-USD', nameZh: '瑞波', nameEn: 'XRP', industry: '支付', reasonZh: '跨境支付解决方案', reasonEn: 'Cross-border payment' },
    { symbol: 'ADA-USD', nameZh: '卡尔达诺', nameEn: 'Cardano', industry: 'L1', reasonZh: '学术派公链', reasonEn: 'Academic blockchain' },
    { symbol: 'DOGE-USD', nameZh: '狗狗币', nameEn: 'Dogecoin', industry: 'Meme', reasonZh: 'Meme文化图腾', reasonEn: 'Meme culture icon' },
    { symbol: 'AVAX-USD', nameZh: '雪崩', nameEn: 'Avalanche', industry: 'L1', reasonZh: '子网架构创新', reasonEn: 'Subnet architecture innovation' },
    { symbol: 'DOT-USD', nameZh: '波卡', nameEn: 'Polkadot', industry: '跨链', reasonZh: '跨链互操作龙头', reasonEn: 'Cross-chain interop leader' },
    { symbol: 'LINK-USD', nameZh: '预言机', nameEn: 'Chainlink', industry: '预言机', reasonZh: '去中心化预言机龙头', reasonEn: 'Decentralized oracle leader' },
  ],
};

// ===================================================================
// 数据获取函数
// ===================================================================
async function fetchIndexData(cfg: IndexConfig) {
  try {
    const result = await fetchYahooChart(cfg.symbol, '5m', '1d');
    if (!result?.chart?.result?.[0]) return null;
    const data = result.chart.result[0];
    const meta = data.meta;
    const timestamps = data.timestamp || [];
    const quotes = data.indicators?.quote?.[0] || {};
    const chartData: { time: number; value: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const closeVal = quotes.close?.[i];
      if (closeVal != null && !isNaN(closeVal)) chartData.push({ time: timestamps[i], value: closeVal });
    }
    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;
    const highs = (quotes.high || []).filter((v: any) => v != null && !isNaN(v));
    const lows = (quotes.low || []).filter((v: any) => v != null && !isNaN(v));
    return {
      symbol: cfg.symbol,
      nameZh: cfg.nameZh, nameEn: cfg.nameEn, nameJa: cfg.nameJa, nameKo: cfg.nameKo, nameAr: cfg.nameAr,
      price, change, changePercent,
      high: meta.regularMarketDayHigh || (highs.length ? Math.max(...highs) : price),
      low: meta.regularMarketDayLow || (lows.length ? Math.min(...lows) : price),
      volume: meta.regularMarketVolume || 0,
      chartData,
    };
  } catch (err: any) {
    console.error(`[Market] Failed to fetch ${cfg.symbol}:`, err?.message || err);
    return null;
  }
}

async function fetchStockData(stock: StockConfig, rank: number) {
  try {
    const result = await fetchYahooChart(stock.symbol, '1d', '5d');
    if (!result?.chart?.result?.[0]) return null;
    const meta = result.chart.result[0].meta;
    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;
    const score = Math.min(99, Math.max(50, Math.round(75 + changePercent * 5 + Math.random() * 10)));
    const signal = changePercent > 1.5 ? 'buy' : changePercent > 0 ? 'add' : changePercent > -1 ? 'hold' : 'reduce';
    const capitalFlow = (Math.random() - 0.3) * 15;
    return {
      rank, symbol: stock.symbol,
      nameZh: stock.nameZh, nameEn: stock.nameEn,
      code: stock.symbol.replace('.SS', '').replace('.SZ', '').replace('.HK', ''),
      industry: stock.industry,
      price, change, changePercent, score, signal, capitalFlow,
      reasonZh: stock.reasonZh, reasonEn: stock.reasonEn,
    };
  } catch (err: any) {
    console.error(`[Market] Failed to fetch stock ${stock.symbol}:`, err?.message || err);
    return null;
  }
}

// ===================================================================
// IP 地理位置检测语言
// ===================================================================
async function detectLanguageFromIP(ip: string): Promise<string> {
  try {
    if (!ip || ip === '127.0.0.1' || ip === '::1') return 'zh';
    const resp = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, { signal: AbortSignal.timeout(3000) });
    if (resp.status !== 200) return 'zh';
    const data = await resp.json();
    const cc = data.countryCode;
    if (!cc) return 'zh';
    const langMap: Record<string, string> = {
      CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh',
      JP: 'ja', KR: 'ko',
      SA: 'ar', AE: 'ar', EG: 'ar', IQ: 'ar', QA: 'ar', KW: 'ar', BH: 'ar', OM: 'ar', JO: 'ar', LB: 'ar', SY: 'ar', YE: 'ar', LY: 'ar', TN: 'ar', DZ: 'ar', MA: 'ar', SD: 'ar',
    };
    return langMap[cc] || 'en';
  } catch { return 'zh'; }
}

// ===================================================================
// tRPC 路由
// ===================================================================
const marketIdSchema = z.enum(['cn', 'hk', 'us', 'crypto']);

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

  // 语言检测
  locale: router({
    detect: publicProcedure.query(async ({ ctx }) => {
      const forwarded = ctx.req.headers['x-forwarded-for'];
      const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : ctx.req.socket?.remoteAddress || '';
      const lang = await detectLanguageFromIP(ip);
      return { lang };
    }),
  }),

  market: router({
    // 获取指定市场的指数数据
    indices: publicProcedure
      .input(z.object({ market: marketIdSchema }).optional())
      .query(async ({ input }) => {
        const marketId = input?.market;
        // 如果没指定市场，返回所有市场的指数
        const markets = marketId ? [marketId] : (['cn', 'hk', 'us', 'crypto'] as MarketId[]);
        const cacheKey = `indices-${markets.join(',')}`;
        const cached = getCached<any>(cacheKey, INDEX_CACHE_TTL);
        if (cached) return { ...cached, fromCache: true };

        const allConfigs = markets.flatMap(m => MARKET_INDICES[m].map(c => ({ ...c, market: m })));
        const results = await Promise.allSettled(allConfigs.map(cfg => fetchIndexData(cfg)));
        const data = results.map((r, i) => {
          if (r.status === 'fulfilled' && r.value) return { ...r.value, market: allConfigs[i].market };
          return null;
        }).filter(Boolean);

        const result = { data, isLive: data.length > 0, fromCache: false };
        if (data.length > 0) setCache(cacheKey, result);
        return result;
      }),

    // 获取指定市场的推荐股票
    recommendations: publicProcedure
      .input(z.object({ market: marketIdSchema }))
      .query(async ({ input }) => {
        const cacheKey = `recs-${input.market}`;
        const cached = getCached<any>(cacheKey, RECS_CACHE_TTL);
        if (cached) return { ...cached, fromCache: true };

        const stocks = MARKET_STOCKS[input.market];
        const results = await Promise.allSettled(stocks.map((s, i) => fetchStockData(s, i + 1)));
        const data = results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
        data.sort((a: any, b: any) => (b?.score || 0) - (a?.score || 0));
        data.forEach((item: any, i: number) => { item.rank = i + 1; });

        const result = { data, isLive: data.length > 0, market: input.market };
        if (data.length > 0) setCache(cacheKey, result);
        return result;
      }),

    // 获取单个股票详情
    stockDetail: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        const cacheKey = `stock-${input.symbol}`;
        const cached = getCached<any>(cacheKey, INDEX_CACHE_TTL);
        if (cached) return cached;
        const result = await fetchYahooChart(input.symbol, '5m', '1d');
        const chartResult = result?.chart?.result?.[0] || null;
        if (chartResult) setCache(cacheKey, chartResult);
        return chartResult;
      }),
  }),
});

export type AppRouter = typeof appRouter;
