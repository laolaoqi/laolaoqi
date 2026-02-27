// ===================================================================
// Crypto Investment Board — 主流币 vs 空气币永续合约 投资看板
// 后端定时任务：CoinGecko + Binance 数据抓取 → JSON缓存
// 零AI token消耗，纯API数据驱动
// ===================================================================

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

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
// In-memory cache (no file system dependency)
// ===================================================================
let cachedBoard: CryptoBoardData | null = null;

export function getCryptoBoardData(): CryptoBoardData | null {
  return cachedBoard;
}

// ===================================================================
// CoinGecko API — 主流币前10
// ===================================================================
const MAINSTREAM_IDS = [
  'bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple',
  'cardano', 'avalanche-2', 'tron', 'dogecoin', 'chainlink',
];

async function fetchMainstreamCoins(): Promise<CryptoCoin[]> {
  try {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false';
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`CoinGecko HTTP ${resp.status}`);
    const coins: any[] = await resp.json();

    return coins
      .filter(c => MAINSTREAM_IDS.includes(c.id))
      .slice(0, 10)
      .map((c, i) => ({
        name: c.name,
        symbol: c.symbol.toUpperCase(),
        price: c.current_price || 0,
        change24h: c.price_change_percentage_24h || 0,
        marketCap: c.market_cap || 0,
        volume24h: c.total_volume || 0,
        rank: i + 1,
      }));
  } catch (err: any) {
    console.error('[CryptoBoard] Failed to fetch mainstream coins:', err?.message);
    return [];
  }
}

// ===================================================================
// CoinGecko Global — BTC主导率 + 总市值
// ===================================================================
async function fetchGlobalData(): Promise<{ btcDominance: number; totalMarketCap: number }> {
  try {
    const resp = await fetch('https://api.coingecko.com/api/v3/global', {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) throw new Error(`CoinGecko Global HTTP ${resp.status}`);
    const data = await resp.json();
    return {
      btcDominance: data.data?.market_cap_percentage?.btc || 57.9,
      totalMarketCap: data.data?.total_market_cap?.usd || 0,
    };
  } catch (err: any) {
    console.error('[CryptoBoard] Failed to fetch global data:', err?.message);
    return { btcDominance: 57.9, totalMarketCap: 0 };
  }
}

// ===================================================================
// Binance Futures API — 空气币永续合约前10
// ===================================================================
const MEME_SYMBOLS = [
  'TRUMPUSDT', 'WLDUSDT', 'HYPEUSDT', 'DOGEUSDT',
  'SHIBUSDT', 'PEPEUSDT', 'FLOKIUSDT', 'WIFUSDT',
  'SUIUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT',
  'INJUSDT', 'FETUSDT', 'NEARUSDT',
];

async function fetchMemePerps(): Promise<CryptoCoin[]> {
  const results: CryptoCoin[] = [];

  // Batch fetch: Binance 24hr ticker for all symbols at once
  try {
    const url = 'https://fapi.binance.com/fapi/v1/ticker/24hr';
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`Binance Futures HTTP ${resp.status}`);
    const allTickers: any[] = await resp.json();

    const tickerMap = new Map<string, any>();
    for (const t of allTickers) {
      tickerMap.set(t.symbol, t);
    }

    for (const sym of MEME_SYMBOLS) {
      const data = tickerMap.get(sym);
      if (data) {
        results.push({
          name: sym.replace('USDT', ''),
          symbol: sym,
          price: parseFloat(data.lastPrice) || 0,
          change24h: parseFloat(data.priceChangePercent) || 0,
          volume24h: parseFloat(data.quoteVolume) || 0,
          rank: results.length + 1,
        });
      }
    }
  } catch (err: any) {
    console.error('[CryptoBoard] Failed to fetch Binance futures:', err?.message);

    // Fallback: fetch individually
    for (const sym of MEME_SYMBOLS) {
      try {
        const resp = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${sym}`, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(8000),
        });
        if (!resp.ok) continue;
        const data = await resp.json();
        results.push({
          name: sym.replace('USDT', ''),
          symbol: sym,
          price: parseFloat(data.lastPrice) || 0,
          change24h: parseFloat(data.priceChangePercent) || 0,
          volume24h: parseFloat(data.quoteVolume) || 0,
          rank: results.length + 1,
        });
      } catch {
        console.log(`[CryptoBoard] ${sym} fetch failed`);
      }
    }
  }

  // Sort by volume and return top 10
  results.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
  return results.slice(0, 10).map((c, i) => ({ ...c, rank: i + 1 }));
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
    zh = `🚀 空气季：BTC主导率${btcDominance.toFixed(1)}%低位，山寨币全面爆发。追永续合约故事（TRUMP/HYPE/PEPE等），但别全仓！风险极高！`;
    en = `🚀 Meme season: BTC dominance ${btcDominance.toFixed(1)}% low. Chase meme perp narratives (TRUMP/HYPE/PEPE), but NEVER go all-in! Extreme risk!`;
  }

  return { zh, en };
}

// ===================================================================
// Main Job Runner
// ===================================================================
let isRunning = false;

export async function runCryptoBoardJob(): Promise<CryptoBoardData | null> {
  if (isRunning) {
    console.log('[CryptoBoard] Job already running, skipping...');
    return cachedBoard;
  }
  isRunning = true;

  try {
    console.log('[CryptoBoard] Starting data fetch...');

    // Fetch all data in parallel
    const [mainstream, memePerps, globalData] = await Promise.all([
      fetchMainstreamCoins(),
      fetchMemePerps(),
      fetchGlobalData(),
    ]);

    const advice = generateAdvice(globalData.btcDominance);

    const board: CryptoBoardData = {
      mainstream,
      meme: memePerps,
      btcDominance: globalData.btcDominance,
      totalMarketCap: globalData.totalMarketCap,
      advice: advice.zh,
      adviceEn: advice.en,
      timestamp: Date.now(),
    };

    cachedBoard = board;
    console.log(`[CryptoBoard] Updated: ${mainstream.length} mainstream, ${memePerps.length} meme perps, BTC dom=${globalData.btcDominance.toFixed(1)}%`);
    return board;
  } catch (err: any) {
    console.error('[CryptoBoard] Job failed:', err?.message);
    return cachedBoard;
  } finally {
    isRunning = false;
  }
}

// ===================================================================
// Scheduler — 启动时运行 + 每小时自动更新
// ===================================================================
const CRYPTO_BOARD_INTERVAL = 60 * 60 * 1000; // 1 hour

export function startCryptoBoardScheduler() {
  // Initial run after 15s (let other services start first)
  setTimeout(() => {
    console.log('[CryptoBoard] Initial run starting...');
    runCryptoBoardJob();
  }, 15_000);

  // Hourly updates
  setInterval(() => {
    runCryptoBoardJob();
  }, CRYPTO_BOARD_INTERVAL);

  console.log('[CryptoBoard] Scheduler registered: initial in 15s, then every 1h');
}
