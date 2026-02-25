// ===================================================================
// Strategy Engine — 自动化选股系统
// 基于Yahoo Finance v8 Chart API的多维度评分策略引擎
// v8 chart API 不需要认证，比 v7 quote API 更可靠
// ===================================================================

import { nanoid } from "nanoid";

// ===================================================================
// Types
// ===================================================================
export interface StockCandidate {
  symbol: string;
  code: string;
  nameZh: string;
  nameEn: string;
  industry: string;
  market: string;
  price: number;
  change: number;
  changePercent: number;
  pe: number | null;
  pb: number | null;
  dividendYield: number | null;
  capitalFlow: number;
  marketCap: number;
  volume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  ma5: number;
  ma20: number;
  rsi14: number;
}

export interface ScoredStock extends StockCandidate {
  score: number;
  signal: string;
  reason: string;
  reasonDetail: string;
  tags: string[];
  rank: number;
}

export interface MarketSentimentResult {
  market: string;
  advanceRatio: number;
  mainForceFlow: number;
  marketState: string;
  stopLoss: number;
  positionSuggestion: number;
  advice: string;
}

// ===================================================================
// Yahoo Finance v8 Chart API (no auth required)
// ===================================================================
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface ChartResult {
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
  pe: number | null;
  dividendYield: number | null;
  closes: number[];
  volumes: number[];
}

async function fetchYahooChartData(symbol: string): Promise<ChartResult | null> {
  try {
    // Use v8 chart API with 1mo range to get both current price and historical data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo&includePrePost=false`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(12000),
    });
    if (resp.status !== 200) {
      console.error(`[Strategy] Chart API failed for ${symbol}: HTTP ${resp.status}`);
      return null;
    }
    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = (quotes.close || []).filter((v: any) => v != null && !isNaN(v));
    const volumes = (quotes.volume || []).filter((v: any) => v != null && !isNaN(v));

    const price = meta.regularMarketPrice || (closes.length > 0 ? closes[closes.length - 1] : 0);
    const previousClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    // Calculate 52-week high/low from available data
    let high52 = meta.fiftyTwoWeekHigh || 0;
    let low52 = meta.fiftyTwoWeekLow || 0;
    if (high52 === 0 && closes.length > 0) {
      high52 = Math.max(...closes);
      low52 = Math.min(...closes.filter((c: number) => c > 0));
    }

    return {
      price,
      previousClose,
      change,
      changePercent,
      volume: meta.regularMarketVolume || (volumes.length > 0 ? volumes[volumes.length - 1] : 0),
      fiftyTwoWeekHigh: high52,
      fiftyTwoWeekLow: low52,
      marketCap: 0, // Not available in chart API
      pe: null, // Will be estimated from known data
      dividendYield: null,
      closes,
      volumes,
    };
  } catch (err: any) {
    console.error(`[Strategy] Chart fetch error for ${symbol}:`, err?.message);
    return null;
  }
}

// ===================================================================
// Stock Universe — Candidate pools per market with known PE/PB/Dividend data
// ===================================================================
interface StockDef {
  symbol: string;
  nameZh: string;
  nameEn: string;
  industry: string;
  // Approximate fundamental data (updated periodically)
  approxPE?: number;
  approxPB?: number;
  approxDividend?: number;
}

