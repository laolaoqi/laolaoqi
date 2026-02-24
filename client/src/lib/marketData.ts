// ===================================================================
// 猎手阿尔法 HUNTER ALPHA — 市场数据层
// 赛博战术指挥中心风格：数据即弹药，精准即生命
// ===================================================================

export interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  prevClose: number;
  chartData: { time: number; value: number }[];
}

export interface StockRecommendation {
  rank: number;
  name: string;
  code: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  score: number;
  signal: '买入' | '增持' | '观望' | '减持';
  capitalFlow: number;
  reason: string;
}

export interface ModeScore {
  attack: number;
  defense: number;
  oscillation: number;
}

export interface WeightAllocation {
  fundamental: number;
  capitalFlow: number;
  technical: number;
}

export interface MarketSentiment {
  riseCount: number;
  flatCount: number;
  fallCount: number;
  limitUp: number;
  limitDown: number;
}

export interface NewsDigest {
  mainTone: string;
  capitalTrend: string;
  strategy: string;
}

export interface RiskControl {
  stopLoss: string;
  takeProfit: string[];
  position: { current: string; bull: string; bear: string };
}

// Yahoo Finance API 获取实时行情
const API_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// 使用CORS代理或直接调用
async function fetchYahooChart(symbol: string, interval = '5m', range = '1d'): Promise<any> {
  try {
    const url = `${API_BASE}/${symbol}?interval=${interval}&range=${range}&includeAdjustedClose=true`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch {
    return null;
  }
}

// 解析Yahoo Finance数据
function parseYahooData(data: any): Partial<IndexData> | null {
  if (!data?.chart?.result?.[0]) return null;
  const result = data.chart.result[0];
  const meta = result.meta;
  const timestamps = result.timestamp || [];
  const quotes = result.indicators?.quote?.[0] || {};

  const chartData = timestamps
    .map((t: number, i: number) => ({
      time: t,
      value: quotes.close?.[i] ?? null,
    }))
    .filter((d: any) => d.value !== null);

  return {
    price: meta.regularMarketPrice,
    change: meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose),
    changePercent:
      ((meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose)) /
        (meta.chartPreviousClose || meta.previousClose)) *
      100,
    high: meta.regularMarketDayHigh,
    low: meta.regularMarketDayLow,
    volume: meta.regularMarketVolume,
    prevClose: meta.chartPreviousClose || meta.previousClose,
    chartData,
  };
}

// 指数配置
const INDEX_CONFIG = [
  { symbol: '000001.SS', name: '上证指数' },
  { symbol: '399001.SZ', name: '深证成指' },
  { symbol: '399006.SZ', name: '创业板指' },
  { symbol: '^HSI', name: '恒生指数' },
  { symbol: '^GSPC', name: '标普500' },
  { symbol: 'BTC-USD', name: '比特币' },
];

// 获取所有指数数据
export async function fetchAllIndices(): Promise<IndexData[]> {
  const results = await Promise.allSettled(
    INDEX_CONFIG.map(async (cfg) => {
      const data = await fetchYahooChart(cfg.symbol, '5m', '1d');
      const parsed = parseYahooData(data);
      if (parsed) {
        return {
          symbol: cfg.symbol,
          name: cfg.name,
          ...parsed,
        } as IndexData;
      }
      return null;
    })
  );

  return results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean) as IndexData[];
}

// 获取单个指数的日内数据
export async function fetchIndexIntraday(symbol: string): Promise<{ time: number; value: number }[]> {
  const data = await fetchYahooChart(symbol, '5m', '1d');
  const parsed = parseYahooData(data);
  return parsed?.chartData || [];
}

// 模拟数据生成（当API不可用时的备用方案）
export function generateMockIndices(): IndexData[] {
  const baseData = [
    { symbol: '000001.SS', name: '上证指数', base: 3280, vol: 320000000000 },
    { symbol: '399001.SZ', name: '深证成指', base: 10850, vol: 420000000000 },
    { symbol: '399006.SZ', name: '创业板指', base: 2180, vol: 180000000000 },
    { symbol: '^HSI', name: '恒生指数', base: 22500, vol: 150000000000 },
    { symbol: '^GSPC', name: '标普500', base: 5920, vol: 280000000000 },
    { symbol: 'BTC-USD', name: '比特币', base: 96500, vol: 45000000000 },
  ];

  return baseData.map((d) => {
    const change = (Math.random() - 0.45) * d.base * 0.025;
    const price = d.base + change;
    const chartData = generateMockChart(d.base, 48);
    return {
      symbol: d.symbol,
      name: d.name,
      price,
      change,
      changePercent: (change / d.base) * 100,
      high: price + Math.abs(change) * 0.3,
      low: price - Math.abs(change) * 0.3,
      volume: d.vol * (0.8 + Math.random() * 0.4),
      prevClose: d.base,
      chartData,
    };
  });
}

function generateMockChart(base: number, points: number): { time: number; value: number }[] {
  const now = Math.floor(Date.now() / 1000);
  const data: { time: number; value: number }[] = [];
  let val = base;
  for (let i = 0; i < points; i++) {
    val += (Math.random() - 0.48) * base * 0.003;
    data.push({ time: now - (points - i) * 300, value: val });
  }
  return data;
}

