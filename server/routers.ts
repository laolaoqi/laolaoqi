import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { listUsers, updateUserRole, updateCryptoBoardAccess, batchUpdateCryptoBoardAccess, checkCryptoBoardAccess, getUserStats, createAnnouncement, getActiveAnnouncements, getAllAnnouncements, updateAnnouncement, deleteAnnouncement, saveStrategyResults, getLatestRecommendations, getLatestSentiment, cleanOldStrategyData } from "./db";
import { runAllStrategies, runStrategyForMarket, STOCK_UNIVERSE } from "./strategyEngine";
import { getCryptoBoardData, runCryptoBoardJob, startCryptoBoardScheduler, loadCacheFromDB, fetchOHLC, getCoinGeckoId } from "./cryptoBoard";
import { getSimPortfolioData, runSimRebalance, startSimInvestmentScheduler } from "./simInvestment";
import { getSimAshareData, runAshareRebalance, startSimAshareScheduler } from "./simAshare";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getDailyStats, getCountryStats, getCityStats, getTopPages, getDeviceStats, getRecentVisitors, getTodaySummary, getHourlyStats } from "./visitorTracker";
import { getPageAccessConfig, updatePageAccessRule, setAllPagesOpen, setAllPagesRestricted, checkPageAccess, initPageAccessRules } from "./pageAccess";

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
const HEATMAP_CACHE_TTL = 15 * 60_000; // 热力图 15分钟（覆盖完整股票池，数据量大）
const AI_SUMMARY_CACHE_TTL = 15 * 60_000; // AI摘要 15分钟
const STOCK_DETAIL_CACHE_TTL = 60_000; // 个股详情 60秒

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

async function fetchYahooQuote(symbols: string[]) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(10000),
  });
  if (resp.status !== 200) throw new Error(`Yahoo Quote API HTTP ${resp.status}`);
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
// 热力图板块配置 — 从 STOCK_UNIVERSE 自动构建行业分组
// 覆盖完整股票池：A股300+只、港股82只、美股101只、加密30只
// ===================================================================
interface SectorConfig { nameZh: string; nameEn: string; symbols: string[]; }

// 行业中英文映射表
const INDUSTRY_EN_MAP: Record<string, string> = {
  '银行': 'Banking', '地产': 'Real Estate', '通信设备': 'Telecom Equipment', '面板': 'Display',
  '机械': 'Machinery', '券商': 'Brokerage', '化工': 'Chemical', '家电': 'Home Appliance',
  '矿业': 'Mining', '医药': 'Pharma', '白酒': 'Liquor', '军工': 'Defense',
  '建材': 'Construction', '汽车': 'Auto', '养殖': 'Farming', '食品': 'Food',
  'IT': 'IT', '服务器': 'Server', '煤炭': 'Coal', '电力': 'Power',
  '广告': 'Advertising', '芯片': 'Chip', '汽车零部件': 'Auto Parts', '锂电': 'Lithium Battery',
  '快递': 'Express', '光伏': 'Solar', 'AI': 'AI', '安防': 'Security',
  '电子': 'Electronics', '保险': 'Insurance', '钢铁': 'Steel', '能源': 'Energy',
  '新能源': 'New Energy', '新能源车': 'EV', '风电': 'Wind Power', '通信': 'Telecom',
  '互联网': 'Internet', '半导体': 'Semiconductor', '消费电子': 'Consumer Tech',
  '短视频': 'Short Video', '本地生活': 'Local Services', '电商': 'E-Commerce',
  '博彩': 'Gaming', '啤酒': 'Beer', '珠宝': 'Jewelry', '运动': 'Sports',
  '纺织': 'Textile', '乳业': 'Dairy', '生物医药': 'Biotech', '燃气': 'Gas',
  '物管': 'Property Mgmt', '餐饮': 'Catering', '医疗': 'Healthcare',
  '石油': 'Oil', '玻璃': 'Glass', '铝业': 'Aluminum', '电脑': 'Computer',
  '声学': 'Acoustics', '光学': 'Optics', '旅游': 'Tourism', '游戏': 'Gaming',
  '工具': 'Tools', '科技': 'Tech', '软件': 'Software', '社交': 'Social',
  '零售': 'Retail', '流媒体': 'Streaming', '半导体设备': 'Semi Equipment',
  '模拟芯片': 'Analog Chip', '芯片设计': 'Chip Design', '电源芯片': 'Power IC',
  'EDA': 'EDA', 'SaaS': 'SaaS', '监控': 'Monitoring', '数据': 'Data',
  '网络安全': 'Cybersecurity', '外卖': 'Delivery', '支付': 'Payment',
  '医疗机器人': 'Medical Robot', '比特币': 'Bitcoin', 'AI/数据': 'AI/Data',
  'RNA疗法': 'RNA Therapy', '医疗设备': 'Medical Device', '宠物医疗': 'Vet Care',
  '医疗器械': 'Med Device', '通信设备2': 'Telecom Equip', '网络': 'Networking',
  '人力资源': 'HR', '核电': 'Nuclear', '油服': 'Oil Service', '酒店': 'Hotel',
  '广告科技': 'Ad Tech', '饮料': 'Beverage', '基建': 'Infrastructure',
  '信息服务': 'Info Services', '存储': 'Storage', '金融': 'Finance',
  'L1': 'L1 Chain', 'L2': 'L2', 'BTC L2': 'BTC L2', '交易所': 'Exchange',
  'Meme': 'Meme', '跨链': 'Cross-chain', '预言机': 'Oracle', 'DeFi': 'DeFi',
  '动态筛选': 'Dynamic Scan',
};