const STOCK_UNIVERSE: Record<string, StockDef[]> = {
  cn: [
    { symbol: '600036.SS', nameZh: '招商银行', nameEn: 'CMB', industry: '银行', approxPE: 6.5, approxPB: 0.9, approxDividend: 4.2 },
    { symbol: '601318.SS', nameZh: '中国平安', nameEn: 'Ping An', industry: '保险', approxPE: 9.8, approxPB: 1.1, approxDividend: 3.5 },
    { symbol: '600519.SS', nameZh: '贵州茅台', nameEn: 'Moutai', industry: '白酒', approxPE: 28, approxPB: 9.5, approxDividend: 2.1 },
    { symbol: '000858.SZ', nameZh: '五粮液', nameEn: 'Wuliangye', industry: '白酒', approxPE: 20, approxPB: 5.2, approxDividend: 2.8 },
    { symbol: '300750.SZ', nameZh: '宁德时代', nameEn: 'CATL', industry: '新能源', approxPE: 22, approxPB: 5.8 },
    { symbol: '601012.SS', nameZh: '隆基绿能', nameEn: 'LONGi', industry: '光伏', approxPE: 35, approxPB: 2.1 },
    { symbol: '000333.SZ', nameZh: '美的集团', nameEn: 'Midea', industry: '家电', approxPE: 12, approxPB: 3.2, approxDividend: 3.0 },
    { symbol: '002594.SZ', nameZh: '比亚迪', nameEn: 'BYD', industry: '新能源车', approxPE: 25, approxPB: 4.5 },
    { symbol: '600900.SS', nameZh: '长江电力', nameEn: 'CYPC', industry: '电力', approxPE: 18, approxPB: 3.8, approxDividend: 3.5 },
    { symbol: '601899.SS', nameZh: '紫金矿业', nameEn: 'Zijin Mining', industry: '有色', approxPE: 14, approxPB: 3.0, approxDividend: 2.0 },
    { symbol: '600276.SS', nameZh: '恒瑞医药', nameEn: 'Hengrui', industry: '医药', approxPE: 55, approxPB: 8.5 },
    { symbol: '601166.SS', nameZh: '兴业银行', nameEn: 'CIB', industry: '银行', approxPE: 5.2, approxPB: 0.55, approxDividend: 5.5 },
    { symbol: '000002.SZ', nameZh: '万科A', nameEn: 'Vanke', industry: '地产', approxPE: 8, approxPB: 0.6, approxDividend: 4.0 },
    { symbol: '600809.SS', nameZh: '山西汾酒', nameEn: 'Fenjiu', industry: '白酒', approxPE: 30, approxPB: 10, approxDividend: 1.5 },
    { symbol: '603259.SS', nameZh: '药明康德', nameEn: 'WuXi AppTec', industry: '医药', approxPE: 18, approxPB: 3.5 },
    { symbol: '601888.SS', nameZh: '中国中免', nameEn: 'CDFG', industry: '免税', approxPE: 25, approxPB: 4.0 },
    { symbol: '600031.SS', nameZh: '三一重工', nameEn: 'Sany', industry: '机械', approxPE: 15, approxPB: 2.5, approxDividend: 2.5 },
    { symbol: '002475.SZ', nameZh: '立讯精密', nameEn: 'Luxshare', industry: '电子', approxPE: 20, approxPB: 4.0 },
    { symbol: '300059.SZ', nameZh: '东方财富', nameEn: 'East Money', industry: '金融科技', approxPE: 25, approxPB: 5.0 },
    { symbol: '601398.SS', nameZh: '工商银行', nameEn: 'ICBC', industry: '银行', approxPE: 5.0, approxPB: 0.5, approxDividend: 6.0 },
  ],
  hk: [
    { symbol: '0700.HK', nameZh: '腾讯控股', nameEn: 'Tencent', industry: '互联网', approxPE: 18, approxPB: 4.5, approxDividend: 0.8 },
    { symbol: '9988.HK', nameZh: '阿里巴巴', nameEn: 'Alibaba', industry: '电商', approxPE: 12, approxPB: 1.5, approxDividend: 1.2 },
    { symbol: '3690.HK', nameZh: '美团', nameEn: 'Meituan', industry: '本地生活', approxPE: 30, approxPB: 5.0 },
    { symbol: '1810.HK', nameZh: '小米集团', nameEn: 'Xiaomi', industry: '消费电子', approxPE: 20, approxPB: 3.5 },
    { symbol: '2318.HK', nameZh: '中国平安', nameEn: 'Ping An', industry: '金融', approxPE: 8, approxPB: 0.9, approxDividend: 4.5 },
    { symbol: '0941.HK', nameZh: '中国移动', nameEn: 'China Mobile', industry: '通信', approxPE: 10, approxPB: 1.2, approxDividend: 5.0 },
    { symbol: '1024.HK', nameZh: '快手', nameEn: 'Kuaishou', industry: '短视频', approxPE: 25, approxPB: 3.0 },
    { symbol: '9618.HK', nameZh: '京东集团', nameEn: 'JD.com', industry: '电商', approxPE: 10, approxPB: 1.8, approxDividend: 2.0 },
    { symbol: '0388.HK', nameZh: '港交所', nameEn: 'HKEX', industry: '金融', approxPE: 30, approxPB: 8.0, approxDividend: 2.5 },
    { symbol: '2020.HK', nameZh: '安踏体育', nameEn: 'Anta Sports', industry: '运动', approxPE: 22, approxPB: 5.5, approxDividend: 1.5 },
    { symbol: '9999.HK', nameZh: '网易', nameEn: 'NetEase', industry: '游戏', approxPE: 14, approxPB: 3.0, approxDividend: 2.0 },
    { symbol: '0001.HK', nameZh: '长和', nameEn: 'CK Hutchison', industry: '综合', approxPE: 8, approxPB: 0.5, approxDividend: 5.5 },
    { symbol: '0005.HK', nameZh: '汇丰控股', nameEn: 'HSBC', industry: '银行', approxPE: 7, approxPB: 0.9, approxDividend: 6.0 },
    { symbol: '2269.HK', nameZh: '药明生物', nameEn: 'WuXi Biologics', industry: '医药', approxPE: 35, approxPB: 4.0 },
    { symbol: '1211.HK', nameZh: '比亚迪电子', nameEn: 'BYD Electronic', industry: '电子', approxPE: 15, approxPB: 2.5 },
  ],
  us: [
    { symbol: 'AAPL', nameZh: '苹果', nameEn: 'Apple', industry: '科技', approxPE: 30, approxPB: 45, approxDividend: 0.5 },
    { symbol: 'MSFT', nameZh: '微软', nameEn: 'Microsoft', industry: '软件', approxPE: 35, approxPB: 12, approxDividend: 0.7 },
    { symbol: 'NVDA', nameZh: '英伟达', nameEn: 'NVIDIA', industry: '半导体', approxPE: 55, approxPB: 40 },
    { symbol: 'GOOGL', nameZh: '谷歌', nameEn: 'Alphabet', industry: '互联网', approxPE: 22, approxPB: 6.5 },
    { symbol: 'AMZN', nameZh: '亚马逊', nameEn: 'Amazon', industry: '电商', approxPE: 40, approxPB: 8.0 },
    { symbol: 'META', nameZh: 'Meta', nameEn: 'Meta', industry: '社交', approxPE: 25, approxPB: 7.5, approxDividend: 0.4 },
    { symbol: 'TSLA', nameZh: '特斯拉', nameEn: 'Tesla', industry: '新能源车', approxPE: 60, approxPB: 12 },
    { symbol: 'TSM', nameZh: '台积电', nameEn: 'TSMC', industry: '半导体', approxPE: 22, approxPB: 6.0, approxDividend: 1.5 },
    { symbol: 'BRK-B', nameZh: '伯克希尔', nameEn: 'Berkshire', industry: '综合', approxPE: 10, approxPB: 1.5 },
    { symbol: 'LLY', nameZh: '礼来', nameEn: 'Eli Lilly', industry: '医药', approxPE: 65, approxPB: 50 },
    { symbol: 'V', nameZh: 'Visa', nameEn: 'Visa', industry: '支付', approxPE: 28, approxPB: 12, approxDividend: 0.8 },
    { symbol: 'JPM', nameZh: '摩根大通', nameEn: 'JPMorgan', industry: '银行', approxPE: 12, approxPB: 2.0, approxDividend: 2.2 },
    { symbol: 'UNH', nameZh: '联合健康', nameEn: 'UnitedHealth', industry: '医疗', approxPE: 18, approxPB: 6.0, approxDividend: 1.5 },
    { symbol: 'MA', nameZh: '万事达', nameEn: 'Mastercard', industry: '支付', approxPE: 32, approxPB: 55, approxDividend: 0.6 },
    { symbol: 'COST', nameZh: '好市多', nameEn: 'Costco', industry: '零售', approxPE: 48, approxPB: 14, approxDividend: 0.6 },
    { symbol: 'AVGO', nameZh: '博通', nameEn: 'Broadcom', industry: '半导体', approxPE: 30, approxPB: 10, approxDividend: 1.3 },
    { symbol: 'HD', nameZh: '家得宝', nameEn: 'Home Depot', industry: '零售', approxPE: 24, approxPB: 200, approxDividend: 2.5 },
    { symbol: 'NFLX', nameZh: '奈飞', nameEn: 'Netflix', industry: '流媒体', approxPE: 40, approxPB: 15 },
    { symbol: 'CRM', nameZh: 'Salesforce', nameEn: 'Salesforce', industry: 'SaaS', approxPE: 40, approxPB: 4.5 },
    { symbol: 'AMD', nameZh: 'AMD', nameEn: 'AMD', industry: '半导体', approxPE: 45, approxPB: 4.0 },
  ],
  crypto: [
    { symbol: 'BTC-USD', nameZh: '比特币', nameEn: 'Bitcoin', industry: 'L1' },
    { symbol: 'ETH-USD', nameZh: '以太坊', nameEn: 'Ethereum', industry: 'L1' },
    { symbol: 'SOL-USD', nameZh: '索拉纳', nameEn: 'Solana', industry: 'L1' },
    { symbol: 'BNB-USD', nameZh: '币安币', nameEn: 'BNB', industry: '交易所' },
    { symbol: 'XRP-USD', nameZh: '瑞波', nameEn: 'XRP', industry: '支付' },
    { symbol: 'ADA-USD', nameZh: '卡尔达诺', nameEn: 'Cardano', industry: 'L1' },
    { symbol: 'DOGE-USD', nameZh: '狗狗币', nameEn: 'Dogecoin', industry: 'Meme' },
    { symbol: 'AVAX-USD', nameZh: '雪崩', nameEn: 'Avalanche', industry: 'L1' },
    { symbol: 'DOT-USD', nameZh: '波卡', nameEn: 'Polkadot', industry: '跨链' },
    { symbol: 'LINK-USD', nameZh: '预言机', nameEn: 'Chainlink', industry: '预言机' },
    { symbol: 'MATIC-USD', nameZh: 'Polygon', nameEn: 'Polygon', industry: 'L2' },
    { symbol: 'UNI-USD', nameZh: 'Uniswap', nameEn: 'Uniswap', industry: 'DeFi' },
  ],
};

