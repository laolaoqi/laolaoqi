// ===================================================================
// Crypto Investment Board — 主流币 vs 空气币/永续合约 投资看板
// 后端定时任务：Binance(主) + CoinGecko(辅) 数据抓取 → DB持久化 + 内存缓存
// Binance: 实时价格/涨跌幅/成交额（无限流量，3594+交易对）
// CoinGecko: Logo + Sparkline7d + Binance未覆盖币种的价格
// ===================================================================

import { getDb } from './db';
import { cryptoBoardCache } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const CACHE_KEY = 'latest';

// ===================================================================
// Types
// ===================================================================
export interface CryptoCoin {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
  rank?: number;
  logo?: string;           // Logo URL from CoinGecko
  sparkline7d?: number[];  // 7-day price history for mini chart
}

export interface CryptoBoardData {
  mainstream: CryptoCoin[];
  meme: CryptoCoin[];
  btcDominance: number;
  totalMarketCap: number;
  advice: string;
  adviceEn: string;
  timestamp: number;
}

// ===================================================================
// In-memory cache (fast path)
// ===================================================================
let cachedBoard: CryptoBoardData | null = null;

export function getCryptoBoardData(): CryptoBoardData | null {
  return cachedBoard;
}

// ===================================================================
// DB persistence — save/load cache to survive restarts + rate limits
// ===================================================================
async function saveCacheToDB(data: CryptoBoardData): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const json = JSON.stringify(data);
    // Upsert: try insert, on duplicate key update
    await db.insert(cryptoBoardCache)
      .values({ dataKey: CACHE_KEY, jsonData: json })
      .onDuplicateKeyUpdate({ set: { jsonData: json } });
    console.log('[CryptoBoard] Data persisted to DB');
  } catch (err: any) {
    console.error('[CryptoBoard] Failed to save cache to DB:', err?.message);
  }
}

export async function loadCacheFromDB(): Promise<CryptoBoardData | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(cryptoBoardCache).where(eq(cryptoBoardCache.dataKey, CACHE_KEY)).limit(1);
    if (rows.length > 0) {
      const data = JSON.parse(rows[0].jsonData) as CryptoBoardData;
      console.log(`[CryptoBoard] Loaded cache from DB (${data.mainstream.length} mainstream, ${data.meme.length} meme, age=${Math.round((Date.now() - data.timestamp) / 60000)}min)`);
      return data;
    }
  } catch (err: any) {
    console.error('[CryptoBoard] Failed to load cache from DB:', err?.message);
  }
  return null;
}

// ===================================================================
// Coin definitions — with Binance symbol mapping
// ===================================================================
interface CoinDef {
  id: string;              // CoinGecko API ID
  symbol: string;          // Display symbol (e.g. TRUMP)
  name: string;            // Display name
  category?: string;       // 'binance-alpha' | 'tron-chain' | 'perp'
  binanceSymbol?: string;  // Binance trading pair (e.g. "BTCUSDT"), undefined = not on Binance
}

// 主流币前10 — all available on Binance
const MAINSTREAM_DEFS: CoinDef[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', binanceSymbol: 'BTCUSDT' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', binanceSymbol: 'ETHUSDT' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', binanceSymbol: 'SOLUSDT' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', binanceSymbol: 'BNBUSDT' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', binanceSymbol: 'XRPUSDT' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', binanceSymbol: 'ADAUSDT' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', binanceSymbol: 'AVAXUSDT' },
  { id: 'tron', symbol: 'TRX', name: 'TRON', binanceSymbol: 'TRXUSDT' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', binanceSymbol: 'DOGEUSDT' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', binanceSymbol: 'LINKUSDT' },
];

