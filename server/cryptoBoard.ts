// ===================================================================
// Crypto Investment Board — 主流币 vs 空气币/永续合约 投资看板
// 后端定时任务：CoinGecko 数据抓取 → DB持久化 + 内存缓存
// 包含Logo图标 + 7日迷你K线数据
// 零AI token消耗，纯API数据驱动
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
// Coin definitions — CoinGecko ID + display info
// ===================================================================
interface CoinDef {
  id: string;          // CoinGecko API ID
  symbol: string;      // Display symbol (e.g. TRUMP)
  name: string;        // Display name
  category?: string;   // 'binance-alpha' | 'tron-chain' | 'perp'
}

// 主流币前10
const MAINSTREAM_DEFS: CoinDef[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'tron', symbol: 'TRX', name: 'TRON' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
];

// 空气币/永续合约 — 用户指定列表
const MEME_DEFS: CoinDef[] = [
  // 永续合约
  { id: 'official-trump', symbol: 'TRUMP', name: 'Official Trump', category: 'perp' },
  { id: 'worldcoin-wld', symbol: 'WLD', name: 'Worldcoin', category: 'perp' },
  { id: 'hyperliquid', symbol: 'HYPE', name: 'Hyperliquid', category: 'perp' },
  { id: 'aster-2', symbol: 'ASTER', name: 'Aster', category: 'perp' },
  { id: 'myx-finance', symbol: 'MYX', name: 'MYX Finance', category: 'perp' },
  { id: 'chainopera-ai', symbol: 'COAI', name: 'ChainOpera AI', category: 'perp' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', category: 'perp' },
  { id: 'callisto-network', symbol: 'CLO', name: 'Callisto', category: 'perp' },
  { id: 'pump-fun', symbol: 'PUMP', name: 'Pump.fun', category: 'perp' },
  { id: 'sun-token', symbol: 'SUN', name: 'Sun Token', category: 'perp' },
  // Binance Alpha
  { id: 'dexlab-2', symbol: 'XLAB', name: 'Dexlab', category: 'binance-alpha' },
  { id: 'rwa-inc', symbol: 'RWA', name: 'RWA Inc.', category: 'binance-alpha' },
  // 波场链上
  { id: '', symbol: 'TRONLIFE', name: '波场人生', category: 'tron-chain' },
];

// ===================================================================
// CoinGecko fetch with sparkline + logo (with retry)
// ===================================================================
async function fetchWithRetry(url: string, retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(20000),
      });
      if (resp.status === 429) {
        console.warn(`[CryptoBoard] Rate limited (429), attempt ${attempt + 1}/${retries + 1}`);
        if (attempt < retries) {
          await sleep(5000 * (attempt + 1)); // exponential backoff
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

async function fetchCoinsWithDetails(defs: CoinDef[]): Promise<CryptoCoin[]> {
  const cgDefs = defs.filter(d => d.id);
  const nonCgDefs = defs.filter(d => !d.id);
  const coins: CryptoCoin[] = [];

  if (cgDefs.length > 0) {
    try {
      const idsParam = cgDefs.map(d => d.id).join(',');
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${idsParam}&order=market_cap_desc&per_page=50&page=1&sparkline=true`;
      const data: any[] = await fetchWithRetry(url);

      const dataMap = new Map<string, any>();
      for (const d of data) {
        dataMap.set(d.id, d);
      }

      for (const def of cgDefs) {
        const d = dataMap.get(def.id);
        if (d) {
          const rawSparkline = d.sparkline_in_7d?.price || [];
          const sparkline = downsampleSparkline(rawSparkline, 28);
          coins.push({
            name: def.name,
            symbol: def.symbol,
            price: d.current_price || 0,
            change24h: d.price_change_percentage_24h || 0,
            marketCap: d.market_cap || 0,
            volume24h: d.total_volume || 0,
            logo: d.image || '',
            sparkline7d: sparkline,
            rank: 0,
          });
        } else {
          coins.push({
            name: def.name, symbol: def.symbol,
            price: 0, change24h: 0, marketCap: 0, volume24h: 0,
            logo: '', sparkline7d: [], rank: 0,
          });
        }
      }
    } catch (err: any) {
      console.error('[CryptoBoard] CoinGecko detailed fetch failed:', err?.message);
      // Return null to signal total failure — caller will use DB cache
      return [];
    }
  }

  for (const def of nonCgDefs) {
    coins.push({
      name: def.name, symbol: def.symbol,
      price: 0, change24h: 0, marketCap: 0, volume24h: 0,
      logo: '', sparkline7d: [], rank: 0,
    });
  }

  return coins;
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
// Fetch functions
// ===================================================================
async function fetchMainstreamCoins(): Promise<CryptoCoin[]> {
  const coins = await fetchCoinsWithDetails(MAINSTREAM_DEFS);
  return coins.map((c, i) => ({ ...c, rank: i + 1 }));
}

async function fetchMemeCoins(): Promise<CryptoCoin[]> {
  const coins = await fetchCoinsWithDetails(MEME_DEFS);
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
// Main Job Runner — staggered requests with DB persistence
// ===================================================================
let isRunning = false;

export async function runCryptoBoardJob(): Promise<CryptoBoardData | null> {
  if (isRunning) {
    console.log('[CryptoBoard] Job already running, skipping...');
    return cachedBoard;
  }
  isRunning = true;

  try {
    console.log('[CryptoBoard] Starting data fetch (with logos + sparklines)...');

    // Step 1: Fetch global data (BTC dominance) — always try this first
    const globalData = await fetchGlobalData();
    await sleep(3000);

    // Step 2: Fetch mainstream coins
    const mainstream = await fetchMainstreamCoins();
    await sleep(3000);

    // Step 3: Fetch meme coins
    const memeCoins = await fetchMemeCoins();

    // Step 4: Generate advice (always works as long as we have BTC dominance)
    const advice = generateAdvice(globalData.btcDominance);

    // Step 5: Determine if we got real data or just placeholders
    const mainstreamHasData = hasRealData(mainstream);
    const memeHasData = hasRealData(memeCoins);

    // If both lists failed (all price=0), merge with DB cache to preserve last good data
    if (!mainstreamHasData || !memeHasData) {
      console.warn(`[CryptoBoard] Partial failure: mainstream=${mainstreamHasData}, meme=${memeHasData}. Merging with cached data...`);
      
      // Load previous good data from DB or memory
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

      // Only save to DB if we have at least some real data
      if (hasRealData(finalMainstream) || hasRealData(finalMeme)) {
        await saveCacheToDB(board);
      }

      console.log(`[CryptoBoard] Updated (merged): ${finalMainstream.length} mainstream (real=${hasRealData(finalMainstream)}), ${finalMeme.length} meme (real=${hasRealData(finalMeme)})`);
      return board;
    }

    // Full success — save fresh data
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
    console.log(`[CryptoBoard] Updated: ${mainstream.length} mainstream, ${memeCoins.length} meme, BTC dom=${globalData.btcDominance.toFixed(1)}%`);
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
// Scheduler — load DB cache on start, then fetch fresh data
// ===================================================================
const CRYPTO_BOARD_INTERVAL = 60 * 60 * 1000; // 1 hour

export function startCryptoBoardScheduler() {
  // Immediately load from DB cache so data is available right away
  setTimeout(async () => {
    console.log('[CryptoBoard] Loading cached data from DB...');
    const dbData = await loadCacheFromDB();
    if (dbData) {
      cachedBoard = dbData;
      // Regenerate advice with current BTC dominance from cache
      const advice = generateAdvice(dbData.btcDominance);
      cachedBoard.advice = advice.zh;
      cachedBoard.adviceEn = advice.en;
      console.log('[CryptoBoard] DB cache loaded — data available immediately');
    } else {
      console.log('[CryptoBoard] No DB cache found, will fetch fresh data');
    }

    // Then fetch fresh data after a short delay
    setTimeout(() => {
      console.log('[CryptoBoard] Initial fresh data fetch starting...');
      runCryptoBoardJob();
    }, 10_000);
  }, 5_000);

  setInterval(() => {
    runCryptoBoardJob();
  }, CRYPTO_BOARD_INTERVAL);

  console.log('[CryptoBoard] Scheduler registered: DB cache in 5s, fresh fetch in 15s, then every 1h');
}