// ===================================================================
// Technical Indicators
// ===================================================================

function calculateMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateRSI(data: number[], period = 14): number {
  if (data.length < period + 1) return 50;
  let avgGain = 0, avgLoss = 0;
  for (let i = data.length - period; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ===================================================================
// Scoring Engine
// ===================================================================

function scoreStock(stock: StockCandidate): number {
  let score = 50; // Base score

  // 1. Valuation Score (PE/PB) — 30% weight
  if (stock.pe !== null && stock.pe > 0) {
    if (stock.pe < 10) score += 15;
    else if (stock.pe < 15) score += 12;
    else if (stock.pe < 20) score += 8;
    else if (stock.pe < 30) score += 4;
    else if (stock.pe > 50) score -= 5;
  }
  if (stock.pb !== null && stock.pb > 0) {
    if (stock.pb < 1) score += 8;
    else if (stock.pb < 2) score += 5;
    else if (stock.pb < 3) score += 2;
    else if (stock.pb > 10) score -= 3;
  }

  // 2. Dividend Yield Score — 15% weight
  if (stock.dividendYield !== null && stock.dividendYield > 0) {
    if (stock.dividendYield >= 5) score += 10;
    else if (stock.dividendYield >= 4) score += 8;
    else if (stock.dividendYield >= 3) score += 6;
    else if (stock.dividendYield >= 2) score += 4;
    else if (stock.dividendYield >= 1) score += 2;
  }

  // 3. Capital Flow Score — 15% weight
  if (stock.capitalFlow > 5) score += 8;
  else if (stock.capitalFlow > 2) score += 5;
  else if (stock.capitalFlow > 0) score += 2;
  else if (stock.capitalFlow < -5) score -= 5;
  else if (stock.capitalFlow < -2) score -= 2;

  // 4. Technical Score (MA + RSI) — 20% weight
  if (stock.price > 0 && stock.ma20 > 0) {
    const maRatio = stock.price / stock.ma20;
    if (maRatio > 1.05) score += 5;
    else if (maRatio > 1.0) score += 3;
    else if (maRatio < 0.95) score -= 3;
  }
  if (stock.rsi14 > 0) {
    if (stock.rsi14 >= 30 && stock.rsi14 <= 70) score += 4;
    else if (stock.rsi14 < 30) score += 6; // Oversold = opportunity
    else if (stock.rsi14 > 80) score -= 4; // Overbought = risk
  }

  // 5. Momentum Score — 10% weight
  if (stock.changePercent > 3) score += 5;
  else if (stock.changePercent > 1) score += 3;
  else if (stock.changePercent > 0) score += 1;
  else if (stock.changePercent < -3) score -= 3;

  // 6. 52-week position — 10% weight
  if (stock.fiftyTwoWeekHigh > 0 && stock.fiftyTwoWeekLow > 0) {
    const range = stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow;
    if (range > 0) {
      const position = (stock.price - stock.fiftyTwoWeekLow) / range;
      if (position < 0.3) score += 5;
      else if (position < 0.5) score += 3;
      else if (position > 0.9) score -= 2;
    }
  }

  return Math.min(99, Math.max(10, Math.round(score)));
}

function determineSignal(score: number, changePercent: number, rsi: number): string {
  if (score >= 80 && changePercent > 0) return 'buy';
  if (score >= 65 && changePercent > -1) return 'add';
  if (score >= 45) return 'hold';
  return 'reduce';
}

function generateTags(stock: StockCandidate): string[] {
  const tags: string[] = [];
  if (stock.pe !== null && stock.pe > 0 && stock.pe < 15) tags.push('低估值');
  if (stock.pb !== null && stock.pb > 0 && stock.pb < 1.5) tags.push('破净');
  if (stock.dividendYield !== null && stock.dividendYield >= 4) tags.push('高股息');
  else if (stock.dividendYield !== null && stock.dividendYield >= 2) tags.push('稳定分红');
  if (stock.capitalFlow > 3) tags.push('主力流入');
  else if (stock.capitalFlow < -3) tags.push('主力流出');
  if (stock.rsi14 < 30) tags.push('超卖反弹');
  if (stock.rsi14 > 70) tags.push('强势');
  if (stock.price > stock.ma20 && stock.ma5 > stock.ma20) tags.push('多头排列');
  if (stock.changePercent > 3) tags.push('放量上涨');
  if (stock.fiftyTwoWeekHigh > 0 && stock.price >= stock.fiftyTwoWeekHigh * 0.95) tags.push('创新高');
  if (stock.fiftyTwoWeekLow > 0 && stock.price <= stock.fiftyTwoWeekLow * 1.1) tags.push('底部区域');
  return tags.slice(0, 5);
}

function generateReason(stock: StockCandidate, tags: string[]): string {
  const parts: string[] = [];
  if (tags.includes('低估值')) parts.push(`PE仅${stock.pe?.toFixed(1)}倍，估值偏低`);
  if (tags.includes('破净')) parts.push(`PB仅${stock.pb?.toFixed(2)}，低于净资产`);
  if (tags.includes('高股息')) parts.push(`股息率${stock.dividendYield?.toFixed(1)}%，高于市场平均`);
  if (tags.includes('稳定分红')) parts.push(`股息率${stock.dividendYield?.toFixed(1)}%，分红稳定`);
  if (tags.includes('主力流入')) parts.push(`主力资金净流入${stock.capitalFlow.toFixed(1)}亿`);
  if (tags.includes('超卖反弹')) parts.push(`RSI=${stock.rsi14.toFixed(0)}，超卖区间有反弹机会`);
  if (tags.includes('多头排列')) parts.push('均线多头排列，趋势向好');
  if (tags.includes('底部区域')) parts.push('接近52周低点，估值具有安全边际');
  if (tags.includes('创新高')) parts.push('接近52周高点，强势突破');
  if (parts.length === 0) parts.push('综合评分较高，基本面稳健');
  return `理由：${parts.join('、')}，适合${stock.changePercent > 0 ? '进攻' : '防御'}配置`;
}

function generateReasonDetail(stock: StockCandidate, score: number, tags: string[]): string {
  const lines: string[] = [];
  lines.push(`【${stock.nameZh}(${stock.code})综合评分：${score}分】`);
  lines.push('');
  lines.push('📊 核心指标：');
  lines.push(`  • 当前价格：${stock.price.toFixed(2)} (${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%)`);
  if (stock.pe !== null && stock.pe > 0) lines.push(`  • 市盈率(PE)：${stock.pe.toFixed(1)}倍`);
  if (stock.pb !== null && stock.pb > 0) lines.push(`  • 市净率(PB)：${stock.pb.toFixed(2)}倍`);
  if (stock.dividendYield !== null && stock.dividendYield > 0) lines.push(`  • 股息率：${stock.dividendYield.toFixed(2)}%`);
  lines.push(`  • 资金流向：${stock.capitalFlow >= 0 ? '+' : ''}${stock.capitalFlow.toFixed(1)}亿`);
  lines.push('');
  lines.push('📈 技术面：');
  lines.push(`  • RSI(14)：${stock.rsi14.toFixed(0)}`);
  if (stock.ma5 > 0) lines.push(`  • MA5：${stock.ma5.toFixed(2)}`);
  if (stock.ma20 > 0) lines.push(`  • MA20：${stock.ma20.toFixed(2)}`);
  if (stock.fiftyTwoWeekHigh > 0) lines.push(`  • 52周高低：${stock.fiftyTwoWeekLow.toFixed(2)} ~ ${stock.fiftyTwoWeekHigh.toFixed(2)}`);
  lines.push('');
  lines.push(`🏷️ 标签：${tags.join('、') || '综合推荐'}`);
  return lines.join('\n');
}

// ===================================================================
// Main Strategy Runner
// ===================================================================

export async function runStrategyForMarket(market: string): Promise<{ stocks: ScoredStock[]; sentiment: MarketSentimentResult }> {
  const universe = STOCK_UNIVERSE[market];
  if (!universe) {
    console.error(`[Strategy] Unknown market: ${market}`);
    return { stocks: [], sentiment: getDefaultSentiment(market) };
  }

  console.log(`[Strategy] Running strategy for ${market}, ${universe.length} candidates...`);

  // Fetch chart data for all candidates in parallel (batched)
  const candidates: StockCandidate[] = [];
  const batchSize = 5; // Fetch 5 at a time to avoid rate limiting
  
  for (let i = 0; i < universe.length; i += batchSize) {
    const batch = universe.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(def => fetchYahooChartData(def.symbol))
    );

    for (let j = 0; j < batch.length; j++) {
      const def = batch[j];
      const result = results[j];
      if (result.status !== 'fulfilled' || !result.value) continue;
      
      const chart = result.value;
      if (chart.price <= 0) continue;

      // Calculate technical indicators from chart data
      const ma5 = chart.closes.length >= 5 ? calculateMA(chart.closes, 5) : chart.price;
      const ma20 = chart.closes.length >= 20 ? calculateMA(chart.closes, 20) : chart.price;
      const rsi14 = chart.closes.length >= 15 ? calculateRSI(chart.closes, 14) : 50;

      // Calculate capital flow from volume pattern
      const recentVolumes = chart.volumes.slice(-5);
      const olderVolumes = chart.volumes.slice(-20, -5);
      const avgRecent = recentVolumes.length > 0 ? recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length : 0;
      const avgOlder = olderVolumes.length > 0 ? olderVolumes.reduce((a, b) => a + b, 0) / olderVolumes.length : avgRecent;
      const volumeRatio = avgOlder > 0 ? avgRecent / avgOlder : 1;
      const capitalFlow = (volumeRatio - 1) * 10 * (chart.changePercent > 0 ? 1 : -1);

      candidates.push({
        symbol: def.symbol,
        code: def.symbol.replace('.SS', '').replace('.SZ', '').replace('.HK', '').replace('-USD', ''),
        nameZh: def.nameZh,
        nameEn: def.nameEn,
        industry: def.industry,
        market,
        price: chart.price,
        change: chart.change,
        changePercent: chart.changePercent,
        pe: def.approxPE || chart.pe,
        pb: def.approxPB || null,
        dividendYield: def.approxDividend || chart.dividendYield,
        capitalFlow: Math.round(capitalFlow * 100) / 100,
        marketCap: chart.marketCap,
        volume: chart.volume,
        fiftyTwoWeekHigh: chart.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: chart.fiftyTwoWeekLow,
        ma5,
        ma20,
        rsi14,
      });
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < universe.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  if (candidates.length === 0) {
    console.warn(`[Strategy] No valid candidates for ${market}`);
    return { stocks: [], sentiment: getDefaultSentiment(market) };
  }

  console.log(`[Strategy] ${market}: Got ${candidates.length}/${universe.length} candidates with data`);

  // Score and rank
  const scored: ScoredStock[] = candidates.map(c => {
    const score = scoreStock(c);
    const tags = generateTags(c);
    const signal = determineSignal(score, c.changePercent, c.rsi14);
    const reason = generateReason(c, tags);
    const reasonDetail = generateReasonDetail(c, score, tags);
    return { ...c, score, signal, reason, reasonDetail, tags, rank: 0 };
  });

  scored.sort((a, b) => b.score - a.score);
  const top10 = scored.slice(0, 10);
  top10.forEach((s, i) => { s.rank = i + 1; });

  // Calculate market sentiment
  const advanceCount = candidates.filter(c => c.changePercent > 0).length;
  const advanceRatio = (advanceCount / candidates.length) * 100;
  const totalFlow = candidates.reduce((s, c) => s + c.capitalFlow, 0);
  const avgChange = candidates.reduce((s, c) => s + c.changePercent, 0) / candidates.length;

  let marketState = 'neutral';
  if (avgChange > 1.5 && advanceRatio > 60) marketState = 'bullish';
  else if (avgChange > 0.5 && advanceRatio > 50) marketState = 'slightly_bullish';
  else if (avgChange < -1.5 && advanceRatio < 40) marketState = 'bearish';
  else if (avgChange < -0.5 && advanceRatio < 50) marketState = 'slightly_bearish';

  const positionSuggestion = marketState === 'bullish' ? 80 : marketState === 'slightly_bullish' ? 70 : marketState === 'neutral' ? 50 : marketState === 'slightly_bearish' ? 30 : 20;
  const stopLoss = marketState === 'bearish' ? -3 : marketState === 'slightly_bearish' ? -5 : -8;

  const stateAdvice: Record<string, string> = {
    bullish: '市场情绪偏多，可适当加仓优质标的，注意高位风险',
    slightly_bullish: '市场温和上涨，维持现有仓位，关注板块轮动机会',
    neutral: '市场震荡整理，建议均衡配置，控制仓位在五成左右',
    slightly_bearish: '市场偏弱运行，建议减仓防御，关注低估值蓝筹',
    bearish: '市场恐慌下跌，建议轻仓观望，等待企稳信号',
  };

  const sentiment: MarketSentimentResult = {
    market,
    advanceRatio: Math.round(advanceRatio * 10) / 10,
    mainForceFlow: Math.round(totalFlow * 100) / 100,
    marketState,
    stopLoss,
    positionSuggestion,
    advice: stateAdvice[marketState] || stateAdvice.neutral,
  };

  console.log(`[Strategy] ${market}: ${top10.length} stocks scored, top=${top10[0]?.nameZh}(${top10[0]?.score}), sentiment=${marketState}`);
  return { stocks: top10, sentiment };
}

function getDefaultSentiment(market: string): MarketSentimentResult {
  return {
    market,
    advanceRatio: 50,
    mainForceFlow: 0,
    marketState: 'neutral',
    stopLoss: -5,
    positionSuggestion: 50,
    advice: '数据获取中，请稍后刷新',
  };
}

// ===================================================================
// Batch Runner — Run all markets
// ===================================================================

export async function runAllStrategies(): Promise<{
  batchId: string;
  results: Record<string, { stocks: ScoredStock[]; sentiment: MarketSentimentResult }>;
}> {
  const batchId = nanoid();
  const markets = ['cn', 'hk', 'us', 'crypto'];
  const results: Record<string, { stocks: ScoredStock[]; sentiment: MarketSentimentResult }> = {};

  for (const market of markets) {
    try {
      results[market] = await runStrategyForMarket(market);
    } catch (err: any) {
      console.error(`[Strategy] Failed for ${market}:`, err?.message);
      results[market] = { stocks: [], sentiment: getDefaultSentiment(market) };
    }
  }

  console.log(`[Strategy] Batch ${batchId} complete`);
  return { batchId, results };
}