// 空气币/永续合约 — 用户指定列表
const MEME_DEFS: CoinDef[] = [
  // 永续合约
  { id: 'official-trump', symbol: 'TRUMP', name: 'Official Trump', category: 'perp', binanceSymbol: 'TRUMPUSDT' },
  { id: 'worldcoin-wld', symbol: 'WLD', name: 'Worldcoin', category: 'perp', binanceSymbol: 'WLDUSDT' },
  { id: 'hyperliquid', symbol: 'HYPE', name: 'Hyperliquid', category: 'perp' },  // NOT on Binance
  { id: 'aster-2', symbol: 'ASTER', name: 'Aster', category: 'perp', binanceSymbol: 'ASTERUSDT' },
  { id: 'myx-finance', symbol: 'MYX', name: 'MYX Finance', category: 'perp', binanceSymbol: 'MYXUSDT' },
  { id: 'chainopera-ai', symbol: 'COAI', name: 'ChainOpera AI', category: 'perp', binanceSymbol: 'COAIUSDT' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', category: 'perp', binanceSymbol: 'DOGEUSDT' },
  { id: 'callisto-network', symbol: 'CLO', name: 'Callisto', category: 'perp', binanceSymbol: 'CLOUSDT' },
  { id: 'pump-fun', symbol: 'PUMP', name: 'Pump.fun', category: 'perp', binanceSymbol: 'PUMPUSDT' },
  { id: 'sun-token', symbol: 'SUN', name: 'Sun Token', category: 'perp', binanceSymbol: 'SUNUSDT' },
  { id: 'deagentai', symbol: 'AIA', name: 'DeAgentAI', category: 'perp', binanceSymbol: 'AIAUSDT' },
  { id: 'tether-gold', symbol: 'XAU', name: 'Tether Gold', category: 'perp' },  // NOT on Binance (XAUTUSDT)
  { id: 'matrixdock-silver', symbol: 'XAG', name: 'Matrixdock Silver', category: 'perp', binanceSymbol: 'XAGUSDT' },
  { id: 'world-liberty-financial', symbol: 'WLFI', name: 'World Liberty Financial', category: 'perp', binanceSymbol: 'WLFIUSDT' },
  { id: 'lorenzo-protocol', symbol: 'BANK', name: 'Lorenzo Protocol', category: 'perp', binanceSymbol: 'BANKUSDT' },
  // Binance Alpha
  { id: 'dexlab-2', symbol: 'XLAB', name: 'Dexlab', category: 'binance-alpha', binanceSymbol: 'XLABUSDT' },
  { id: 'rwa-inc', symbol: 'RWA', name: 'RWA Inc.', category: 'binance-alpha', binanceSymbol: 'RWAUSDT' },
  { id: 'million', symbol: 'MM', name: 'Million', category: 'binance-alpha', binanceSymbol: 'MMUSDT' },
  { id: 'u', symbol: 'U', name: 'U', category: 'binance-alpha', binanceSymbol: 'UUSDT' },
  { id: 'pingpong', symbol: 'PINGPONG', name: 'PINGPONG', category: 'binance-alpha', binanceSymbol: 'PINGPONGUSDT' },
  // 波场链上
  { id: '', symbol: 'TRONLIFE', name: '波场人生', category: 'tron-chain' },
];

// ===================================================================
// Binance API — Primary data source (fast, unlimited)
// ===================================================================
interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

// Cache the full Binance ticker list (refreshed every fetch cycle)
let binanceTickerMap: Map<string, BinanceTicker> = new Map();

async function fetchBinanceAllTickers(): Promise<Map<string, BinanceTicker>> {
  try {
    const resp = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`Binance HTTP ${resp.status}`);
    const data: BinanceTicker[] = await resp.json();
    
    const map = new Map<string, BinanceTicker>();
    for (const t of data) {
      map.set(t.symbol, t);
    }
    
    console.log(`[CryptoBoard] Binance: ${data.length} tickers fetched`);
    binanceTickerMap = map;
    return map;
  } catch (err: any) {
    console.error('[CryptoBoard] Binance fetch failed:', err?.message);
    // Return previous cache if available
    return binanceTickerMap;
  }
}

function getBinancePrice(def: CoinDef, tickerMap: Map<string, BinanceTicker>): { price: number; change24h: number; volume24h: number } | null {
  if (!def.binanceSymbol) return null;
  const ticker = tickerMap.get(def.binanceSymbol);
  if (!ticker) return null;
  const price = parseFloat(ticker.lastPrice);
  const change = parseFloat(ticker.priceChangePercent);
  const volume = parseFloat(ticker.quoteVolume);
  if (isNaN(price) || price === 0) return null;
  return { price, change24h: change, volume24h: volume };
}

