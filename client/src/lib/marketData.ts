// ===================================================================
// 猎手阿尔法 HUNTER ALPHA — 市场数据层 v2
// 支持多市场、多语言
// ===================================================================

export interface IndexData {
  symbol: string;
  name: string;
  nameZh?: string; nameEn?: string; nameJa?: string; nameKo?: string; nameAr?: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  prevClose: number;
  chartData: { time: number; value: number }[];
  market?: string;
}

export interface StockRecommendation {
  rank: number;
  name: string;
  nameZh?: string; nameEn?: string;
  code: string;
  symbol?: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  score: number;
  signal: string;
  capitalFlow: number;
  reason: string;
  reasonZh?: string; reasonEn?: string;
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

// 模拟数据生成（当API不可用时的备用方案）
export function generateMockIndices(): IndexData[] {
  const baseData = [
    { symbol: '000001.SS', name: '上证指数', nameZh: '上证指数', nameEn: 'SSE Composite', base: 3280, vol: 320e9, market: 'cn' },
    { symbol: '399001.SZ', name: '深证成指', nameZh: '深证成指', nameEn: 'SZSE Component', base: 10850, vol: 420e9, market: 'cn' },
    { symbol: '399006.SZ', name: '创业板指', nameZh: '创业板指', nameEn: 'ChiNext', base: 2180, vol: 180e9, market: 'cn' },
    { symbol: '^HSI', name: '恒生指数', nameZh: '恒生指数', nameEn: 'Hang Seng', base: 22500, vol: 150e9, market: 'hk' },
    { symbol: '^GSPC', name: '标普500', nameZh: '标普500', nameEn: 'S&P 500', base: 5920, vol: 280e9, market: 'us' },
    { symbol: 'BTC-USD', name: '比特币', nameZh: '比特币', nameEn: 'Bitcoin', base: 96500, vol: 45e9, market: 'crypto' },
  ];

  return baseData.map((d) => {
    const change = (Math.random() - 0.45) * d.base * 0.025;
    const price = d.base + change;
    const chartData = generateMockChart(d.base, 48);
    return {
      symbol: d.symbol,
      name: d.name,
      nameZh: d.nameZh,
      nameEn: d.nameEn,
      price,
      change,
      changePercent: (change / d.base) * 100,
      high: price + Math.abs(change) * 0.3,
      low: price - Math.abs(change) * 0.3,
      volume: d.vol * (0.8 + Math.random() * 0.4),
      prevClose: d.base,
      chartData,
      market: d.market,
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
  if (indices.length === 0) return { attack: 25, defense: 68, oscillation: 42 };
  const avgChange = indices.reduce((s, i) => s + i.changePercent, 0) / indices.length;
  const volatility = indices.reduce((s, i) => s + Math.abs(i.changePercent), 0) / indices.length;
  return {
    attack: Math.round(Math.min(95, Math.max(5, 50 + avgChange * 15))),
    defense: Math.round(Math.min(95, Math.max(5, 70 - avgChange * 10))),
    oscillation: Math.round(Math.min(95, Math.max(5, 30 + volatility * 20))),
  };
}

// 动态权重分配
export function calculateWeights(scores: ModeScore): WeightAllocation {
  if (scores.defense > 60) return { fundamental: 50, capitalFlow: 30, technical: 20 };
  if (scores.attack > 60) return { fundamental: 30, capitalFlow: 40, technical: 30 };
  return { fundamental: 40, capitalFlow: 35, technical: 25 };
}

// 市场情绪指标
export function calculateSentiment(indices: IndexData[]): MarketSentiment {
  if (indices.length === 0) return { riseCount: 1717, flatCount: 94, fallCount: 3363, limitUp: 88, limitDown: 36 };
  const avgChange = indices.reduce((s, i) => s + i.changePercent, 0) / indices.length;
  const total = 5174;
  const riseRatio = Math.min(0.8, Math.max(0.15, 0.4 + avgChange * 0.08));
  const flatRatio = 0.02;
  const riseCount = Math.round(total * riseRatio);
  const flatCount = Math.round(total * flatRatio);
  return { riseCount, flatCount, fallCount: total - riseCount - flatCount, limitUp: Math.round(30 + riseRatio * 100), limitDown: Math.round(50 - riseRatio * 40) };
}

// 舆情摘要
export function generateNewsDigest(sentiment: MarketSentiment, scores: ModeScore): NewsDigest {
  const riseRatio = sentiment.riseCount / (sentiment.riseCount + sentiment.flatCount + sentiment.fallCount);
  let mainTone: string;
  if (riseRatio > 0.6) mainTone = '市场情绪回暖，赚钱效应显著，多头占据主导';
  else if (riseRatio > 0.4) mainTone = `市场震荡分化，涨跌比${(riseRatio * 100).toFixed(1)}%，机构态度谨慎`;
  else mainTone = '市场弱势运行，空头压制明显，注意防范风险';
  let capitalTrend = scores.attack > 50 ? '北向资金结构性流入，主力资金积极布局科技成长' : '北向资金结构性流入，资金弃高就低，防御板块受青睐';
  let strategy: string;
  if (scores.defense > 60) strategy = '控制仓位30-50%，关注高股息防御板块，等待市场企稳信号';
  else if (scores.attack > 60) strategy = '积极加仓至60-80%，重点布局科技、新能源等成长赛道';
  else strategy = '维持中性仓位50-60%，均衡配置价值与成长';
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
    const signals: string[] = ['buy', 'buy', 'add', 'add', 'add', 'hold', 'hold', 'hold', 'hold', 'hold'];
    return {
      rank: i + 1, name: s.name, code: s.code, industry: s.industry,
      price: Math.round(price * 100) / 100, change: Math.round((price - s.base) * 100) / 100,
      changePercent: Math.round(changePct * 100) / 100, score, signal: signals[i],
      capitalFlow: Math.round(flow * 100) / 100, reason: s.reason,
    };
  });
}

// 风控策略
export function getRiskControl(scores: ModeScore): RiskControl {
  const isDefensive = scores.defense > 60;
  return {
    stopLoss: isDefensive ? '-5%' : '-7%',
    takeProfit: ['+20% → 1/3', '+40% → 1/2', '→ trailing'],
    position: { current: isDefensive ? '30-50%' : '50-70%', bull: '80-100%', bear: '<30%' },
  };
}

// 恐惧贪婪指数计算
export function calculateFearGreed(indices: IndexData[], sentiment: MarketSentiment): number {
  const avgChange = indices.length > 0 ? indices.reduce((s, i) => s + i.changePercent, 0) / indices.length : 0;
  const riseRatio = sentiment.riseCount / (sentiment.riseCount + sentiment.flatCount + sentiment.fallCount);
  // Composite: 40% price momentum + 30% breadth + 30% volume
  const momentum = Math.min(100, Math.max(0, 50 + avgChange * 15));
  const breadth = riseRatio * 100;
  const volumeScore = 50; // baseline
  return Math.round(momentum * 0.4 + breadth * 0.3 + volumeScore * 0.3);
}