// 从 STOCK_UNIVERSE 动态构建行业板块分组
function buildSectorsFromUniverse(market: string): SectorConfig[] {
  const stocks = STOCK_UNIVERSE[market];
  if (!stocks) return [];
  
  const industryMap = new Map<string, string[]>();
  for (const s of stocks) {
    const ind = s.industry || '其他';
    if (!industryMap.has(ind)) industryMap.set(ind, []);
    industryMap.get(ind)!.push(s.symbol);
  }
  
  // Sort sectors by stock count descending
  const sectors: SectorConfig[] = Array.from(industryMap.entries()).map(([industry, symbols]) => ({
    nameZh: industry,
    nameEn: INDUSTRY_EN_MAP[industry] || industry,
    symbols,
  }));
  sectors.sort((a, b) => b.symbols.length - a.symbols.length);
  return sectors;
}

// Pre-build sectors for all markets
const MARKET_SECTORS: Record<MarketId, SectorConfig[]> = {
  cn: buildSectorsFromUniverse('cn'),
  hk: buildSectorsFromUniverse('hk'),
  us: buildSectorsFromUniverse('us'),
  crypto: buildSectorsFromUniverse('crypto'),
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
    // For 1d range, chartPreviousClose = yesterday's close (correct for indices)
    // But also check closes array as fallback
    const allCloses = (quotes.close || []).filter((v: any) => v != null && !isNaN(v));
    const prevClose = meta.chartPreviousClose || meta.previousClose || (allCloses.length >= 2 ? allCloses[0] : price);
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
    const data = result.chart.result[0];
    const meta = data.meta;
    const quotes = data.indicators?.quote?.[0] || {};
    const closes = (quotes.close || []).filter((v: any) => v != null && !isNaN(v));
    const price = meta.regularMarketPrice || (closes.length > 0 ? closes[closes.length - 1] : 0);
    // Use yesterday's close (second-to-last) for accurate daily change
    const prevClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.previousClose || meta.chartPreviousClose || price);
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
      CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh', SG: 'zh',
      US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IN: 'en', IE: 'en', ZA: 'en',
      JP: 'ja', KR: 'ko',
      SA: 'ar', AE: 'ar', EG: 'ar', IQ: 'ar', QA: 'ar', KW: 'ar', BH: 'ar', OM: 'ar', JO: 'ar', LB: 'ar', SY: 'ar', YE: 'ar', LY: 'ar', TN: 'ar', DZ: 'ar', MA: 'ar', SD: 'ar',
      BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt',
      ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es',
      TH: 'th',
      MY: 'ms', BN: 'ms',
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

  // ===================================================================
  // 管理员路由
  // ===================================================================
  admin: router({
    // 用户列表
    listUsers: adminProcedure.query(async () => {
      return await listUsers();
    }),

    // 更新用户角色
    updateUserRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(['user', 'admin']) }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    // 公告列表（管理员看所有）
    listAnnouncements: adminProcedure.query(async () => {
      return await getAllAnnouncements();
    }),

    // 创建公告
    createAnnouncement: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(256),
        content: z.string().min(1),
        imageUrl: z.string().optional(),
        imageCaption: z.string().max(512).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await createAnnouncement({
          title: input.title,
          content: input.content,
          imageUrl: input.imageUrl,
          imageCaption: input.imageCaption,
          authorId: ctx.user.id,
        });
        return result;
      }),

    // 更新公告
    updateAnnouncement: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(256).optional(),
        content: z.string().min(1).optional(),
        imageUrl: z.string().optional(),
        imageCaption: z.string().max(512).optional(),
        isActive: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateAnnouncement(id, data);
        return { success: true };
      }),

    // 删除公告
    deleteAnnouncement: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteAnnouncement(input.id);
        return { success: true };
      }),

    // 上传图片
    uploadImage: adminProcedure
      .input(z.object({
        base64: z.string(),
        filename: z.string(),
        contentType: z.string().default('image/png'),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, 'base64');
        const ext = input.filename.split('.').pop() || 'png';
        const fileKey = `announcements/${nanoid()}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        return { url };
      }),

    // ===== 投资看板权限管理 =====

    // 用户统计概览
    userStats: adminProcedure.query(async () => {
      return await getUserStats();
    }),

    // 设置单个用户投资看板权限
    setCryptoBoardAccess: adminProcedure
      .input(z.object({
        userId: z.number(),
        access: z.boolean(),
        expiresAt: z.string().nullable().optional(), // ISO date string or null
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
        await updateCryptoBoardAccess(input.userId, input.access, expiresAt, input.note);
        return { success: true };
      }),

    // 批量设置用户投资看板权限
    batchSetCryptoBoardAccess: adminProcedure
      .input(z.object({
        userIds: z.array(z.number()).min(1),
        access: z.boolean(),
        expiresAt: z.string().nullable().optional(),
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
        await batchUpdateCryptoBoardAccess(input.userIds, input.access, expiresAt, input.note);
        return { success: true, count: input.userIds.length };
      }),

    // ===== 访客统计 =====

    // 今日概览
    visitorSummary: adminProcedure.query(async () => {
      return await getTodaySummary();
    }),

    // 每日PV/UV统计
    visitorDailyStats: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(async ({ input }) => {
        return await getDailyStats(input.days);
      }),

    // 小时分布（今日）
    visitorHourlyStats: adminProcedure.query(async () => {
      return await getHourlyStats();
    }),

    // 国家分布
    visitorCountryStats: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(async ({ input }) => {
        return await getCountryStats(input.days);
      }),

    // 城市分布
    visitorCityStats: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(async ({ input }) => {
        return await getCityStats(input.days);
      }),

    // 热门页面
    visitorTopPages: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(async ({ input }) => {
        return await getTopPages(input.days);
      }),

    // 设备/浏览器/OS统计
    visitorDeviceStats: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(async ({ input }) => {
        return await getDeviceStats(input.days);
      }),

    // 最近访客列表
    visitorRecentList: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
      .query(async ({ input }) => {
        return await getRecentVisitors(input.limit);
      }),

    // ===== 页面访问权限管理 =====

    // 获取所有页面权限配置
    getPageAccessConfig: adminProcedure.query(async () => {
      return await getPageAccessConfig();
    }),

    // 更新单个页面的权限
    updatePageAccess: adminProcedure
      .input(z.object({
        pagePath: z.string(),
        guestAccess: z.number().min(0).max(1),
        userAccess: z.number().min(0).max(1),
      }))
      .mutation(async ({ input }) => {
        await updatePageAccessRule(input.pagePath, input.guestAccess, input.userAccess);
        return { success: true };
      }),

    // 一键全站开放（游客+注册用户都可访问所有页面，不含管理员后台）
    openAllPages: adminProcedure.mutation(async () => {
      await setAllPagesOpen();
      return { success: true };
    }),

    // 一键全站限制（所有页面都需要权限）
    restrictAllPages: adminProcedure.mutation(async () => {
      await setAllPagesRestricted();
      return { success: true };
    }),
  }),

  // ===================================================================
  // 投资看板权限检查（用户端）
  // ===================================================================
  cryptoAccess: router({
    check: protectedProcedure.query(async ({ ctx }) => {
      return await checkCryptoBoardAccess(ctx.user.id);
    }),
  }),

  // ===================================================================
  // 公告（公开读取）
  // ===================================================================
  announcements: router({
    active: publicProcedure.query(async () => {
      return await getActiveAnnouncements();
    }),
  }),

  // ===================================================================
  // 页面访问权限检查（前端路由守卫用）
  // ===================================================================
  pageAccess: router({
    // 检查当前用户是否可以访问指定页面
    check: publicProcedure
      .input(z.object({ path: z.string() }))
      .query(async ({ input, ctx }) => {
        const user = ctx.user;
        let userType: "guest" | "user" | "admin" = "guest";
        if (user) {
          userType = user.role === "admin" ? "admin" : "user";
        }
        const hasAccess = await checkPageAccess(input.path, userType);
        return { hasAccess, userType };
      }),

    // 获取所有页面权限规则（前端用于导航显示控制）
    rules: publicProcedure.query(async ({ ctx }) => {
      const user = ctx.user;
      let userType: "guest" | "user" | "admin" = "guest";
      if (user) {
        userType = user.role === "admin" ? "admin" : "user";
      }
      const config = await getPageAccessConfig();
      return { ...config, userType };
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
    // 获取指定市场的指数数据（只返回该市场的指数）
    // crypto市场使用CoinGecko数据（与投资看板一致），其他市场使用Yahoo Finance
    indices: publicProcedure
      .input(z.object({ market: marketIdSchema }))
      .query(async ({ input }) => {
        const cacheKey = `indices-${input.market}`;
        const cached = getCached<any>(cacheKey, INDEX_CACHE_TTL);
        if (cached) return { ...cached, fromCache: true };

        // For crypto market, use CoinGecko data (same source as CryptoBoard)
        // This ensures consistency between homepage and investment board
        if (input.market === 'crypto') {
          try {
            // Try in-memory cache from CryptoBoard first
            const boardData = getCryptoBoardData();
            const mainstream = boardData?.mainstream || [];
            if (mainstream.length > 0) {
              // Map top 3 mainstream coins to index format (BTC, ETH, SOL)
              const top3 = mainstream.slice(0, 3);
              const data = top3.map(coin => {
                // Generate chartData from sparkline7d
                const chartData = (coin.sparkline7d || []).map((val, i) => ({
                  time: Math.floor(Date.now() / 1000) - (coin.sparkline7d!.length - i) * 3600,
                  value: val,
                }));
                const configs = MARKET_INDICES.crypto;
                const cfg = configs.find(c => c.symbol.startsWith(coin.symbol)) || configs[0];
                return {
                  symbol: `${coin.symbol}-USD`,
                  nameZh: cfg?.nameZh || coin.name,
                  nameEn: cfg?.nameEn || coin.name,
                  nameJa: cfg?.nameJa || coin.name,
                  nameKo: cfg?.nameKo || coin.name,
                  nameAr: cfg?.nameAr || coin.name,
                  price: coin.price,
                  change: coin.price * (coin.change24h / 100),
                  changePercent: coin.change24h,
                  high: coin.price * 1.01,
                  low: coin.price * 0.99,
                  volume: coin.volume24h || 0,
                  chartData,
                  market: 'crypto',
                };
              });
              const result = { data, isLive: true, fromCache: false };
              setCache(cacheKey, result);
              return result;
            }
            // Fallback: try DB cache from CryptoBoard
            const dbData = await loadCacheFromDB();
            if (dbData && dbData.mainstream.length > 0) {
              const top3 = dbData.mainstream.slice(0, 3);
              const data = top3.map(coin => {
                const chartData = (coin.sparkline7d || []).map((val, i) => ({
                  time: Math.floor(Date.now() / 1000) - (coin.sparkline7d!.length - i) * 3600,
                  value: val,
                }));
                const configs = MARKET_INDICES.crypto;
                const cfg = configs.find(c => c.symbol.startsWith(coin.symbol)) || configs[0];
                return {
                  symbol: `${coin.symbol}-USD`,
                  nameZh: cfg?.nameZh || coin.name,
                  nameEn: cfg?.nameEn || coin.name,
                  nameJa: cfg?.nameJa || coin.name,
                  nameKo: cfg?.nameKo || coin.name,
                  nameAr: cfg?.nameAr || coin.name,
                  price: coin.price,
                  change: coin.price * (coin.change24h / 100),
                  changePercent: coin.change24h,
                  high: coin.price * 1.01,
                  low: coin.price * 0.99,
                  volume: coin.volume24h || 0,
                  chartData,
                  market: 'crypto',
                };
              });
              const result = { data, isLive: true, fromCache: false };
              setCache(cacheKey, result);
              return result;
            }
          } catch (err: any) {
            console.error('[Market] CoinGecko crypto indices fallback to Yahoo:', err?.message);
          }
        }

        // Default: use Yahoo Finance for non-crypto markets (or as fallback)
        const configs = MARKET_INDICES[input.market].map(c => ({ ...c, market: input.market }));
        const results = await Promise.allSettled(configs.map(cfg => fetchIndexData(cfg)));
        const data = results.map((r, i) => {
          if (r.status === 'fulfilled' && r.value) return { ...r.value, market: configs[i].market };
          return null;
        }).filter(Boolean);

        const result = { data, isLive: data.length > 0, fromCache: false };
        if (data.length > 0) setCache(cacheKey, result);
        return result;
      }),

    // 获取指定市场的推荐股票 — 策略引擎驱动
    recommendations: publicProcedure
      .input(z.object({ market: marketIdSchema }))
      .query(async ({ input }) => {
        const cacheKey = `recs-${input.market}`;
        const cached = getCached<any>(cacheKey, RECS_CACHE_TTL);
        if (cached) return { ...cached, fromCache: true };

        // Try to get from database first (strategy engine results)
        try {
          const dbRecs = await getLatestRecommendations(input.market);
          if (dbRecs.length > 0) {
            const data = dbRecs.map(r => ({
              rank: r.rank,
              symbol: r.symbol,
              nameZh: r.nameZh,
              nameEn: r.nameEn,
              code: r.code,
              industry: r.industry || '',
              price: r.price,
              change: r.change,
              changePercent: r.changePercent,
              score: r.score,
              signal: r.signal,
              capitalFlow: r.capitalFlow || 0,
              reasonZh: r.reason || '',
              reasonEn: r.reason || '',
              reason: r.reason || '',
              reasonDetail: r.reasonDetail || '',
              tags: r.tags ? r.tags.split(',') : [],
              pe: r.pe,
              pb: r.pb,
              dividendYield: r.dividendYield,
            }));
            const result = { data, isLive: true, market: input.market, fromStrategy: true };
            setCache(cacheKey, result);
            return result;
          }
        } catch (err: any) {
          console.error('[Market] DB recs failed, falling back:', err?.message);
        }

        // Fallback: use old static stock list + Yahoo data
        const stocks = MARKET_STOCKS[input.market];
        const results = await Promise.allSettled(stocks.map((s, i) => fetchStockData(s, i + 1)));
        const data = results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
        data.sort((a: any, b: any) => (b?.score || 0) - (a?.score || 0));
        data.forEach((item: any, i: number) => { item.rank = i + 1; });

        const result = { data, isLive: data.length > 0, market: input.market, fromStrategy: false };
        if (data.length > 0) setCache(cacheKey, result);
        return result;
      }),

    // 热力图数据 — 按行业板块聚合
    heatmap: publicProcedure
      .input(z.object({ market: marketIdSchema }))
      .query(async ({ input }) => {
        const cacheKey = `heatmap-${input.market}`;
        const cached = getCached<any>(cacheKey, HEATMAP_CACHE_TTL);
        if (cached) return cached;

        const sectors = MARKET_SECTORS[input.market];
        const allSymbols = sectors.flatMap(s => s.symbols);

        // Fetch real data from Yahoo — batch in groups of 15 with delay
        let quoteMap: Record<string, { changePercent: number; price: number; volume: number }> = {};
        const BATCH_SIZE = 15;
        const BATCH_DELAY = 300; // ms between batches to avoid throttling
        let fetchedCount = 0;
        let failCount = 0;
        
        console.log(`[Heatmap] Fetching ${allSymbols.length} symbols for ${input.market} market...`);
        
        for (let i = 0; i < allSymbols.length; i += BATCH_SIZE) {
          const batch = allSymbols.slice(i, i + BATCH_SIZE);
          try {
            const result = await fetchYahooQuote(batch);
            const quotes = result?.quoteResponse?.result || [];
            for (const q of quotes) {
              quoteMap[q.symbol] = {
                changePercent: q.regularMarketChangePercent || 0,
                price: q.regularMarketPrice || 0,
                volume: q.regularMarketVolume || 0,
              };
              fetchedCount++;
            }
          } catch (err: any) {
            failCount += batch.length;
            // On failure, generate placeholder data for this batch
            for (const sym of batch) {
              if (!quoteMap[sym]) {
                quoteMap[sym] = {
                  changePercent: (Math.random() - 0.45) * 6,
                  price: 100 + Math.random() * 200,
                  volume: Math.random() * 1e9,
                };
              }
            }
          }
          // Add delay between batches to avoid API throttling
          if (i + BATCH_SIZE < allSymbols.length) {
            await new Promise(r => setTimeout(r, BATCH_DELAY));
          }
        }
        
        console.log(`[Heatmap] ${input.market}: fetched ${fetchedCount}/${allSymbols.length} symbols (${failCount} failed)`);

        // Build symbol→name lookup from STOCK_UNIVERSE
        const nameMap: Record<string, string> = {};
        const stocks = STOCK_UNIVERSE[input.market] || [];
        for (const s of stocks) {
          nameMap[s.symbol] = s.nameZh;
        }

        const data = sectors.map(sector => {
          const stockData = sector.symbols.map(sym => {
            const q = quoteMap[sym] || { changePercent: 0, price: 0, volume: 0 };
            return { symbol: sym, name: nameMap[sym] || sym, changePercent: q.changePercent, price: q.price, volume: q.volume };
          });
          const avgChange = stockData.length > 0
            ? stockData.reduce((s, d) => s + d.changePercent, 0) / stockData.length
            : 0;
          return {
            nameZh: sector.nameZh,
            nameEn: sector.nameEn,
            changePercent: Math.round(avgChange * 100) / 100,
            stocks: stockData,
            weight: stockData.length, // visual weight
          };
        });

        const result = { data, isLive: Object.keys(quoteMap).length > 0 };
        setCache(cacheKey, result);
        return result;
      }),

    // AI 智能市场摘要
    aiSummary: publicProcedure
      .input(z.object({ market: marketIdSchema, lang: z.string().optional() }))
      .query(async ({ input }) => {
        const lang = input.lang || 'zh';
        const cacheKey = `ai-summary-${input.market}-${lang}`;
        const cached = getCached<any>(cacheKey, AI_SUMMARY_CACHE_TTL);
        if (cached) return cached;

        // Gather market data for context
        const indicesCacheKey = `indices-${input.market}`;
        const indicesData = getCached<any>(indicesCacheKey, INDEX_CACHE_TTL * 5);
        const recsCacheKey = `recs-${input.market}`;
        const recsData = getCached<any>(recsCacheKey, RECS_CACHE_TTL * 2);

        const marketNames: Record<MarketId, string> = {
          cn: 'A股/中国A股市场', hk: '港股/香港股市', us: '美股/美国股市', crypto: '数字货币/加密货币市场',
        };

        let contextInfo = `市场: ${marketNames[input.market]}\n`;
        if (indicesData?.data) {
          contextInfo += `指数数据:\n`;
          for (const idx of indicesData.data) {
            contextInfo += `- ${idx.nameZh || idx.nameEn}: ${idx.price?.toFixed(2)} (${idx.changePercent >= 0 ? '+' : ''}${idx.changePercent?.toFixed(2)}%)\n`;
          }
        }
        if (recsData?.data) {
          contextInfo += `推荐标的:\n`;
          for (const rec of recsData.data.slice(0, 5)) {
            contextInfo += `- ${rec.nameZh || rec.nameEn} (${rec.code}): ${rec.price?.toFixed(2)} ${rec.changePercent >= 0 ? '+' : ''}${rec.changePercent?.toFixed(2)}%\n`;
          }
        }

        const langInstructions: Record<string, string> = {
          zh: '请用中文回答',
          en: 'Please respond in English',
          ja: '日本語で回答してください',
          ko: '한국어로 답변해 주세요',
          ar: 'يرجى الإجابة باللغة العربية',
        };

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: `你是一位专业的金融分析师，擅长市场分析和投资建议。${langInstructions[lang] || langInstructions.zh}。请基于提供的市场数据，生成简洁的市场分析摘要。格式要求：返回JSON格式，包含以下字段：
{
  "title": "一句话标题概括今日市场",
  "overview": "2-3句话的市场概况",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "outlook": "1-2句话的后市展望",
  "riskWarning": "1句话的风险提示"
}`
              },
              {
                role: 'user',
                content: `请分析以下市场数据并生成今日市场摘要：\n\n${contextInfo}`
              }
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'market_summary',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'One-line market headline' },
                    overview: { type: 'string', description: 'Market overview 2-3 sentences' },
                    keyPoints: { type: 'array', items: { type: 'string' }, description: '3 key points' },
                    outlook: { type: 'string', description: 'Market outlook' },
                    riskWarning: { type: 'string', description: 'Risk warning' },
                  },
                  required: ['title', 'overview', 'keyPoints', 'outlook', 'riskWarning'],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices?.[0]?.message?.content;
          let summary;
          if (typeof content === 'string') {
            summary = JSON.parse(content);
          } else {
            summary = { title: '数据加载中...', overview: '正在获取市场数据', keyPoints: [], outlook: '请稍后刷新', riskWarning: '投资有风险' };
          }

          const result = { summary, isLive: true, generatedAt: Date.now() };
          setCache(cacheKey, result);
          return result;
        } catch (err: any) {
          console.error('[AI Summary] LLM failed:', err?.message);
          return {
            summary: {
              title: '市场分析摘要生成中...',
              overview: '当前正在获取和分析市场数据，请稍后刷新。',
              keyPoints: ['数据正在加载中', '请稍后查看完整分析', '建议关注市场动态'],
              outlook: '请刷新页面获取最新分析。',
              riskWarning: '投资有风险，入市需谨慎。数据仅供参考，不构成投资建议。',
            },
            isLive: false,
            generatedAt: Date.now(),
          };
        }
      }),

    // 个股详情 — 完整数据（图表+基本面）
    stockDetail: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        const cacheKey = `stock-detail-${input.symbol}`;
        const cached = getCached<any>(cacheKey, STOCK_DETAIL_CACHE_TTL);
        if (cached) return cached;

        try {
          // Fetch intraday chart
          const intradayResult = await fetchYahooChart(input.symbol, '5m', '1d');
          const intradayData = intradayResult?.chart?.result?.[0] || null;

          // Fetch 6-month daily chart for K-line
          const dailyResult = await fetchYahooChart(input.symbol, '1d', '6mo');
          const dailyData = dailyResult?.chart?.result?.[0] || null;

          // Extract meta info
          const meta = intradayData?.meta || dailyData?.meta || {};

          // Build intraday chart data
          const intradayChart: any[] = [];
          if (intradayData?.timestamp) {
            const quotes = intradayData.indicators?.quote?.[0] || {};
            for (let i = 0; i < intradayData.timestamp.length; i++) {
              const c = quotes.close?.[i];
              if (c != null && !isNaN(c)) {
                intradayChart.push({
                  time: intradayData.timestamp[i],
                  open: quotes.open?.[i] || c,
                  high: quotes.high?.[i] || c,
                  low: quotes.low?.[i] || c,
                  close: c,
                  volume: quotes.volume?.[i] || 0,
                });
              }
            }
          }

          // Build daily K-line data
          const dailyChart: any[] = [];
          if (dailyData?.timestamp) {
            const quotes = dailyData.indicators?.quote?.[0] || {};
            for (let i = 0; i < dailyData.timestamp.length; i++) {
              const c = quotes.close?.[i];
              if (c != null && !isNaN(c)) {
                dailyChart.push({
                  time: dailyData.timestamp[i],
                  open: quotes.open?.[i] || c,
                  high: quotes.high?.[i] || c,
                  low: quotes.low?.[i] || c,
                  close: c,
                  volume: quotes.volume?.[i] || 0,
                });
              }
            }
          }

          // Calculate technical indicators from daily data
          const closes = dailyChart.map(d => d.close);
          const ma5 = calculateMA(closes, 5);
          const ma10 = calculateMA(closes, 10);
          const ma20 = calculateMA(closes, 20);
          const ma60 = calculateMA(closes, 60);
          const rsi14 = calculateRSI(closes, 14);
          const macd = calculateMACD(closes);

          const price = meta.regularMarketPrice || 0;
          const prevClose = meta.chartPreviousClose || meta.previousClose || price;

          const result = {
            symbol: input.symbol,
            price,
            prevClose,
            change: price - prevClose,
            changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
            high: meta.regularMarketDayHigh || 0,
            low: meta.regularMarketDayLow || 0,
            volume: meta.regularMarketVolume || 0,
            marketCap: meta.marketCap || 0,
            fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
            intradayChart,
            dailyChart,
            technicals: {
              ma5: ma5[ma5.length - 1] || 0,
              ma10: ma10[ma10.length - 1] || 0,
              ma20: ma20[ma20.length - 1] || 0,
              ma60: ma60[ma60.length - 1] || 0,
              rsi14: rsi14[rsi14.length - 1] || 50,
              macd: macd.macd[macd.macd.length - 1] || 0,
              signal: macd.signal[macd.signal.length - 1] || 0,
              histogram: macd.histogram[macd.histogram.length - 1] || 0,
            },
            isLive: true,
          };

          setCache(cacheKey, result);
          return result;
        } catch (err: any) {
          console.error(`[StockDetail] Failed to fetch ${input.symbol}:`, err?.message);
          return { symbol: input.symbol, isLive: false, error: err?.message };
        }
      }),

    // 获取股票详情（包含策略引擎理由）
    stockStrategy: publicProcedure
      .input(z.object({ symbol: z.string(), market: marketIdSchema }))
      .query(async ({ input }) => {
        try {
          const dbRecs = await getLatestRecommendations(input.market);
          const match = dbRecs.find(r => r.symbol === input.symbol || r.code === input.symbol);
          if (match) {
            return {
              found: true,
              reason: match.reason,
              reasonDetail: match.reasonDetail,
              tags: match.tags ? match.tags.split(',') : [],
              score: match.score,
              signal: match.signal,
              pe: match.pe,
              pb: match.pb,
              dividendYield: match.dividendYield,
              capitalFlow: match.capitalFlow,
            };
          }
          return { found: false };
        } catch {
          return { found: false };
        }
      }),

    // 获取市场情绪数据（策略引擎生成）
    sentimentData: publicProcedure
      .input(z.object({ market: marketIdSchema }))
      .query(async ({ input }) => {
        try {
          const data = await getLatestSentiment(input.market);
          return data || null;
        } catch {
          return null;
        }
      }),
  }),

  // ===================================================================
  // 策略引擎管理（管理员）
  // ===================================================================
  strategy: router({
    // 手动触发策略更新
    runNow: adminProcedure
      .input(z.object({ market: marketIdSchema.optional() }))
      .mutation(async ({ input }) => {
        try {
          if (input.market) {
            const result = await runStrategyForMarket(input.market);
            const batchId = nanoid();
            await saveStrategyResults(batchId, input.market, result.stocks, result.sentiment);
            // Clear cache for this market
            cache.delete(`recs-${input.market}`);
            return { success: true, market: input.market, stockCount: result.stocks.length };
          } else {
            const { batchId, results } = await runAllStrategies();
            for (const [mkt, result] of Object.entries(results)) {
              await saveStrategyResults(batchId, mkt, result.stocks, result.sentiment);
              cache.delete(`recs-${mkt}`);
            }
            return { success: true, markets: Object.keys(results), batchId };
          }
        } catch (err: any) {
          console.error('[Strategy] Manual run failed:', err?.message);
          return { success: false, error: err?.message };
        }
      }),

    // 获取策略运行状态
    status: adminProcedure.query(async () => {
      return {
        lastRun: strategyLastRun,
        nextRun: strategyNextRun,
        intervalMinutes: STRATEGY_INTERVAL_MINUTES,
        isRunning: strategyRunning,
      };
    }),
  }),

  // ===================================================================
  // 数字货币投资看板
  // ===================================================================
  cryptoBoard: router({
    // 检查当前用户的投资看板访问权限
    checkAccess: publicProcedure.query(async ({ ctx }) => {
      const userId = (ctx as any).user?.id;
      if (!userId) return { hasAccess: false, expiresAt: null, isExpired: false, isLoggedIn: false };
      const result = await checkCryptoBoardAccess(userId);
      return { ...result, isLoggedIn: true };
    }),

    // 获取投资看板数据（需要权限）
    getData: protectedProcedure.query(async ({ ctx }) => {
      // Check access permission
      const access = await checkCryptoBoardAccess(ctx.user.id);
      if (!access.hasAccess) {
        throw new Error(access.isExpired ? '您的投资看板权限已过期，请联系管理员续期' : '您暂无投资看板访问权限，请联系管理员开通');
      }
      // 1. Try in-memory cache first (fastest)
      const memData = getCryptoBoardData();
      if (memData && memData.mainstream.length > 0) return memData;
      // 2. Try DB cache (survives restarts + rate limits)
      const dbData = await loadCacheFromDB();
      if (dbData && dbData.mainstream.length > 0) return dbData;
      // 3. Last resort: trigger immediate fetch
      const fresh = await runCryptoBoardJob();
      if (fresh && fresh.mainstream.length > 0) return fresh;
      // 4. Try DB one more time (runCryptoBoardJob may have saved merged data)
      const dbRetry = await loadCacheFromDB();
      if (dbRetry && dbRetry.mainstream.length > 0) return dbRetry;
      // 5. Return loading placeholder only if absolutely nothing available
      return {
        mainstream: [],
        meme: [],
        btcDominance: 57.9,
        totalMarketCap: 0,
        advice: '数据加载中，请稍后刷新...',
        adviceEn: 'Loading data, please refresh later...',
        timestamp: Date.now(),
      };
    }),

    // 游客试用数据接口（公开，不需要登录）
    getDataPublic: publicProcedure.query(async () => {
      // 1. Try in-memory cache first
      const memData = getCryptoBoardData();
      if (memData && memData.mainstream.length > 0) return memData;
      // 2. Try DB cache
      const dbData = await loadCacheFromDB();
      if (dbData && dbData.mainstream.length > 0) return dbData;
      // 3. Trigger fetch
      const fresh = await runCryptoBoardJob();
      if (fresh && fresh.mainstream.length > 0) return fresh;
      // 4. DB retry
      const dbRetry = await loadCacheFromDB();
      if (dbRetry && dbRetry.mainstream.length > 0) return dbRetry;
      // 5. Loading placeholder
      return {
        mainstream: [],
        meme: [],
        btcDominance: 57.9,
        totalMarketCap: 0,
        advice: '数据加载中，请稍后刷新...',
        adviceEn: 'Loading data, please refresh later...',
        timestamp: Date.now(),
      };
    }),

    // OHLC K线数据（公开接口，用于全景看板弹窗）
    getOHLC: publicProcedure
      .input(z.object({
        symbol: z.string(),
        period: z.enum(['time', '1m', '5m', '15m', '1h', '4h', '1d']),
      }))
      .query(async ({ input }) => {
        const coinId = getCoinGeckoId(input.symbol);
        if (!coinId) return { candles: [], period: input.period };

        // Map period to CoinGecko OHLC days parameter
        // CoinGecko free OHLC: days=1 → 30min candles, days=7 → 4h candles,
        // days=14 → 4h, days=30 → daily, days=90/180/365 → daily
        let days: number;
        switch (input.period) {
          case 'time': days = 1; break;   // 30min candles for intraday
          case '1m':   days = 1; break;   // 30min candles (closest to 1m)
          case '5m':   days = 1; break;   // 30min candles
          case '15m':  days = 1; break;   // 30min candles
          case '1h':   days = 7; break;   // 4h candles for 7 days
          case '4h':   days = 14; break;  // 4h candles for 14 days
          case '1d':   days = 90; break;  // daily candles for 90 days
          default:     days = 7;
        }

        const candles = await fetchOHLC(coinId, days);
        return { candles, period: input.period };
      }),

    // 手动刷新（管理员）
    refresh: adminProcedure.mutation(async () => {
      const data = await runCryptoBoardJob();
      return { success: !!data, timestamp: Date.now() };
    }),
  }),

  // ===================================================================
  // 模拟投资看板（数字货币）
  // ===================================================================
  simInvestment: router({
    // 获取模拟投资数据（需要权限）
    getData: protectedProcedure.query(async ({ ctx }) => {
      const access = await checkCryptoBoardAccess(ctx.user.id);
      if (!access.hasAccess) {
        throw new Error(access.isExpired ? '权限已过期' : '无访问权限');
      }
      return await getSimPortfolioData();
    }),

    // 手动触发调仓（管理员）
    rebalance: adminProcedure.mutation(async () => {
      await runSimRebalance();
      return { success: true, timestamp: Date.now() };
    }),
  }),

  // ===================================================================
  // 模拟投资看板（A股）
  // ===================================================================
  simAshare: router({
    // 获取A股模拟投资数据（需要权限）
    getData: protectedProcedure.query(async ({ ctx }) => {
      const access = await checkCryptoBoardAccess(ctx.user.id);
      if (!access.hasAccess) {
        throw new Error(access.isExpired ? '权限已过期' : '无访问权限');
      }
      return await getSimAshareData();
    }),

    // 手动触发调仓（管理员）
    rebalance: adminProcedure.mutation(async () => {
      await runAshareRebalance();
      return { success: true, timestamp: Date.now() };
    }),
  }),
});

// ===================================================================
// 策略引擎定时任务
// ===================================================================
let strategyLastRun = 0;
let strategyNextRun = 0;
let strategyRunning = false;
const STRATEGY_INTERVAL_MINUTES = 5;

async function runStrategyJob() {
  if (strategyRunning) {
    console.log('[Strategy] Job already running, skipping...');
    return;
  }
  strategyRunning = true;
  try {
    console.log('[Strategy] Starting scheduled strategy run...');
    const { batchId, results } = await runAllStrategies();
    for (const [market, result] of Object.entries(results)) {
      if (result.stocks.length > 0) {
        await saveStrategyResults(batchId, market, result.stocks, result.sentiment);
        // Clear recommendation cache so next query gets fresh data
        cache.delete(`recs-${market}`);
      }
    }
    strategyLastRun = Date.now();
    console.log(`[Strategy] Scheduled run complete, batch=${batchId}`);

    // Clean old data weekly
    if (Math.random() < 0.01) { // ~1% chance per run = roughly once per ~8 hours
      await cleanOldStrategyData(7);
    }
  } catch (err: any) {
    console.error('[Strategy] Scheduled run failed:', err?.message);
  } finally {
    strategyRunning = false;
    strategyNextRun = Date.now() + STRATEGY_INTERVAL_MINUTES * 60 * 1000;
  }
}

// Start strategy engine timer
setTimeout(() => {
  console.log('[Strategy] Initial run starting in 10s...');
  runStrategyJob();
}, 10_000);

setInterval(() => {
  runStrategyJob();
}, STRATEGY_INTERVAL_MINUTES * 60 * 1000);

// Start crypto board scheduler
startCryptoBoardScheduler();

// Start simulated investment scheduler
startSimInvestmentScheduler();

// Start A-share simulated investment scheduler
startSimAshareScheduler();

// Initialize page access rules
initPageAccessRules();

// ===================================================================
// 技术指标计算
// ===================================================================
function calculateMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(0); continue; }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

function calculateRSI(data: number[], period: number): number[] {
  const result: number[] = [];
  if (data.length < period + 1) return data.map(() => 50);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period; avgLoss /= period;
  for (let i = 0; i <= period; i++) result.push(50);
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs));
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs2 = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs2));
  }
  return result;
}

function calculateMACD(data: number[], fast = 12, slow = 26, signal = 9) {
  const ema = (arr: number[], p: number) => {
    const k = 2 / (p + 1);
    const res = [arr[0]];
    for (let i = 1; i < arr.length; i++) res.push(arr[i] * k + res[i - 1] * (1 - k));
    return res;
  };
  const emaFast = ema(data, fast);
  const emaSlow = ema(data, slow);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = ema(macdLine, signal);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macd: macdLine, signal: signalLine, histogram };
}

export type AppRouter = typeof appRouter;