// ===================================================================
// CoinGecko — Fallback for prices + Logo/Sparkline enrichment
// ===================================================================
async function fetchWithRetry(url: string, retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(20000),
      });
      if (resp.status === 429) {
        console.warn(`[CryptoBoard] CoinGecko rate limited (429), attempt ${attempt + 1}/${retries + 1}`);
        if (attempt < retries) {
          await sleep(5000 * (attempt + 1));
          continue;
        }
        throw new Error('CoinGecko rate limited (429)');
      }
      if (!resp.ok) throw new Error(`CoinGecko HTTP ${resp.status}`);
      return await resp.json();
    } catch (err: any) {
      if (attempt < retries && !err.message?.includes('rate limited')) {
        await sleep(3000);
        continue;
      }
      throw err;
    }
  }
}

// Logo + Sparkline cache (updated less frequently than prices)
interface CoinEnrichment {
  logo: string;
  sparkline7d: number[];
  marketCap: number;
}
const enrichmentCache = new Map<string, CoinEnrichment>();
let lastEnrichmentFetch = 0;
const ENRICHMENT_TTL = 60 * 60 * 1000; // 1 hour — logos and sparklines don't change often

async function fetchCoinGeckoEnrichment(defs: CoinDef[]): Promise<void> {
  // Only refresh enrichment data every hour
  if (Date.now() - lastEnrichmentFetch < ENRICHMENT_TTL && enrichmentCache.size > 0) {
    console.log('[CryptoBoard] Enrichment cache still fresh, skipping CoinGecko fetch');
    return;
  }

  const cgDefs = defs.filter(d => d.id);
  if (cgDefs.length === 0) return;

  try {
    const idsParam = cgDefs.map(d => d.id).join(',');
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${idsParam}&order=market_cap_desc&per_page=50&page=1&sparkline=true`;
    const data: any[] = await fetchWithRetry(url);

    for (const d of data) {
      const rawSparkline = d.sparkline_in_7d?.price || [];
      const sparkline = downsampleSparkline(rawSparkline, 28);
      enrichmentCache.set(d.id, {
        logo: d.image || '',
        sparkline7d: sparkline,
        marketCap: d.market_cap || 0,
      });
    }

    lastEnrichmentFetch = Date.now();
    console.log(`[CryptoBoard] CoinGecko enrichment: ${data.length} coins (logos+sparklines) cached`);
  } catch (err: any) {
    console.warn('[CryptoBoard] CoinGecko enrichment fetch failed (non-critical):', err?.message);
    // Non-critical — we still have Binance prices
  }
}

// Fetch price from CoinGecko for coins NOT on Binance
async function fetchCoinGeckoPrices(defs: CoinDef[]): Promise<Map<string, { price: number; change24h: number; volume24h: number; marketCap: number }>> {
  const result = new Map<string, { price: number; change24h: number; volume24h: number; marketCap: number }>();
  const cgDefs = defs.filter(d => d.id && !d.binanceSymbol);
  if (cgDefs.length === 0) return result;

  try {
    const idsParam = cgDefs.map(d => d.id).join(',');
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${idsParam}&order=market_cap_desc&per_page=50&page=1&sparkline=false`;
    const data: any[] = await fetchWithRetry(url);

    for (const d of data) {
      result.set(d.id, {
        price: d.current_price || 0,
        change24h: d.price_change_percentage_24h || 0,
        volume24h: d.total_volume || 0,
        marketCap: d.market_cap || 0,
      });
    }
    console.log(`[CryptoBoard] CoinGecko fallback prices: ${data.length} coins (for non-Binance coins)`);
  } catch (err: any) {
    console.warn('[CryptoBoard] CoinGecko fallback price fetch failed:', err?.message);
  }

  return result;
}

function downsampleSparkline(data: number[], targetSize: number): number[] {
  if (!data || data.length === 0) return [];
  if (data.length <= targetSize) return data;
  const step = data.length / targetSize;
  const result: number[] = [];
  for (let i = 0; i < targetSize; i++) {
    result.push(data[Math.floor(i * step)]);
  }
  result.push(data[data.length - 1]);
  return result;
}