// 模式评分计算
export function calculateModeScores(indices: IndexData[]): ModeScore {
  if (indices.length === 0) {
    return { attack: 25, defense: 68, oscillation: 42 };
  }
  const avgChange = indices.reduce((s, i) => s + i.changePercent, 0) / indices.length;
  const volatility = indices.reduce((s, i) => s + Math.abs(i.changePercent), 0) / indices.length;

  let attack = Math.min(95, Math.max(5, 50 + avgChange * 15));
  let defense = Math.min(95, Math.max(5, 70 - avgChange * 10));
  let oscillation = Math.min(95, Math.max(5, 30 + volatility * 20));

  return {
    attack: Math.round(attack),
    defense: Math.round(defense),
    oscillation: Math.round(oscillation),
  };
}

// 动态权重分配
export function calculateWeights(scores: ModeScore): WeightAllocation {
  if (scores.defense > 60) {
    return { fundamental: 50, capitalFlow: 30, technical: 20 };
  } else if (scores.attack > 60) {
    return { fundamental: 30, capitalFlow: 40, technical: 30 };
  }
  return { fundamental: 40, capitalFlow: 35, technical: 25 };
}

// 市场情绪指标
export function calculateSentiment(indices: IndexData[]): MarketSentiment {
  if (indices.length === 0) {
    return { riseCount: 1717, flatCount: 94, fallCount: 3363, limitUp: 88, limitDown: 36 };
  }
  const avgChange = indices.reduce((s, i) => s + i.changePercent, 0) / indices.length;
  const total = 5174;
  const riseRatio = Math.min(0.8, Math.max(0.15, 0.4 + avgChange * 0.08));
  const flatRatio = 0.02;
  const riseCount = Math.round(total * riseRatio);
  const flatCount = Math.round(total * flatRatio);
  const fallCount = total - riseCount - flatCount;

  return {
    riseCount,
    flatCount,
    fallCount,
    limitUp: Math.round(30 + riseRatio * 100),
    limitDown: Math.round(50 - riseRatio * 40),
  };
}

// 舆情摘要
export function generateNewsDigest(sentiment: MarketSentiment, scores: ModeScore): NewsDigest {
  const riseRatio = sentiment.riseCount / (sentiment.riseCount + sentiment.flatCount + sentiment.fallCount);

  let mainTone: string;
  if (riseRatio > 0.6) mainTone = '市场情绪回暖，赚钱效应显著，多头占据主导';
  else if (riseRatio > 0.4) mainTone = `市场震荡分化，涨跌比${(riseRatio * 100).toFixed(1)}%，机构态度谨慎`;
  else mainTone = '市场弱势运行，空头压制明显，注意防范风险';

  let capitalTrend: string;
  if (scores.attack > 50) capitalTrend = '北向资金结构性流入，主力资金积极布局科技成长';
  else capitalTrend = '北向资金结构性流入，资金弃高就低，防御板块受青睐';

  let strategy: string;
  if (scores.defense > 60) strategy = `控制仓位30-50%，关注高股息防御板块，等待市场企稳信号`;
  else if (scores.attack > 60) strategy = `积极加仓至60-80%，重点布局科技、新能源等成长赛道`;
  else strategy = `维持中性仓位50-60%，均衡配置价值与成长`;

  return { mainTone, capitalTrend, strategy };
}

// 核心推荐 TOP 10
export function generateRecommendations(): StockRecommendation[] {
  const stocks = [
    { name: '招商银行', code: '600036', industry: '银行', base: 38.52, reason: '银行龙头，ROE持续领先' },
    { name: '中国平安', code: '601318', industry: '保险', base: 52.36, reason: '保险龙头，估值修复空间大' },
    { name: '贵州茅台', code: '600519', industry: '白酒', base: 1688.0, reason: '消费龙头，业绩确定性强' },
    { name: '宁德时代', code: '300750', industry: '新能源', base: 218.5, reason: '动力电池全球龙头' },
    { name: '比亚迪', code: '002594', industry: '汽车', base: 285.6, reason: '新能源车销量持续高增' },
    { name: '中芯国际', code: '688981', industry: '半导体', base: 78.9, reason: '国产替代核心标的' },
    { name: '长江电力', code: '600900', industry: '电力', base: 28.35, reason: '高股息防御首选' },
    { name: '海天味业', code: '603288', industry: '食品', base: 42.8, reason: '调味品龙头，渠道优势' },
    { name: '药明康德', code: '603259', industry: '医药', base: 52.6, reason: 'CXO龙头，订单回暖' },
    { name: '中国移动', code: '600941', industry: '通信', base: 108.5, reason: '高股息+AI算力概念' },
  ];

  return stocks.map((s, i) => {
    const changePct = (Math.random() - 0.4) * 5;
    const price = s.base * (1 + changePct / 100);
    const score = Math.round(92 - i * 3 + (Math.random() - 0.5) * 4);
    const flow = (Math.random() - 0.3) * 12;
    const signals: ('买入' | '增持' | '观望')[] = ['买入', '买入', '增持', '增持', '增持', '观望', '观望', '观望', '观望', '观望'];
    return {
      rank: i + 1,
      name: s.name,
      code: s.code,
      industry: s.industry,
      price: Math.round(price * 100) / 100,
      change: Math.round((price - s.base) * 100) / 100,
      changePercent: Math.round(changePct * 100) / 100,
      score,
      signal: signals[i],
      capitalFlow: Math.round(flow * 100) / 100,
      reason: s.reason,
    };
  });
}

// 风控策略
export function getRiskControl(scores: ModeScore): RiskControl {
  const isDefensive = scores.defense > 60;
  return {
    stopLoss: isDefensive ? '-5% 硬止损' : '-7% 硬止损',
    takeProfit: ['+20% 卖出1/3', '+40% 卖出1/2', '余下跟踪趋势止盈'],
    position: {
      current: isDefensive ? '30-50%' : '50-70%',
      bull: '80-100%',
      bear: '<30%',
    },
  };
}