// ===================================================================
// Hybrid fetch: Binance (primary) + CoinGecko (fallback + enrichment)
// ===================================================================
async function fetchCoinsHybrid(defs: CoinDef[], binanceMap: Map<string, BinanceTicker>): Promise<CryptoCoin[]> {
  // Get CoinGecko prices for coins not on Binance
  const nonBinanceDefs = defs.filter(d => !d.binanceSymbol && d.id);
  const cgPrices = nonBinanceDefs.length > 0 ? await fetchCoinGeckoPrices(defs) : new Map();

  const coins: CryptoCoin[] = [];

  for (const def of defs) {
    // Try Binance first
    const binanceData = getBinancePrice(def, binanceMap);
    
    if (binanceData) {
      // Got price from Binance — enrich with CoinGecko logo/sparkline from cache
      const enrichment = enrichmentCache.get(def.id);
      coins.push({
        name: def.name,
        symbol: def.symbol,
        price: binanceData.price,
        change24h: binanceData.change24h,
        volume24h: binanceData.volume24h,
        marketCap: enrichment?.marketCap || 0,
        logo: enrichment?.logo || '',
        sparkline7d: enrichment?.sparkline7d || [],
        rank: 0,
      });
    } else if (def.id && cgPrices.has(def.id)) {
      // Fallback to CoinGecko price (for HYPE, XAU, etc.)
      const cg = cgPrices.get(def.id)!;
      const enrichment = enrichmentCache.get(def.id);
      coins.push({
        name: def.name,
        symbol: def.symbol,
        price: cg.price,
        change24h: cg.change24h,
        volume24h: cg.volume24h,
        marketCap: cg.marketCap || enrichment?.marketCap || 0,
        logo: enrichment?.logo || '',
        sparkline7d: enrichment?.sparkline7d || [],
        rank: 0,
      });
    } else {
      // No data available (TRONLIFE or failed fetch)
      coins.push({
        name: def.name, symbol: def.symbol,
        price: 0, change24h: 0, marketCap: 0, volume24h: 0,
        logo: '', sparkline7d: [], rank: 0,
      });
    }
  }

  return coins;
}

// ===================================================================
// Fetch functions (using hybrid approach)
// ===================================================================
async function fetchMainstreamCoins(binanceMap: Map<string, BinanceTicker>): Promise<CryptoCoin[]> {
  const coins = await fetchCoinsHybrid(MAINSTREAM_DEFS, binanceMap);
  return coins.map((c, i) => ({ ...c, rank: i + 1 }));
}

async function fetchMemeCoins(binanceMap: Map<string, BinanceTicker>): Promise<CryptoCoin[]> {
  const coins = await fetchCoinsHybrid(MEME_DEFS, binanceMap);
  const withPrice = coins.filter(c => c.price > 0).length;
  console.log(`[CryptoBoard] Meme coins fetched: ${withPrice}/${MEME_DEFS.length} with price data`);
  return coins.map((c, i) => ({ ...c, rank: i + 1 }));
}

async function fetchGlobalData(): Promise<{ btcDominance: number; totalMarketCap: number }> {
  try {
    const data = await fetchWithRetry('https://api.coingecko.com/api/v3/global');
    return {
      btcDominance: data.data?.market_cap_percentage?.btc || 57.9,
      totalMarketCap: data.data?.total_market_cap?.usd || 0,
    };
  } catch (err: any) {
    console.error('[CryptoBoard] Failed to fetch global data:', err?.message);
    return {
      btcDominance: cachedBoard?.btcDominance || 57.9,
      totalMarketCap: cachedBoard?.totalMarketCap || 0,
    };
  }
}

// ===================================================================
// 投资建议生成（基于BTC主导率）
// ===================================================================
function generateAdvice(btcDominance: number): { zh: string; en: string } {
  let zh: string;
  let en: string;

  if (btcDominance > 60) {
    zh = `🛡️ 防御为主：BTC主导率${btcDominance.toFixed(1)}%偏高，资金集中在主流币。优先配置BTC/ETH/SOL，空气永续合约观望为主，不建议重仓。`;
    en = `🛡️ Defensive: BTC dominance ${btcDominance.toFixed(1)}% is high. Focus on BTC/ETH/SOL. Meme perps should be observed, not heavily invested.`;
  } else if (btcDominance > 55) {
    zh = `⚖️ 过渡期：BTC主导率${btcDominance.toFixed(1)}%，主流持仓为主 + 小仓位试水空气永续（TRUMP/WLD/HYPE等），严格止损。`;
    en = `⚖️ Transition: BTC dominance ${btcDominance.toFixed(1)}%. Hold mainstream + small positions in meme perps (TRUMP/WLD/HYPE). Strict stop-loss.`;
  } else if (btcDominance > 50) {
    zh = `🔥 山寨季临近：BTC主导率${btcDominance.toFixed(1)}%下降，资金开始流向山寨。可适当加仓空气永续合约，但控制总仓位不超过30%。`;
    en = `🔥 Alt season approaching: BTC dominance ${btcDominance.toFixed(1)}% declining. Increase meme perp positions, but keep total under 30%.`;
  } else {
    zh = `🚀 空气季：BTC主导率${btcDominance.toFixed(1)}%低位，山寨币全面爆发。追永续合约故事（TRUMP/HYPE等），但别全仓！风险极高！`;
    en = `🚀 Meme season: BTC dominance ${btcDominance.toFixed(1)}% low. Chase meme perp narratives (TRUMP/HYPE), but NEVER go all-in! Extreme risk!`;
  }

  return { zh, en };
}

// ===================================================================
// Helper: check if fetched data has meaningful content
// ===================================================================
function hasRealData(coins: CryptoCoin[]): boolean {
  return coins.some(c => c.price > 0);
}

// ===================================================================
// Main Job Runner — Binance first, CoinGecko enrichment
// ===================================================================
let isRunning = false;

export async function runCryptoBoardJob(): Promise<CryptoBoardData | null> {
  if (isRunning) {
    console.log('[CryptoBoard] Job already running, skipping...');
    return cachedBoard;
  }
  isRunning = true;

  try {
    console.log('[CryptoBoard] Starting data fetch (Binance primary + CoinGecko enrichment)...');

    // Step 1: Fetch ALL Binance tickers in one call (fast, ~2s)
    const binanceMap = await fetchBinanceAllTickers();
    const binanceOk = binanceMap.size > 0;
    console.log(`[CryptoBoard] Binance: ${binanceMap.size} tickers available`);

    // Step 2: Fetch CoinGecko enrichment (logos + sparklines) — only every hour
    const allDefs = [...MAINSTREAM_DEFS, ...MEME_DEFS];
    await fetchCoinGeckoEnrichment(allDefs);

    // Step 3: Fetch global data (BTC dominance) from CoinGecko
    const globalData = await fetchGlobalData();

    // Step 4: Fetch mainstream coins (Binance primary)
    const mainstream = await fetchMainstreamCoins(binanceMap);

    // Step 5: Fetch meme coins (Binance primary + CoinGecko fallback for HYPE/XAU)
    const memeCoins = await fetchMemeCoins(binanceMap);

    // Step 6: Generate advice
    const advice = generateAdvice(globalData.btcDominance);

    // Step 7: Determine if we got real data
    const mainstreamHasData = hasRealData(mainstream);
    const memeHasData = hasRealData(memeCoins);

    // If both lists failed, merge with DB cache
    if (!mainstreamHasData || !memeHasData) {
      console.warn(`[CryptoBoard] Partial failure: mainstream=${mainstreamHasData}, meme=${memeHasData}. Merging with cached data...`);
      
      const prevData = cachedBoard || await loadCacheFromDB();
      const finalMainstream = mainstreamHasData ? mainstream : (prevData?.mainstream || mainstream);
      const finalMeme = memeHasData ? memeCoins : (prevData?.meme || memeCoins);

      const board: CryptoBoardData = {
        mainstream: finalMainstream,
        meme: finalMeme,
        btcDominance: globalData.btcDominance,
        totalMarketCap: globalData.totalMarketCap,
        advice: advice.zh,
        adviceEn: advice.en,
        timestamp: Date.now(),
      };

      cachedBoard = board;
      if (hasRealData(finalMainstream) || hasRealData(finalMeme)) {
        await saveCacheToDB(board);
      }

      console.log(`[CryptoBoard] Updated (merged): ${finalMainstream.length} mainstream, ${finalMeme.length} meme`);
      return board;
    }

    // Full success
    const board: CryptoBoardData = {
      mainstream,
      meme: memeCoins,
      btcDominance: globalData.btcDominance,
      totalMarketCap: globalData.totalMarketCap,
      advice: advice.zh,
      adviceEn: advice.en,
      timestamp: Date.now(),
    };

    cachedBoard = board;
    await saveCacheToDB(board);
    
    const binanceCount = [...MAINSTREAM_DEFS, ...MEME_DEFS].filter(d => d.binanceSymbol).length;
    const cgFallbackCount = [...MAINSTREAM_DEFS, ...MEME_DEFS].filter(d => !d.binanceSymbol && d.id).length;
    console.log(`[CryptoBoard] Updated: ${mainstream.length} mainstream, ${memeCoins.length} meme, BTC dom=${globalData.btcDominance.toFixed(1)}% | Sources: Binance=${binanceCount}, CoinGecko fallback=${cgFallbackCount}`);
    return board;
  } catch (err: any) {
    console.error('[CryptoBoard] Job failed:', err?.message);
    return cachedBoard;
  } finally {
    isRunning = false;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===================================================================
// OHLC K-line data — CoinGecko OHLC endpoint
// ===================================================================

// Build symbol → CoinGecko ID mapping for all coins
const ALL_COIN_DEFS = [...MAINSTREAM_DEFS, ...MEME_DEFS];
const symbolToIdMap = new Map<string, string>();
for (const def of ALL_COIN_DEFS) {
  if (def.id && !symbolToIdMap.has(def.symbol)) {
    symbolToIdMap.set(def.symbol, def.id);
  }
}

export function getCoinGeckoId(symbol: string): string | undefined {
  return symbolToIdMap.get(symbol.toUpperCase());
}

export interface OHLCCandle {
  time: number;   // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

// CoinGecko OHLC endpoint: /coins/{id}/ohlc?vs_currency=usd&days=N
const OHLC_CACHE = new Map<string, { data: OHLCCandle[]; ts: number }>();
const OHLC_CACHE_TTL = 5 * 60_000; // 5 min

export async function fetchOHLC(coinId: string, days: number): Promise<OHLCCandle[]> {
  const cacheKey = `${coinId}-${days}`;
  const cached = OHLC_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < OHLC_CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
    const raw: number[][] = await fetchWithRetry(url);
    if (!Array.isArray(raw) || raw.length === 0) return [];

    const candles: OHLCCandle[] = raw.map(r => ({
      time: Math.floor(r[0] / 1000), // ms → seconds
      open: r[1],
      high: r[2],
      low: r[3],
      close: r[4],
    }));

    OHLC_CACHE.set(cacheKey, { data: candles, ts: Date.now() });
    return candles;
  } catch (err: any) {
    console.error(`[CryptoBoard] OHLC fetch failed for ${coinId} (days=${days}):`, err?.message);
    if (cached) return cached.data;
    return [];
  }
}

// ===================================================================
// Scheduler — Binance-first with CoinGecko enrichment
// ===================================================================
const CRYPTO_BOARD_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function startCryptoBoardScheduler() {
  // Immediately load from DB cache so data is available right away
  setTimeout(async () => {
    console.log('[CryptoBoard] Loading cached data from DB...');
    const dbData = await loadCacheFromDB();
    if (dbData) {
      cachedBoard = dbData;
      const advice = generateAdvice(dbData.btcDominance);
      cachedBoard.advice = advice.zh;
      cachedBoard.adviceEn = advice.en;
      console.log('[CryptoBoard] DB cache loaded — data available immediately');
    } else {
      console.log('[CryptoBoard] No DB cache found, will fetch fresh data');
    }

    // Then fetch fresh data after a short delay
    setTimeout(() => {
      console.log('[CryptoBoard] Initial fresh data fetch starting (Binance primary)...');
      runCryptoBoardJob();
    }, 10_000);
  }, 5_000);

  setInterval(() => {
    runCryptoBoardJob();
  }, CRYPTO_BOARD_INTERVAL);

  console.log('[CryptoBoard] Scheduler registered: DB cache in 5s, fresh fetch in 15s, then every 5min | Primary: Binance, Fallback: CoinGecko');
}
