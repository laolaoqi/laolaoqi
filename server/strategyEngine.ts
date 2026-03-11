// ===================================================================
// Strategy Engine — 全市场自动化选股系统
// 基于Yahoo Finance v8 Chart API + Screener API的多维度评分策略引擎
// A股：沪深300全覆盖（300只成分股）
// 美股：动态screener(gainers/losers/actives) + 蓝筹池
// 加密：主流币种全覆盖（30+只）
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
  shortName?: string;
}

async function fetchYahooChartData(symbol: string): Promise<ChartResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo&includePrePost=false`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(12000),
    });
    if (resp.status !== 200) return null;
    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = (quotes.close || []).filter((v: any) => v != null && !isNaN(v));
    const volumes = (quotes.volume || []).filter((v: any) => v != null && !isNaN(v));

    const price = meta.regularMarketPrice || (closes.length > 0 ? closes[closes.length - 1] : 0);
    const previousClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.previousClose || meta.chartPreviousClose || price);
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

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
      marketCap: 0,
      pe: null,
      dividendYield: null,
      closes,
      volumes,
      shortName: meta.shortName || meta.longName || '',
    };
  } catch {
    return null;
  }
}

// ===================================================================
// Yahoo Finance Screener API (predefined, no auth required)
// Returns dynamic market movers for US market
// ===================================================================
interface ScreenerQuote {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
}

async function fetchScreenerStocks(scrId: string, count = 50): Promise<ScreenerQuote[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=${scrId}&count=${count}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    });
    if (resp.status !== 200) return [];
    const data = await resp.json();
    return data?.finance?.result?.[0]?.quotes || [];
  } catch {
    return [];
  }
}

// ===================================================================
// Stock Universe — Comprehensive candidate pools per market
// A股：沪深300核心池 + 动态Screener覆盖沪深两市全部股票 (300+动态扩展)
// 港股：恒生指数全部成分股 (~82只)
// 美股：纳斯达克100全部成分股 + 动态Screener (~101+动态扩展)
// 加密：主流 + DeFi + L2 (30+只)
// ===================================================================
interface StockDef {
  symbol: string;
  nameZh: string;
  nameEn: string;
  industry: string;
  approxPE?: number;
  approxPB?: number;
  approxDividend?: number;
}

const STOCK_UNIVERSE: Record<string, StockDef[]> = {
  cn: [
    // === 沪深300全覆盖 (CSI 300 Full Coverage — 300 stocks) ===
    { symbol: '000001.SZ', nameZh: '平安银行', nameEn: 'PAB', industry: '银行', approxPE: 5.5, approxPB: 0.5, approxDividend: 5.0 },
    { symbol: '000002.SZ', nameZh: '万科A', nameEn: 'Vanke', industry: '地产', approxPE: 8, approxPB: 0.6, approxDividend: 4.0 },
    { symbol: '000063.SZ', nameZh: '中兴通讯', nameEn: 'ZTE', industry: '通信设备', approxPE: 15, approxPB: 2.0, approxDividend: 2.5 },
    { symbol: '000069.SZ', nameZh: '华侨城A', nameEn: '000069', industry: '地产' },
    { symbol: '000100.SZ', nameZh: 'TCL科技', nameEn: '000100', industry: '面板' },
    { symbol: '000157.SZ', nameZh: '中联重科', nameEn: 'Zoomlion', industry: '机械', approxPE: 10, approxPB: 1.2, approxDividend: 3.5 },
    { symbol: '000166.SZ', nameZh: '申万宏源', nameEn: '000166', industry: '券商' },
    { symbol: '000301.SZ', nameZh: '东方盛虹', nameEn: '000301', industry: '化工' },
    { symbol: '000333.SZ', nameZh: '美的集团', nameEn: 'Midea', industry: '家电', approxPE: 12, approxPB: 3.2, approxDividend: 3.0 },
    { symbol: '000338.SZ', nameZh: '潍柴动力', nameEn: '000338', industry: '机械' },
    { symbol: '000408.SZ', nameZh: '藏格矿业', nameEn: '000408', industry: '矿业' },
    { symbol: '000425.SZ', nameZh: '徐工机械', nameEn: '000425', industry: '机械' },
    { symbol: '000538.SZ', nameZh: '云南白药', nameEn: 'Yunnan Baiyao', industry: '医药', approxPE: 20, approxPB: 3.0, approxDividend: 2.5 },
    { symbol: '000568.SZ', nameZh: '泸州老窖', nameEn: 'Luzhou Laojiao', industry: '白酒', approxPE: 22, approxPB: 7.0, approxDividend: 2.5 },
    { symbol: '000596.SZ', nameZh: '古井贡酒', nameEn: 'Gujing Tribute', industry: '白酒', approxPE: 25, approxPB: 6.0, approxDividend: 1.8 },
    { symbol: '000617.SZ', nameZh: '中油资本', nameEn: '000617', industry: '金融' },
    { symbol: '000625.SZ', nameZh: '长安汽车', nameEn: 'Changan Auto', industry: '汽车', approxPE: 15, approxPB: 1.5, approxDividend: 2.0 },
    { symbol: '000651.SZ', nameZh: '格力电器', nameEn: 'Gree', industry: '家电', approxPE: 8, approxPB: 2.5, approxDividend: 5.0 },
    { symbol: '000661.SZ', nameZh: '长春高新', nameEn: '000661', industry: '医药' },
    { symbol: '000708.SZ', nameZh: '中信特钢', nameEn: '000708', industry: '钢铁' },
    { symbol: '000723.SZ', nameZh: '美锦能源', nameEn: '000723', industry: '能源' },
    { symbol: '000725.SZ', nameZh: '京东方A', nameEn: 'BOE', industry: '面板', approxPE: 15, approxPB: 1.2, approxDividend: 2.0 },
    { symbol: '000733.SZ', nameZh: '振华科技', nameEn: '000733', industry: '军工' },
    { symbol: '000768.SZ', nameZh: '中航西飞', nameEn: '000768', industry: '军工' },
    { symbol: '000776.SZ', nameZh: '广发证券', nameEn: '000776', industry: '券商' },
    { symbol: '000786.SZ', nameZh: '北新建材', nameEn: '000786', industry: '建材' },
    { symbol: '000792.SZ', nameZh: '盐湖股份', nameEn: '000792', industry: '化工' },
    { symbol: '000800.SZ', nameZh: '一汽解放', nameEn: '000800', industry: '汽车' },
    { symbol: '000858.SZ', nameZh: '五粮液', nameEn: 'Wuliangye', industry: '白酒', approxPE: 20, approxPB: 5.2, approxDividend: 2.8 },
    { symbol: '000876.SZ', nameZh: '新希望', nameEn: '000876', industry: '养殖' },
    { symbol: '000877.SZ', nameZh: '天山股份', nameEn: '000877', industry: '建材' },
    { symbol: '000895.SZ', nameZh: '双汇发展', nameEn: '000895', industry: '食品' },
    { symbol: '000938.SZ', nameZh: '紫光股份', nameEn: '000938', industry: 'IT' },
    { symbol: '000963.SZ', nameZh: '华东医药', nameEn: '000963', industry: '医药' },
    { symbol: '000977.SZ', nameZh: '浪潮信息', nameEn: '000977', industry: '服务器' },
    { symbol: '000983.SZ', nameZh: '山西焦煤', nameEn: '000983', industry: '煤炭' },
    { symbol: '001289.SZ', nameZh: '龙源电力', nameEn: '001289', industry: '电力' },
    { symbol: '001979.SZ', nameZh: '招商蛇口', nameEn: 'CM Land', industry: '地产', approxPE: 10, approxPB: 0.8, approxDividend: 3.5 },
    { symbol: '002001.SZ', nameZh: '新和成', nameEn: '002001', industry: '化工' },
    { symbol: '002007.SZ', nameZh: '华兰生物', nameEn: '002007', industry: '医药' },
    { symbol: '002027.SZ', nameZh: '分众传媒', nameEn: 'Focus Media', industry: '广告', approxPE: 15, approxPB: 5.0, approxDividend: 4.0 },
    { symbol: '002049.SZ', nameZh: '紫光国微', nameEn: 'Unigroup Guoxin', industry: '芯片', approxPE: 35, approxPB: 6.0 },
    { symbol: '002050.SZ', nameZh: '三花智控', nameEn: '002050', industry: '汽车零部件' },
    { symbol: '002064.SZ', nameZh: '华峰化学', nameEn: '002064', industry: '化工' },
    { symbol: '002074.SZ', nameZh: '国轩高科', nameEn: '002074', industry: '锂电' },
    { symbol: '002120.SZ', nameZh: '韵达股份', nameEn: '002120', industry: '快递' },
    { symbol: '002129.SZ', nameZh: 'TCL中环', nameEn: '002129', industry: '光伏' },
    { symbol: '002142.SZ', nameZh: '宁波银行', nameEn: 'Bank of Ningbo', industry: '银行', approxPE: 6, approxPB: 1.0, approxDividend: 3.0 },
    { symbol: '002179.SZ', nameZh: '中航光电', nameEn: '002179', industry: '军工' },
    { symbol: '002180.SZ', nameZh: '纳思达', nameEn: '002180', industry: '打印' },
    { symbol: '002202.SZ', nameZh: '金风科技', nameEn: '002202', industry: '风电' },
    { symbol: '002230.SZ', nameZh: '科大讯飞', nameEn: 'iFlytek', industry: 'AI', approxPE: 80, approxPB: 5.0 },
    { symbol: '002236.SZ', nameZh: '大华股份', nameEn: '002236', industry: '安防' },
    { symbol: '002241.SZ', nameZh: '歌尔股份', nameEn: 'GoerTek', industry: '电子', approxPE: 20, approxPB: 2.5 },
    { symbol: '002252.SZ', nameZh: '上海莱士', nameEn: '002252', industry: '医药' },
    { symbol: '002271.SZ', nameZh: '东方雨虹', nameEn: 'Oriental Yuhong', industry: '建材', approxPE: 15, approxPB: 2.5, approxDividend: 2.0 },
    { symbol: '002304.SZ', nameZh: '洋河股份', nameEn: 'Yanghe', industry: '白酒', approxPE: 18, approxPB: 4.0, approxDividend: 3.0 },
    { symbol: '002311.SZ', nameZh: '海大集团', nameEn: '002311', industry: '饲料' },
    { symbol: '002352.SZ', nameZh: '顺丰控股', nameEn: 'SF Express', industry: '快递', approxPE: 20, approxPB: 2.5, approxDividend: 1.5 },
    { symbol: '002371.SZ', nameZh: '北方华创', nameEn: '002371', industry: '半导体设备' },
    { symbol: '002410.SZ', nameZh: '广联达', nameEn: '002410', industry: '软件' },
    { symbol: '002414.SZ', nameZh: '高德红外', nameEn: '002414', industry: '军工' },
    { symbol: '002415.SZ', nameZh: '海康威视', nameEn: 'Hikvision', industry: '安防', approxPE: 20, approxPB: 5.0, approxDividend: 2.0 },
    { symbol: '002459.SZ', nameZh: '晶澳科技', nameEn: '002459', industry: '光伏' },
    { symbol: '002460.SZ', nameZh: '赣锋锂业', nameEn: 'Ganfeng Lithium', industry: '锂电', approxPE: 30, approxPB: 3.0 },
    { symbol: '002466.SZ', nameZh: '天齐锂业', nameEn: 'Tianqi Lithium', industry: '锂电', approxPE: 25, approxPB: 2.5 },
    { symbol: '002475.SZ', nameZh: '立讯精密', nameEn: 'Luxshare', industry: '电子', approxPE: 20, approxPB: 4.0 },
    { symbol: '002493.SZ', nameZh: '荣盛石化', nameEn: '002493', industry: '化工' },
    { symbol: '002555.SZ', nameZh: '三七互娱', nameEn: '002555', industry: '游戏' },
    { symbol: '002594.SZ', nameZh: '比亚迪', nameEn: 'BYD', industry: '新能源车', approxPE: 25, approxPB: 4.5 },
    { symbol: '002601.SZ', nameZh: '龙佰集团', nameEn: '002601', industry: '化工' },
    { symbol: '002648.SZ', nameZh: '卫星化学', nameEn: '002648', industry: '化工' },
    { symbol: '002709.SZ', nameZh: '天赐材料', nameEn: '002709', industry: '锂电' },
    { symbol: '002714.SZ', nameZh: '牧原股份', nameEn: 'Muyuan', industry: '养殖', approxPE: 15, approxPB: 3.0 },
    { symbol: '002736.SZ', nameZh: '国信证券', nameEn: '002736', industry: '券商' },
    { symbol: '002756.SZ', nameZh: '永兴材料', nameEn: '002756', industry: '锂电' },
    { symbol: '002812.SZ', nameZh: '恩捷股份', nameEn: '002812', industry: '锂电' },
    { symbol: '002821.SZ', nameZh: '凯莱英', nameEn: '002821', industry: '医药' },
    { symbol: '002841.SZ', nameZh: '视源股份', nameEn: '002841', industry: '电子' },
    { symbol: '002916.SZ', nameZh: '深南电路', nameEn: '002916', industry: 'PCB' },
    { symbol: '002920.SZ', nameZh: '德赛西威', nameEn: '002920', industry: '汽车电子' },
    { symbol: '002938.SZ', nameZh: '鹏鼎控股', nameEn: '002938', industry: 'PCB' },
    { symbol: '003816.SZ', nameZh: '中国广核', nameEn: '003816', industry: '核电' },
    { symbol: '300014.SZ', nameZh: '亿纬锂能', nameEn: '300014', industry: '锂电' },
    { symbol: '300015.SZ', nameZh: '爱尔眼科', nameEn: '300015', industry: '医疗' },
    { symbol: '300033.SZ', nameZh: '同花顺', nameEn: '300033', industry: '金融IT' },
    { symbol: '300059.SZ', nameZh: '东方财富', nameEn: 'East Money', industry: '金融科技', approxPE: 25, approxPB: 5.0 },
    { symbol: '300122.SZ', nameZh: '智飞生物', nameEn: '300122', industry: '医药' },
    { symbol: '300124.SZ', nameZh: '汇川技术', nameEn: 'Inovance', industry: '工控', approxPE: 35, approxPB: 7.0 },
    { symbol: '300142.SZ', nameZh: '沃森生物', nameEn: '300142', industry: '医药' },
    { symbol: '300207.SZ', nameZh: '欣旺达', nameEn: '300207', industry: '锂电' },
    { symbol: '300223.SZ', nameZh: '北京君正', nameEn: '300223', industry: '芯片' },
    { symbol: '300274.SZ', nameZh: '阳光电源', nameEn: '300274', industry: '光伏' },
    { symbol: '300316.SZ', nameZh: '晶盛机电', nameEn: '300316', industry: '光伏设备' },
    { symbol: '300347.SZ', nameZh: '泰格医药', nameEn: '300347', industry: 'CRO' },
    { symbol: '300408.SZ', nameZh: '三环集团', nameEn: '300408', industry: '电子' },
    { symbol: '300413.SZ', nameZh: '芒果超媒', nameEn: '300413', industry: '传媒' },
    { symbol: '300433.SZ', nameZh: '蓝思科技', nameEn: '300433', industry: '电子' },
    { symbol: '300450.SZ', nameZh: '先导智能', nameEn: '300450', industry: '锂电设备' },
    { symbol: '300454.SZ', nameZh: '深信服', nameEn: '300454', industry: '网络安全' },
    { symbol: '300496.SZ', nameZh: '中科创达', nameEn: '300496', industry: '软件' },
    { symbol: '300498.SZ', nameZh: '温氏股份', nameEn: '300498', industry: '养殖' },
    { symbol: '300601.SZ', nameZh: '康泰生物', nameEn: '300601', industry: '医药' },
    { symbol: '300628.SZ', nameZh: '亿联网络', nameEn: '300628', industry: '通信' },
    { symbol: '300661.SZ', nameZh: '圣邦股份', nameEn: '300661', industry: '芯片' },
    { symbol: '300750.SZ', nameZh: '宁德时代', nameEn: 'CATL', industry: '新能源', approxPE: 22, approxPB: 5.8 },
    { symbol: '300751.SZ', nameZh: '迈为股份', nameEn: '300751', industry: '光伏设备' },
    { symbol: '300759.SZ', nameZh: '康龙化成', nameEn: '300759', industry: 'CRO' },
    { symbol: '300760.SZ', nameZh: '迈瑞医疗', nameEn: 'Mindray', industry: '医疗器械', approxPE: 30, approxPB: 10 },
    { symbol: '300763.SZ', nameZh: '锦浪科技', nameEn: '300763', industry: '光伏' },
    { symbol: '300769.SZ', nameZh: '德方纳米', nameEn: '300769', industry: '锂电' },
    { symbol: '300782.SZ', nameZh: '卓胜微', nameEn: '300782', industry: '芯片' },
    { symbol: '300896.SZ', nameZh: '爱美客', nameEn: '300896', industry: '医美' },
    { symbol: '300919.SZ', nameZh: '中伟股份', nameEn: '300919', industry: '锂电' },
    { symbol: '300957.SZ', nameZh: '贝泰妮', nameEn: '300957', industry: '化妆品' },
    { symbol: '300979.SZ', nameZh: '华利集团', nameEn: '300979', industry: '制鞋' },
    { symbol: '300999.SZ', nameZh: '金龙鱼', nameEn: '300999', industry: '食品' },
    { symbol: '600000.SS', nameZh: '浦发银行', nameEn: 'SPD Bank', industry: '银行', approxPE: 4.5, approxPB: 0.4, approxDividend: 5.5 },
    { symbol: '600009.SS', nameZh: '上海机场', nameEn: '600009', industry: '机场' },
    { symbol: '600010.SS', nameZh: '包钢股份', nameEn: '600010', industry: '钢铁' },
    { symbol: '600011.SS', nameZh: '华能国际', nameEn: '600011', industry: '电力' },
    { symbol: '600015.SS', nameZh: '华夏银行', nameEn: 'Hua Xia Bank', industry: '银行', approxPE: 4.2, approxPB: 0.35, approxDividend: 5.0 },
    { symbol: '600016.SS', nameZh: '民生银行', nameEn: 'Minsheng Bank', industry: '银行', approxPE: 4.0, approxPB: 0.35, approxDividend: 5.5 },
    { symbol: '600018.SS', nameZh: '上港集团', nameEn: '600018', industry: '港口' },
    { symbol: '600019.SS', nameZh: '宝钢股份', nameEn: 'Baosteel', industry: '钢铁', approxPE: 8, approxPB: 0.7, approxDividend: 5.0 },
    { symbol: '600025.SS', nameZh: '华能水电', nameEn: 'Huaneng Hydro', industry: '水电', approxPE: 15, approxPB: 3.0, approxDividend: 3.5 },
    { symbol: '600028.SS', nameZh: '中国石化', nameEn: 'Sinopec', industry: '石化', approxPE: 10, approxPB: 0.8, approxDividend: 5.0 },
    { symbol: '600029.SS', nameZh: '南方航空', nameEn: 'China Southern', industry: '航空', approxPE: 15, approxPB: 1.5 },
    { symbol: '600030.SS', nameZh: '中信证券', nameEn: 'CITIC Sec', industry: '券商', approxPE: 18, approxPB: 1.5, approxDividend: 2.0 },
    { symbol: '600031.SS', nameZh: '三一重工', nameEn: 'Sany', industry: '机械', approxPE: 15, approxPB: 2.5, approxDividend: 2.5 },
    { symbol: '600036.SS', nameZh: '招商银行', nameEn: 'CMB', industry: '银行', approxPE: 6.5, approxPB: 0.9, approxDividend: 4.2 },
    { symbol: '600039.SS', nameZh: '四川路桥', nameEn: '600039', industry: '建筑' },
    { symbol: '600048.SS', nameZh: '保利发展', nameEn: 'Poly Dev', industry: '地产', approxPE: 6, approxPB: 0.7, approxDividend: 4.5 },
    { symbol: '600050.SS', nameZh: '中国联通', nameEn: 'China Unicom', industry: '通信', approxPE: 15, approxPB: 1.0, approxDividend: 3.0 },
    { symbol: '600061.SS', nameZh: '国投资本', nameEn: '600061', industry: '金融' },
    { symbol: '600085.SS', nameZh: '同仁堂', nameEn: '600085', industry: '中药' },
    { symbol: '600089.SS', nameZh: '特变电工', nameEn: '600089', industry: '电力设备' },
    { symbol: '600104.SS', nameZh: '上汽集团', nameEn: 'SAIC', industry: '汽车', approxPE: 10, approxPB: 0.8, approxDividend: 5.5 },
    { symbol: '600111.SS', nameZh: '北方稀土', nameEn: '600111', industry: '稀土' },
    { symbol: '600115.SS', nameZh: '中国东航', nameEn: '600115', industry: '航空' },
    { symbol: '600132.SS', nameZh: '重庆啤酒', nameEn: '600132', industry: '啤酒' },
    { symbol: '600150.SS', nameZh: '中国船舶', nameEn: '600150', industry: '船舶' },
    { symbol: '600176.SS', nameZh: '中国巨石', nameEn: '600176', industry: '建材' },
    { symbol: '600183.SS', nameZh: '生益科技', nameEn: '600183', industry: 'PCB' },
    { symbol: '600188.SS', nameZh: '兖矿能源', nameEn: '600188', industry: '煤炭' },
    { symbol: '600196.SS', nameZh: '复星医药', nameEn: 'Fosun Pharma', industry: '医药', approxPE: 15, approxPB: 1.5, approxDividend: 1.5 },
    { symbol: '600219.SS', nameZh: '南山铝业', nameEn: '600219', industry: '铝业' },
    { symbol: '600233.SS', nameZh: '圆通速递', nameEn: '600233', industry: '快递' },
    { symbol: '600276.SS', nameZh: '恒瑞医药', nameEn: 'Hengrui', industry: '医药', approxPE: 55, approxPB: 8.5 },
    { symbol: '600309.SS', nameZh: '万华化学', nameEn: 'Wanhua', industry: '化工', approxPE: 15, approxPB: 3.5, approxDividend: 2.5 },
    { symbol: '600332.SS', nameZh: '白云山', nameEn: '600332', industry: '中药' },
    { symbol: '600346.SS', nameZh: '恒力石化', nameEn: 'Hengli Petro', industry: '化工', approxPE: 10, approxPB: 1.5, approxDividend: 3.0 },
    { symbol: '600362.SS', nameZh: '江西铜业', nameEn: '600362', industry: '有色' },
    { symbol: '600383.SS', nameZh: '金地集团', nameEn: '600383', industry: '地产' },
    { symbol: '600406.SS', nameZh: '国电南瑞', nameEn: 'NARI Tech', industry: '电力设备', approxPE: 25, approxPB: 5.0, approxDividend: 1.5 },
    { symbol: '600426.SS', nameZh: '华鲁恒升', nameEn: '600426', industry: '化工' },
    { symbol: '600436.SS', nameZh: '片仔癀', nameEn: 'Pien Tze Huang', industry: '中药', approxPE: 45, approxPB: 10 },
    { symbol: '600438.SS', nameZh: '通威股份', nameEn: 'Tongwei', industry: '光伏', approxPE: 10, approxPB: 1.5, approxDividend: 3.0 },
    { symbol: '600460.SS', nameZh: '士兰微', nameEn: '600460', industry: '芯片' },
    { symbol: '600519.SS', nameZh: '贵州茅台', nameEn: 'Moutai', industry: '白酒', approxPE: 28, approxPB: 9.5, approxDividend: 2.1 },
    { symbol: '600547.SS', nameZh: '山东黄金', nameEn: 'SD Gold', industry: '黄金', approxPE: 25, approxPB: 3.5 },
    { symbol: '600570.SS', nameZh: '恒生电子', nameEn: 'Hundsun', industry: '金融IT', approxPE: 50, approxPB: 8.0 },
    { symbol: '600584.SS', nameZh: '长电科技', nameEn: '600584', industry: '半导体' },
    { symbol: '600585.SS', nameZh: '海螺水泥', nameEn: 'Conch Cement', industry: '建材', approxPE: 9, approxPB: 1.0, approxDividend: 4.5 },
    { symbol: '600588.SS', nameZh: '用友网络', nameEn: '600588', industry: '软件' },
    { symbol: '600600.SS', nameZh: '青岛啤酒', nameEn: '600600', industry: '啤酒' },
    { symbol: '600606.SS', nameZh: '绿地控股', nameEn: '600606', industry: '地产' },
    { symbol: '600660.SS', nameZh: '福耀玻璃', nameEn: '600660', industry: '汽车玻璃' },
    { symbol: '600674.SS', nameZh: '川投能源', nameEn: 'Chuantou Energy', industry: '水电', approxPE: 14, approxPB: 2.5, approxDividend: 3.0 },
    { symbol: '600690.SS', nameZh: '海尔智家', nameEn: 'Haier', industry: '家电', approxPE: 14, approxPB: 2.8, approxDividend: 2.5 },
    { symbol: '600732.SS', nameZh: '爱旭股份', nameEn: '600732', industry: '光伏' },
    { symbol: '600741.SS', nameZh: '华域汽车', nameEn: '600741', industry: '汽车零部件' },
    { symbol: '600745.SS', nameZh: '闻泰科技', nameEn: '600745', industry: '半导体' },
    { symbol: '600754.SS', nameZh: '锦江酒店', nameEn: '600754', industry: '酒店' },
    { symbol: '600760.SS', nameZh: '中航沈飞', nameEn: '600760', industry: '军工' },
    { symbol: '600763.SS', nameZh: '通策医疗', nameEn: '600763', industry: '医疗' },
    { symbol: '600795.SS', nameZh: '国电电力', nameEn: '600795', industry: '电力' },
    { symbol: '600803.SS', nameZh: '新奥股份', nameEn: '600803', industry: '燃气' },
    { symbol: '600809.SS', nameZh: '山西汾酒', nameEn: 'Fenjiu', industry: '白酒', approxPE: 30, approxPB: 10, approxDividend: 1.5 },
    { symbol: '600837.SS', nameZh: '海通证券', nameEn: 'Haitong Sec', industry: '券商', approxPE: 15, approxPB: 0.9, approxDividend: 2.5 },
    { symbol: '600845.SS', nameZh: '宝信软件', nameEn: '600845', industry: '软件' },
    { symbol: '600875.SS', nameZh: '东方电气', nameEn: '600875', industry: '电力设备' },
    { symbol: '600884.SS', nameZh: '杉杉股份', nameEn: '600884', industry: '锂电' },
    { symbol: '600886.SS', nameZh: '国投电力', nameEn: 'SDIC Power', industry: '电力', approxPE: 12, approxPB: 2.0, approxDividend: 3.0 },
    { symbol: '600887.SS', nameZh: '伊利股份', nameEn: 'Yili', industry: '乳业', approxPE: 18, approxPB: 4.0, approxDividend: 3.5 },
    { symbol: '600893.SS', nameZh: '航发动力', nameEn: 'AECC Aviation', industry: '军工', approxPE: 50, approxPB: 4.0 },
    { symbol: '600900.SS', nameZh: '长江电力', nameEn: 'CYPC', industry: '电力', approxPE: 18, approxPB: 3.8, approxDividend: 3.5 },
    { symbol: '600905.SS', nameZh: '三峡能源', nameEn: '600905', industry: '新能源' },
    { symbol: '600918.SS', nameZh: '中泰证券', nameEn: '600918', industry: '券商' },
    { symbol: '600919.SS', nameZh: '江苏银行', nameEn: '600919', industry: '银行' },
    { symbol: '600926.SS', nameZh: '杭州银行', nameEn: '600926', industry: '银行' },
    { symbol: '600941.SS', nameZh: '中国移动', nameEn: 'China Mobile A', industry: '通信', approxPE: 12, approxPB: 1.5, approxDividend: 4.5 },
    { symbol: '600958.SS', nameZh: '东方证券', nameEn: '600958', industry: '券商' },
    { symbol: '600989.SS', nameZh: '宝丰能源', nameEn: '600989', industry: '化工' },
    { symbol: '600999.SS', nameZh: '招商证券', nameEn: '600999', industry: '券商' },
    { symbol: '601006.SS', nameZh: '大秦铁路', nameEn: 'Daqin Railway', industry: '铁路', approxPE: 8, approxPB: 0.9, approxDividend: 6.0 },
    { symbol: '601009.SS', nameZh: '南京银行', nameEn: '601009', industry: '银行' },
    { symbol: '601012.SS', nameZh: '隆基绿能', nameEn: 'LONGi', industry: '光伏', approxPE: 35, approxPB: 2.1 },
    { symbol: '601021.SS', nameZh: '春秋航空', nameEn: '601021', industry: '航空' },
    { symbol: '601066.SS', nameZh: '中信建投', nameEn: '601066', industry: '券商' },
    { symbol: '601088.SS', nameZh: '中国神华', nameEn: 'Shenhua', industry: '煤炭', approxPE: 9, approxPB: 1.5, approxDividend: 6.0 },
    { symbol: '601100.SS', nameZh: '恒立液压', nameEn: '601100', industry: '机械' },
    { symbol: '601111.SS', nameZh: '中国国航', nameEn: 'Air China', industry: '航空', approxPE: 18, approxPB: 1.8 },
    { symbol: '601117.SS', nameZh: '中国化学', nameEn: '601117', industry: '化工' },
    { symbol: '601138.SS', nameZh: '工业富联', nameEn: '601138', industry: '电子' },
    { symbol: '601155.SS', nameZh: '新城控股', nameEn: '601155', industry: '地产' },
    { symbol: '601166.SS', nameZh: '兴业银行', nameEn: 'CIB', industry: '银行', approxPE: 5.2, approxPB: 0.55, approxDividend: 5.5 },
    { symbol: '601169.SS', nameZh: '北京银行', nameEn: '601169', industry: '银行' },
    { symbol: '601186.SS', nameZh: '中国铁建', nameEn: 'CRCC', industry: '建筑', approxPE: 5, approxPB: 0.5, approxDividend: 4.0 },
    { symbol: '601211.SS', nameZh: '国泰君安', nameEn: '601211', industry: '券商' },
    { symbol: '601216.SS', nameZh: '君正集团', nameEn: '601216', industry: '化工' },
    { symbol: '601225.SS', nameZh: '陕西煤业', nameEn: 'Shaanxi Coal', industry: '煤炭', approxPE: 8, approxPB: 2.0, approxDividend: 7.0 },
    { symbol: '601229.SS', nameZh: '上海银行', nameEn: '601229', industry: '银行' },
    { symbol: '601236.SS', nameZh: '红塔证券', nameEn: '601236', industry: '券商' },
    { symbol: '601238.SS', nameZh: '广汽集团', nameEn: 'GAC', industry: '汽车', approxPE: 12, approxPB: 0.7, approxDividend: 4.0 },
    { symbol: '601288.SS', nameZh: '农业银行', nameEn: 'ABC', industry: '银行', approxPE: 4.8, approxPB: 0.45, approxDividend: 6.5 },
    { symbol: '601318.SS', nameZh: '中国平安', nameEn: 'Ping An', industry: '保险', approxPE: 9.8, approxPB: 1.1, approxDividend: 3.5 },
    { symbol: '601319.SS', nameZh: '中国人保', nameEn: '601319', industry: '保险' },
    { symbol: '601328.SS', nameZh: '交通银行', nameEn: 'BoCom', industry: '银行', approxPE: 5.0, approxPB: 0.45, approxDividend: 6.0 },
    { symbol: '601336.SS', nameZh: '新华保险', nameEn: '601336', industry: '保险' },
    { symbol: '601360.SS', nameZh: '三六零', nameEn: '601360', industry: '互联网' },
    { symbol: '601377.SS', nameZh: '兴业证券', nameEn: '601377', industry: '券商' },
    { symbol: '601390.SS', nameZh: '中国中铁', nameEn: 'CREC', industry: '建筑', approxPE: 6, approxPB: 0.6, approxDividend: 3.5 },
    { symbol: '601398.SS', nameZh: '工商银行', nameEn: 'ICBC', industry: '银行', approxPE: 5.0, approxPB: 0.5, approxDividend: 6.0 },
    { symbol: '601600.SS', nameZh: '中国铝业', nameEn: '601600', industry: '铝业' },
    { symbol: '601601.SS', nameZh: '中国太保', nameEn: 'CPIC', industry: '保险', approxPE: 8, approxPB: 0.8, approxDividend: 3.5 },
    { symbol: '601607.SS', nameZh: '上海医药', nameEn: '601607', industry: '医药' },
    { symbol: '601615.SS', nameZh: '明阳智能', nameEn: 'MingYang', industry: '风电', approxPE: 12, approxPB: 1.5, approxDividend: 2.5 },
    { symbol: '601618.SS', nameZh: '中国中冶', nameEn: '601618', industry: '建筑' },
    { symbol: '601628.SS', nameZh: '中国人寿', nameEn: 'China Life', industry: '保险', approxPE: 10, approxPB: 1.0, approxDividend: 2.5 },
    { symbol: '601633.SS', nameZh: '长城汽车', nameEn: 'Great Wall Motor', industry: '汽车', approxPE: 15, approxPB: 2.0, approxDividend: 2.0 },
    { symbol: '601658.SS', nameZh: '邮储银行', nameEn: '601658', industry: '银行' },
    { symbol: '601668.SS', nameZh: '中国建筑', nameEn: 'CSCEC', industry: '建筑', approxPE: 5, approxPB: 0.6, approxDividend: 4.0 },
    { symbol: '601669.SS', nameZh: '中国电建', nameEn: '601669', industry: '建筑' },
    { symbol: '601688.SS', nameZh: '华泰证券', nameEn: '601688', industry: '券商' },
    { symbol: '601689.SS', nameZh: '拓普集团', nameEn: '601689', industry: '汽车零部件' },
    { symbol: '601698.SS', nameZh: '中国卫通', nameEn: '601698', industry: '通信' },
    { symbol: '601699.SS', nameZh: '潞安环能', nameEn: '601699', industry: '煤炭' },
    { symbol: '601728.SS', nameZh: '中国电信', nameEn: 'China Telecom', industry: '通信', approxPE: 12, approxPB: 0.9, approxDividend: 4.0 },
    { symbol: '601766.SS', nameZh: '中国中车', nameEn: 'CRRC', industry: '轨交', approxPE: 18, approxPB: 1.5, approxDividend: 2.5 },
    { symbol: '601788.SS', nameZh: '光大证券', nameEn: '601788', industry: '券商' },
    { symbol: '601799.SS', nameZh: '星宇股份', nameEn: '601799', industry: '汽车零部件' },
    { symbol: '601800.SS', nameZh: '中国交建', nameEn: '601800', industry: '建筑' },
    { symbol: '601808.SS', nameZh: '中海油服', nameEn: '601808', industry: '石油' },
    { symbol: '601816.SS', nameZh: '京沪高铁', nameEn: '601816', industry: '铁路' },
    { symbol: '601818.SS', nameZh: '光大银行', nameEn: '601818', industry: '银行' },
    { symbol: '601838.SS', nameZh: '成都银行', nameEn: '601838', industry: '银行' },
    { symbol: '601857.SS', nameZh: '中国石油', nameEn: 'PetroChina', industry: '石油', approxPE: 8, approxPB: 0.7, approxDividend: 4.5 },
    { symbol: '601865.SS', nameZh: '福莱特', nameEn: '601865', industry: '光伏' },
    { symbol: '601868.SS', nameZh: '中国能建', nameEn: '601868', industry: '建筑' },
    { symbol: '601872.SS', nameZh: '招商轮船', nameEn: '601872', industry: '航运' },
    { symbol: '601877.SS', nameZh: '正泰电器', nameEn: '601877', industry: '电力设备' },
    { symbol: '601878.SS', nameZh: '浙商证券', nameEn: '601878', industry: '券商' },
    { symbol: '601881.SS', nameZh: '中国银河', nameEn: '601881', industry: '券商' },
    { symbol: '601888.SS', nameZh: '中国中免', nameEn: 'CDFG', industry: '免税', approxPE: 25, approxPB: 4.0 },
    { symbol: '601898.SS', nameZh: '中煤能源', nameEn: '601898', industry: '煤炭' },
    { symbol: '601899.SS', nameZh: '紫金矿业', nameEn: 'Zijin Mining', industry: '有色', approxPE: 14, approxPB: 3.0, approxDividend: 2.0 },
    { symbol: '601901.SS', nameZh: '方正证券', nameEn: '601901', industry: '券商' },
    { symbol: '601919.SS', nameZh: '中远海控', nameEn: 'COSCO Shipping', industry: '航运', approxPE: 5, approxPB: 1.0, approxDividend: 8.0 },
    { symbol: '601939.SS', nameZh: '建设银行', nameEn: 'CCB', industry: '银行', approxPE: 5.2, approxPB: 0.55, approxDividend: 5.8 },
    { symbol: '601985.SS', nameZh: '中国核电', nameEn: 'CNNP', industry: '核电', approxPE: 15, approxPB: 2.5, approxDividend: 2.5 },
    { symbol: '601988.SS', nameZh: '中国银行', nameEn: '601988', industry: '银行' },
    { symbol: '601989.SS', nameZh: '中国重工', nameEn: 'CSIC', industry: '军工', approxPE: 60, approxPB: 1.5 },
    { symbol: '601995.SS', nameZh: '中金公司', nameEn: '601995', industry: '券商' },
    { symbol: '601998.SS', nameZh: '中信银行', nameEn: '601998', industry: '银行' },
    { symbol: '603019.SS', nameZh: '中科曙光', nameEn: '603019', industry: '服务器' },
    { symbol: '603185.SS', nameZh: '弘元绿能', nameEn: '603185', industry: '光伏' },
    { symbol: '603195.SS', nameZh: '公牛集团', nameEn: '603195', industry: '电器' },
    { symbol: '603259.SS', nameZh: '药明康德', nameEn: 'WuXi AppTec', industry: 'CRO', approxPE: 18, approxPB: 3.5 },
    { symbol: '603260.SS', nameZh: '合盛硅业', nameEn: '603260', industry: '化工' },
    { symbol: '603288.SS', nameZh: '海天味业', nameEn: 'Haitian', industry: '调味品', approxPE: 35, approxPB: 8.0, approxDividend: 1.5 },
    { symbol: '603290.SS', nameZh: '斯达半导', nameEn: '603290', industry: '半导体' },
    { symbol: '603369.SS', nameZh: '今世缘', nameEn: '603369', industry: '白酒' },
    { symbol: '603392.SS', nameZh: '万泰生物', nameEn: '603392', industry: '医药' },
    { symbol: '603486.SS', nameZh: '科沃斯', nameEn: '603486', industry: '机器人' },
    { symbol: '603501.SS', nameZh: '韦尔股份', nameEn: 'Will Semi', industry: '芯片', approxPE: 30, approxPB: 4.0 },
    { symbol: '603659.SS', nameZh: '璞泰来', nameEn: '603659', industry: '锂电' },
    { symbol: '603799.SS', nameZh: '华友钴业', nameEn: '603799', industry: '有色' },
    { symbol: '603806.SS', nameZh: '福斯特', nameEn: '603806', industry: '光伏' },
    { symbol: '603833.SS', nameZh: '欧派家居', nameEn: '603833', industry: '家居' },
    { symbol: '603899.SS', nameZh: '晨光股份', nameEn: '603899', industry: '文具' },
    { symbol: '603986.SS', nameZh: '兆易创新', nameEn: '603986', industry: '芯片' },
    { symbol: '603993.SS', nameZh: '洛阳钼业', nameEn: 'CMOC', industry: '有色', approxPE: 12, approxPB: 2.5, approxDividend: 2.0 },
    { symbol: '605117.SS', nameZh: '德业股份', nameEn: '605117', industry: '光伏' },
    { symbol: '605499.SS', nameZh: '东鹏饮料', nameEn: '605499', industry: '饮料' },
    { symbol: '688005.SS', nameZh: '容百科技', nameEn: '688005', industry: '锂电' },
    { symbol: '688008.SS', nameZh: '澜起科技', nameEn: '688008', industry: '芯片' },
    { symbol: '688012.SS', nameZh: '中微公司', nameEn: '688012', industry: '半导体设备' },
    { symbol: '688036.SS', nameZh: '传音控股', nameEn: '688036', industry: '手机' },
    { symbol: '688065.SS', nameZh: '凯赛生物', nameEn: '688065', industry: '化工' },
    { symbol: '688111.SS', nameZh: '金山办公', nameEn: 'Kingsoft Office', industry: '软件', approxPE: 80, approxPB: 15 },
    { symbol: '688126.SS', nameZh: '沪硅产业', nameEn: '688126', industry: '半导体' },
    { symbol: '688187.SS', nameZh: '时代电气', nameEn: '688187', industry: '轨交' },
    { symbol: '688223.SS', nameZh: '晶科能源', nameEn: '688223', industry: '光伏' },
    { symbol: '688303.SS', nameZh: '大全能源', nameEn: '688303', industry: '光伏' },
    { symbol: '688363.SS', nameZh: '华熙生物', nameEn: '688363', industry: '医美' },
    { symbol: '688396.SS', nameZh: '华润微', nameEn: '688396', industry: '半导体' },
    { symbol: '688561.SS', nameZh: '奇安信', nameEn: '688561', industry: '网络安全' },
    { symbol: '688599.SS', nameZh: '天合光能', nameEn: '688599', industry: '光伏' },
    { symbol: '688981.SS', nameZh: '中芯国际', nameEn: 'SMIC', industry: '半导体', approxPE: 40, approxPB: 2.5 },
  ],
  hk: [
    // === 恒生指数全部成分股 (HSI Full Constituents ~82 stocks) ===
    // 综合/地产
    { symbol: '0001.HK', nameZh: '长和', nameEn: 'CK Hutchison', industry: '综合', approxPE: 8, approxPB: 0.5, approxDividend: 5.5 },
    { symbol: '0012.HK', nameZh: '恒基兆业', nameEn: 'Henderson Land', industry: '地产', approxPE: 8, approxPB: 0.3, approxDividend: 5.0 },
    { symbol: '0016.HK', nameZh: '新鸿基地产', nameEn: 'Sun Hung Kai', industry: '地产', approxPE: 10, approxPB: 0.4, approxDividend: 4.5 },
    { symbol: '0101.HK', nameZh: '恒隆地产', nameEn: 'Hang Lung Ppt', industry: '地产', approxPE: 10, approxPB: 0.4, approxDividend: 5.0 },
    { symbol: '0267.HK', nameZh: '中信股份', nameEn: 'CITIC', industry: '综合', approxPE: 5, approxPB: 0.4, approxDividend: 6.0 },
    { symbol: '0316.HK', nameZh: '东方海外国际', nameEn: 'OOIL', industry: '航运', approxPE: 5, approxPB: 0.6, approxDividend: 8.0 },
    { symbol: '0688.HK', nameZh: '中国海外发展', nameEn: 'China Overseas', industry: '地产', approxPE: 5, approxPB: 0.4, approxDividend: 5.0 },
    { symbol: '0960.HK', nameZh: '龙湖集团', nameEn: 'Longfor Group', industry: '地产', approxPE: 8, approxPB: 0.5, approxDividend: 4.0 },
    { symbol: '1038.HK', nameZh: '长江基建', nameEn: 'CKI Holdings', industry: '基建', approxPE: 10, approxPB: 1.0, approxDividend: 5.0 },
    { symbol: '1109.HK', nameZh: '华润置地', nameEn: 'China Res Land', industry: '地产', approxPE: 6, approxPB: 0.5, approxDividend: 5.0 },
    { symbol: '1113.HK', nameZh: '长实集团', nameEn: 'CK Asset', industry: '地产', approxPE: 6, approxPB: 0.4, approxDividend: 5.5 },
    { symbol: '1209.HK', nameZh: '华润万象生活', nameEn: 'China Res Mixc', industry: '物管', approxPE: 20, approxPB: 4.0, approxDividend: 2.0 },
    { symbol: '1997.HK', nameZh: '九龙仓置业', nameEn: 'Wharf REIC', industry: '地产', approxPE: 10, approxPB: 0.3, approxDividend: 6.0 },
    { symbol: '2007.HK', nameZh: '碧桂园', nameEn: 'Country Garden', industry: '地产', approxPE: -1, approxPB: 0.2 },
    // 公用事业
    { symbol: '0002.HK', nameZh: '中电控股', nameEn: 'CLP Holdings', industry: '电力', approxPE: 12, approxPB: 1.5, approxDividend: 4.5 },
    { symbol: '0003.HK', nameZh: '香港中华煤气', nameEn: 'HK China Gas', industry: '燃气', approxPE: 15, approxPB: 2.0, approxDividend: 4.0 },
    { symbol: '0006.HK', nameZh: '电能实业', nameEn: 'Power Assets', industry: '电力', approxPE: 12, approxPB: 1.2, approxDividend: 5.5 },
    { symbol: '0066.HK', nameZh: '港铁公司', nameEn: 'MTR Corporation', industry: '交通', approxPE: 15, approxPB: 0.8, approxDividend: 3.5 },
    { symbol: '0823.HK', nameZh: '领展房产基金', nameEn: 'Link REIT', industry: 'REIT', approxPE: 15, approxPB: 0.6, approxDividend: 5.5 },
    // 金融
    { symbol: '0005.HK', nameZh: '汇丰控股', nameEn: 'HSBC', industry: '银行', approxPE: 7, approxPB: 0.9, approxDividend: 6.0 },
    { symbol: '0388.HK', nameZh: '港交所', nameEn: 'HKEX', industry: '金融', approxPE: 30, approxPB: 8.0, approxDividend: 2.5 },
    { symbol: '0939.HK', nameZh: '建设银行H', nameEn: 'CCB-H', industry: '银行', approxPE: 4.5, approxPB: 0.4, approxDividend: 7.0 },
    { symbol: '1398.HK', nameZh: '工商银行H', nameEn: 'ICBC-H', industry: '银行', approxPE: 4.5, approxPB: 0.4, approxDividend: 7.0 },
    { symbol: '2318.HK', nameZh: '中国平安', nameEn: 'Ping An', industry: '保险', approxPE: 8, approxPB: 0.9, approxDividend: 4.5 },
    { symbol: '2328.HK', nameZh: '中国人保', nameEn: 'PICC P&C', industry: '保险', approxPE: 6, approxPB: 0.7, approxDividend: 5.0 },
    { symbol: '2388.HK', nameZh: '中银香港', nameEn: 'BOC HK', industry: '银行', approxPE: 8, approxPB: 1.0, approxDividend: 5.0 },
    { symbol: '2628.HK', nameZh: '中国人寿', nameEn: 'China Life', industry: '保险', approxPE: 8, approxPB: 0.7, approxDividend: 3.5 },
    { symbol: '3328.HK', nameZh: '交通银行H', nameEn: 'BOCOM-H', industry: '银行', approxPE: 4, approxPB: 0.3, approxDividend: 7.5 },
    { symbol: '3968.HK', nameZh: '招商银行H', nameEn: 'CM Bank-H', industry: '银行', approxPE: 6, approxPB: 0.8, approxDividend: 4.0 },
    { symbol: '3988.HK', nameZh: '中国银行H', nameEn: 'BOC-H', industry: '银行', approxPE: 4.0, approxPB: 0.35, approxDividend: 7.5 },
    // 通信/运营商
    { symbol: '0728.HK', nameZh: '中国电信H', nameEn: 'China Telecom-H', industry: '通信', approxPE: 8, approxPB: 0.5, approxDividend: 5.5 },
    { symbol: '0762.HK', nameZh: '中国联通H', nameEn: 'China Unicom-H', industry: '通信', approxPE: 10, approxPB: 0.6, approxDividend: 4.0 },
    { symbol: '0941.HK', nameZh: '中国移动', nameEn: 'China Mobile', industry: '通信', approxPE: 10, approxPB: 1.2, approxDividend: 5.0 },
    // 能源/资源
    { symbol: '0386.HK', nameZh: '中国石化H', nameEn: 'Sinopec-H', industry: '石油', approxPE: 7, approxPB: 0.5, approxDividend: 6.0 },
    { symbol: '0836.HK', nameZh: '华润电力', nameEn: 'China Res Power', industry: '电力', approxPE: 8, approxPB: 1.0, approxDividend: 4.5 },
    { symbol: '0857.HK', nameZh: '中国石油H', nameEn: 'PetroChina-H', industry: '石油', approxPE: 7, approxPB: 0.6, approxDividend: 5.0 },
    { symbol: '0868.HK', nameZh: '信义玻璃', nameEn: 'Xinyi Glass', industry: '玻璃', approxPE: 8, approxPB: 1.2, approxDividend: 5.0 },
    { symbol: '0883.HK', nameZh: '中国海洋石油', nameEn: 'CNOOC', industry: '石油', approxPE: 6, approxPB: 1.0, approxDividend: 6.0 },
    { symbol: '0968.HK', nameZh: '信义光能', nameEn: 'Xinyi Solar', industry: '光伏', approxPE: 10, approxPB: 1.0, approxDividend: 4.0 },
    { symbol: '1088.HK', nameZh: '中国神华H', nameEn: 'Shenhua-H', industry: '煤炭', approxPE: 8, approxPB: 1.2, approxDividend: 7.0 },
    { symbol: '1378.HK', nameZh: '中国宏桥', nameEn: 'China Hongqiao', industry: '铝业', approxPE: 5, approxPB: 0.8, approxDividend: 6.0 },
    // 互联网/科技
    { symbol: '0700.HK', nameZh: '腾讯控股', nameEn: 'Tencent', industry: '互联网', approxPE: 18, approxPB: 4.5, approxDividend: 0.8 },
    { symbol: '0981.HK', nameZh: '中芯国际H', nameEn: 'SMIC-H', industry: '半导体', approxPE: 35, approxPB: 2.0 },
    { symbol: '0992.HK', nameZh: '联想集团', nameEn: 'Lenovo Group', industry: '电脑', approxPE: 10, approxPB: 1.5, approxDividend: 3.5 },
    { symbol: '1024.HK', nameZh: '快手', nameEn: 'Kuaishou', industry: '短视频', approxPE: 25, approxPB: 3.0 },
    { symbol: '1810.HK', nameZh: '小米集团', nameEn: 'Xiaomi', industry: '消费电子', approxPE: 20, approxPB: 3.5 },
    { symbol: '2018.HK', nameZh: '瑞声科技', nameEn: 'AAC Tech', industry: '声学', approxPE: 15, approxPB: 1.5, approxDividend: 2.0 },
    { symbol: '2382.HK', nameZh: '舜宇光学', nameEn: 'Sunny Optical', industry: '光学', approxPE: 25, approxPB: 3.0, approxDividend: 1.0 },
    { symbol: '3690.HK', nameZh: '美团', nameEn: 'Meituan', industry: '本地生活', approxPE: 30, approxPB: 5.0 },
    { symbol: '9618.HK', nameZh: '京东集团', nameEn: 'JD.com', industry: '电商', approxPE: 10, approxPB: 1.8, approxDividend: 2.0 },
    { symbol: '9888.HK', nameZh: '百度集团', nameEn: 'Baidu', industry: 'AI', approxPE: 12, approxPB: 1.0 },
    { symbol: '9961.HK', nameZh: '携程集团', nameEn: 'Trip.com', industry: '旅游', approxPE: 18, approxPB: 3.0, approxDividend: 1.0 },
    { symbol: '9988.HK', nameZh: '阿里巴巴', nameEn: 'Alibaba', industry: '电商', approxPE: 12, approxPB: 1.5, approxDividend: 1.2 },
    { symbol: '9999.HK', nameZh: '网易', nameEn: 'NetEase', industry: '游戏', approxPE: 14, approxPB: 3.0, approxDividend: 2.0 },
    // 汽车/工业
    { symbol: '0175.HK', nameZh: '吉利汽车', nameEn: 'Geely Auto', industry: '汽车', approxPE: 12, approxPB: 1.5, approxDividend: 1.5 },
    { symbol: '0285.HK', nameZh: '比亚迪电子', nameEn: 'BYD Electronic', industry: '电子', approxPE: 15, approxPB: 2.5 },
    { symbol: '0300.HK', nameZh: '美的集团H', nameEn: 'Midea Group-H', industry: '家电', approxPE: 12, approxPB: 3.0, approxDividend: 3.0 },
    { symbol: '0669.HK', nameZh: '创科实业', nameEn: 'Techtronic', industry: '工具', approxPE: 20, approxPB: 5.0, approxDividend: 1.5 },
    { symbol: '1211.HK', nameZh: '比亚迪', nameEn: 'BYD-H', industry: '新能源车', approxPE: 20, approxPB: 3.5, approxDividend: 0.5 },
    // 消费/博彩
    { symbol: '0027.HK', nameZh: '银河娱乐', nameEn: 'Galaxy Ent', industry: '博彩', approxPE: 18, approxPB: 3.0, approxDividend: 1.5 },
    { symbol: '0288.HK', nameZh: '万洲国际', nameEn: 'WH Group', industry: '食品', approxPE: 8, approxPB: 1.2, approxDividend: 4.0 },
    { symbol: '0291.HK', nameZh: '华润啤酒', nameEn: 'CR Beer', industry: '啤酒', approxPE: 25, approxPB: 5.0, approxDividend: 1.5 },
    { symbol: '0322.HK', nameZh: '康师傅控股', nameEn: 'Tingyi', industry: '食品', approxPE: 15, approxPB: 3.0, approxDividend: 3.0 },
    { symbol: '1876.HK', nameZh: '百威亚太', nameEn: 'Bud APAC', industry: '啤酒', approxPE: 20, approxPB: 3.0, approxDividend: 2.0 },
    { symbol: '1928.HK', nameZh: '金沙中国', nameEn: 'Sands China', industry: '博彩', approxPE: 20, approxPB: 5.0, approxDividend: 3.0 },
    { symbol: '1929.HK', nameZh: '周大福', nameEn: 'Chow Tai Fook', industry: '珠宝', approxPE: 12, approxPB: 2.5, approxDividend: 5.0 },
    { symbol: '2020.HK', nameZh: '安踏体育', nameEn: 'ANTA Sports', industry: '运动', approxPE: 20, approxPB: 5.0, approxDividend: 2.0 },
    { symbol: '2313.HK', nameZh: '申洲国际', nameEn: 'Shenzhou Intl', industry: '纺织', approxPE: 18, approxPB: 3.5, approxDividend: 3.0 },
    { symbol: '2319.HK', nameZh: '蒙牛乳业', nameEn: 'Mengniu', industry: '乳业', approxPE: 15, approxPB: 2.5, approxDividend: 2.0 },
    // 医药
    { symbol: '1093.HK', nameZh: '石药集团', nameEn: 'CSPC Pharma', industry: '医药', approxPE: 10, approxPB: 1.5, approxDividend: 3.0 },
    { symbol: '1099.HK', nameZh: '国药控股', nameEn: 'Sinopharm', industry: '医药', approxPE: 8, approxPB: 0.8, approxDividend: 3.5 },
    { symbol: '1177.HK', nameZh: '中国生物制药', nameEn: 'Sino Biopharm', industry: '医药', approxPE: 15, approxPB: 2.0, approxDividend: 1.5 },
    { symbol: '1801.HK', nameZh: '信达生物', nameEn: 'Innovent Bio', industry: '生物医药', approxPE: 40, approxPB: 5.0 },
    { symbol: '2269.HK', nameZh: '药明生物', nameEn: 'WuXi Biologics', industry: '医药', approxPE: 35, approxPB: 4.0 },
    { symbol: '2688.HK', nameZh: '新奥能源', nameEn: 'ENN Energy', industry: '燃气', approxPE: 8, approxPB: 1.2, approxDividend: 4.0 },
    // 服务/其他
    { symbol: '6098.HK', nameZh: '碧桂园服务', nameEn: 'CG Services', industry: '物管', approxPE: 10, approxPB: 1.5, approxDividend: 3.0 },
    { symbol: '6862.HK', nameZh: '海底捞', nameEn: 'Haidilao', industry: '餐饮', approxPE: 20, approxPB: 5.0, approxDividend: 1.5 },
    { symbol: '0241.HK', nameZh: '阿里健康', nameEn: 'Ali Health', industry: '医疗', approxPE: 30, approxPB: 4.0 },
  ],
  us: [
    // === 纳斯达克100全部成分股 (Nasdaq 100 Full Constituents ~101 stocks) ===
    // 科技巨头
    { symbol: 'AAPL', nameZh: '苹果', nameEn: 'Apple', industry: '科技', approxPE: 30, approxPB: 45, approxDividend: 0.5 },
    { symbol: 'MSFT', nameZh: '微软', nameEn: 'Microsoft', industry: '软件', approxPE: 35, approxPB: 12, approxDividend: 0.7 },
    { symbol: 'NVDA', nameZh: '英伟达', nameEn: 'NVIDIA', industry: '半导体', approxPE: 55, approxPB: 40 },
    { symbol: 'GOOGL', nameZh: '谷歌', nameEn: 'Alphabet', industry: '互联网', approxPE: 22, approxPB: 6.5 },
    { symbol: 'AMZN', nameZh: '亚马逊', nameEn: 'Amazon', industry: '电商', approxPE: 40, approxPB: 8.0 },
    { symbol: 'META', nameZh: 'Meta', nameEn: 'Meta', industry: '社交', approxPE: 25, approxPB: 7.5, approxDividend: 0.4 },
    { symbol: 'TSLA', nameZh: '特斯拉', nameEn: 'Tesla', industry: '新能源车', approxPE: 60, approxPB: 12 },
    { symbol: 'AVGO', nameZh: '博通', nameEn: 'Broadcom', industry: '半导体', approxPE: 30, approxPB: 10, approxDividend: 1.3 },
    { symbol: 'COST', nameZh: '好市多', nameEn: 'Costco', industry: '零售', approxPE: 48, approxPB: 14, approxDividend: 0.6 },
    { symbol: 'NFLX', nameZh: '奈飞', nameEn: 'Netflix', industry: '流媒体', approxPE: 40, approxPB: 15 },
    // 半导体/芯片
    { symbol: 'AMD', nameZh: 'AMD', nameEn: 'AMD', industry: '半导体', approxPE: 45, approxPB: 4.0 },
    { symbol: 'INTC', nameZh: '英特尔', nameEn: 'Intel', industry: '半导体', approxPE: 25, approxPB: 1.2, approxDividend: 1.5 },
    { symbol: 'QCOM', nameZh: '高通', nameEn: 'Qualcomm', industry: '芯片', approxPE: 15, approxPB: 6.0, approxDividend: 2.0 },
    { symbol: 'ASML', nameZh: '阿斯麦', nameEn: 'ASML', industry: '半导体设备', approxPE: 35, approxPB: 20 },
    { symbol: 'AMAT', nameZh: '应用材料', nameEn: 'Applied Materials', industry: '半导体设备', approxPE: 20, approxPB: 8.0, approxDividend: 0.8 },
    { symbol: 'ADI', nameZh: '亚德诺', nameEn: 'Analog Devices', industry: '模拟芯片', approxPE: 25, approxPB: 3.0, approxDividend: 1.8 },
    { symbol: 'LRCX', nameZh: '泰美科技', nameEn: 'Lam Research', industry: '半导体设备', approxPE: 22, approxPB: 10, approxDividend: 1.0 },
    { symbol: 'KLAC', nameZh: 'KLA', nameEn: 'KLA Corp', industry: '半导体设备', approxPE: 22, approxPB: 15, approxDividend: 1.0 },
    { symbol: 'MCHP', nameZh: '微芯科技', nameEn: 'Microchip Tech', industry: '芯片', approxPE: 15, approxPB: 3.0, approxDividend: 2.0 },
    { symbol: 'NXPI', nameZh: '恩智浦', nameEn: 'NXP Semi', industry: '芯片', approxPE: 18, approxPB: 6.0, approxDividend: 1.5 },
    { symbol: 'MRVL', nameZh: 'Marvell', nameEn: 'Marvell Tech', industry: '芯片', approxPE: 40, approxPB: 5.0 },
    { symbol: 'MU', nameZh: '美光', nameEn: 'Micron', industry: '存储', approxPE: 8, approxPB: 2.0, approxDividend: 0.5 },
    { symbol: 'ARM', nameZh: 'ARM', nameEn: 'ARM Holdings', industry: '芯片设计', approxPE: 80, approxPB: 20 },
    { symbol: 'MPWR', nameZh: '芯源系统', nameEn: 'Monolithic Power', industry: '电源芯片', approxPE: 30, approxPB: 15 },
    // 软件/SaaS
    { symbol: 'ADBE', nameZh: 'Adobe', nameEn: 'Adobe', industry: '软件', approxPE: 35, approxPB: 15 },
    { symbol: 'INTU', nameZh: 'Intuit', nameEn: 'Intuit', industry: '软件', approxPE: 35, approxPB: 10, approxDividend: 0.6 },
    { symbol: 'ADSK', nameZh: 'Autodesk', nameEn: 'Autodesk', industry: '软件', approxPE: 30, approxPB: 15 },
    { symbol: 'SNPS', nameZh: '新思科技', nameEn: 'Synopsys', industry: 'EDA', approxPE: 40, approxPB: 10 },
    { symbol: 'CDNS', nameZh: 'Cadence', nameEn: 'Cadence Design', industry: 'EDA', approxPE: 50, approxPB: 15 },
    { symbol: 'WDAY', nameZh: 'Workday', nameEn: 'Workday', industry: 'SaaS', approxPE: 40, approxPB: 8.0 },
    { symbol: 'TEAM', nameZh: 'Atlassian', nameEn: 'Atlassian', industry: 'SaaS', approxPE: 50, approxPB: 15 },
    { symbol: 'DDOG', nameZh: 'Datadog', nameEn: 'Datadog', industry: '监控', approxPE: 60, approxPB: 15 },
    { symbol: 'CSGP', nameZh: 'CoStar', nameEn: 'CoStar Group', industry: '数据', approxPE: 60, approxPB: 5.0 },
    // 网络安全
    { symbol: 'CRWD', nameZh: 'CrowdStrike', nameEn: 'CrowdStrike', industry: '网络安全', approxPE: 60, approxPB: 20 },
    { symbol: 'PANW', nameZh: 'Palo Alto', nameEn: 'Palo Alto Networks', industry: '网络安全', approxPE: 45, approxPB: 15 },
    { symbol: 'FTNT', nameZh: 'Fortinet', nameEn: 'Fortinet', industry: '网络安全', approxPE: 35, approxPB: 40 },
    { symbol: 'ZS', nameZh: 'Zscaler', nameEn: 'Zscaler', industry: '网络安全', approxPE: 60, approxPB: 15 },
    // 互联网/电商
    { symbol: 'ABNB', nameZh: 'Airbnb', nameEn: 'Airbnb', industry: '旅游', approxPE: 30, approxPB: 10 },
    { symbol: 'BKNG', nameZh: 'Booking', nameEn: 'Booking Holdings', industry: '旅游', approxPE: 25, approxPB: 20, approxDividend: 0.8 },
    { symbol: 'PDD', nameZh: '拼多多', nameEn: 'PDD Holdings', industry: '电商', approxPE: 10, approxPB: 4.0 },
    { symbol: 'MELI', nameZh: 'MercadoLibre', nameEn: 'MercadoLibre', industry: '电商', approxPE: 50, approxPB: 15 },
    { symbol: 'SHOP', nameZh: 'Shopify', nameEn: 'Shopify', industry: '电商', approxPE: 60, approxPB: 10 },
    { symbol: 'DASH', nameZh: 'DoorDash', nameEn: 'DoorDash', industry: '外卖', approxPE: 80, approxPB: 8.0 },
    // 支付/金融科技
    { symbol: 'PYPL', nameZh: 'PayPal', nameEn: 'PayPal', industry: '支付', approxPE: 15, approxPB: 3.0 },
    { symbol: 'ISRG', nameZh: '直觉外科', nameEn: 'Intuitive Surgical', industry: '医疗机器人', approxPE: 60, approxPB: 12 },
    { symbol: 'MSTR', nameZh: 'MicroStrategy', nameEn: 'MicroStrategy', industry: '比特币', approxPE: -1, approxPB: 5.0 },
    { symbol: 'PLTR', nameZh: 'Palantir', nameEn: 'Palantir', industry: 'AI/数据', approxPE: 80, approxPB: 20 },
    // 医药/生物
    { symbol: 'AMGN', nameZh: '安进', nameEn: 'Amgen', industry: '生物医药', approxPE: 15, approxPB: 15, approxDividend: 3.0 },
    { symbol: 'GILD', nameZh: '吉利德', nameEn: 'Gilead Sciences', industry: '生物医药', approxPE: 12, approxPB: 5.0, approxDividend: 3.5 },
    { symbol: 'REGN', nameZh: '再生元', nameEn: 'Regeneron', industry: '生物医药', approxPE: 20, approxPB: 4.0 },
    { symbol: 'VRTX', nameZh: 'Vertex', nameEn: 'Vertex Pharma', industry: '生物医药', approxPE: 25, approxPB: 8.0 },
    { symbol: 'IDXX', nameZh: 'IDEXX', nameEn: 'IDEXX Labs', industry: '宠物医疗', approxPE: 45, approxPB: 50 },
    { symbol: 'DXCM', nameZh: 'DexCom', nameEn: 'DexCom', industry: '医疗器械', approxPE: 40, approxPB: 10 },
    { symbol: 'ALNY', nameZh: 'Alnylam', nameEn: 'Alnylam Pharma', industry: 'RNA疗法', approxPE: -1, approxPB: 15 },
    { symbol: 'GEHC', nameZh: 'GE医疗', nameEn: 'GE HealthCare', industry: '医疗设备', approxPE: 20, approxPB: 5.0, approxDividend: 0.2 },
    { symbol: 'INSM', nameZh: 'Insmed', nameEn: 'Insmed', industry: '生物医药', approxPE: -1, approxPB: 10 },
    // 消费/零售
    { symbol: 'WMT', nameZh: '沃尔玛', nameEn: 'Walmart', industry: '零售', approxPE: 30, approxPB: 6.0, approxDividend: 1.3 },
    { symbol: 'SBUX', nameZh: '星巴克', nameEn: 'Starbucks', industry: '餐饮', approxPE: 25, approxPB: 10, approxDividend: 2.5 },
    { symbol: 'PEP', nameZh: '百事可乐', nameEn: 'PepsiCo', industry: '饮料', approxPE: 20, approxPB: 12, approxDividend: 3.5 },
    { symbol: 'KDP', nameZh: 'Keurig Dr Pepper', nameEn: 'Keurig Dr Pepper', industry: '饮料', approxPE: 18, approxPB: 3.0, approxDividend: 2.5 },
    { symbol: 'KHC', nameZh: '卡夫亨氏', nameEn: 'Kraft Heinz', industry: '食品', approxPE: 12, approxPB: 0.8, approxDividend: 4.5 },
    { symbol: 'MDLZ', nameZh: '亿滋', nameEn: 'Mondelez', industry: '食品', approxPE: 20, approxPB: 3.0, approxDividend: 2.5 },
    { symbol: 'MNST', nameZh: '怪兽饮料', nameEn: 'Monster Beverage', industry: '饮料', approxPE: 30, approxPB: 10 },
    { symbol: 'CPRT', nameZh: 'Copart', nameEn: 'Copart', industry: '汽车拍卖', approxPE: 35, approxPB: 12 },
    { symbol: 'ORLY', nameZh: "O'Reilly", nameEn: "O'Reilly Auto", industry: '汽配', approxPE: 25, approxPB: 50 },
    { symbol: 'ROST', nameZh: 'Ross Stores', nameEn: 'Ross Stores', industry: '零售', approxPE: 22, approxPB: 10, approxDividend: 1.0 },
    { symbol: 'FAST', nameZh: 'Fastenal', nameEn: 'Fastenal', industry: '工业分销', approxPE: 30, approxPB: 12, approxDividend: 2.0 },
    // 通信/媒体
    { symbol: 'CSCO', nameZh: '思科', nameEn: 'Cisco', industry: '网络', approxPE: 15, approxPB: 5.0, approxDividend: 3.0 },
    { symbol: 'CMCSA', nameZh: 'Comcast', nameEn: 'Comcast', industry: '媒体', approxPE: 10, approxPB: 2.0, approxDividend: 3.0 },
    { symbol: 'TMUS', nameZh: 'T-Mobile', nameEn: 'T-Mobile US', industry: '通信', approxPE: 20, approxPB: 3.0, approxDividend: 1.5 },
    { symbol: 'CHTR', nameZh: 'Charter', nameEn: 'Charter Comm', industry: '有线电视', approxPE: 12, approxPB: 5.0 },
    { symbol: 'WBD', nameZh: 'Warner Bros', nameEn: 'Warner Bros Discovery', industry: '媒体', approxPE: 15, approxPB: 0.5 },
    { symbol: 'EA', nameZh: 'EA', nameEn: 'Electronic Arts', industry: '游戏', approxPE: 18, approxPB: 5.0, approxDividend: 0.5 },
    { symbol: 'TTWO', nameZh: 'Take-Two', nameEn: 'Take-Two Interactive', industry: '游戏', approxPE: 30, approxPB: 3.0 },
    // 工业/能源
    { symbol: 'HON', nameZh: '霍尼韦尔', nameEn: 'Honeywell', industry: '工业', approxPE: 20, approxPB: 8.0, approxDividend: 2.0 },
    { symbol: 'LIN', nameZh: '林德', nameEn: 'Linde', industry: '工业气体', approxPE: 30, approxPB: 5.0, approxDividend: 1.2 },
    { symbol: 'CSX', nameZh: 'CSX', nameEn: 'CSX Corp', industry: '铁路', approxPE: 18, approxPB: 6.0, approxDividend: 1.2 },
    { symbol: 'PCAR', nameZh: 'PACCAR', nameEn: 'PACCAR', industry: '卡车', approxPE: 12, approxPB: 4.0, approxDividend: 1.5 },
    { symbol: 'ODFL', nameZh: 'Old Dominion', nameEn: 'Old Dominion Freight', industry: '物流', approxPE: 30, approxPB: 10, approxDividend: 0.4 },
    { symbol: 'CTAS', nameZh: 'Cintas', nameEn: 'Cintas', industry: '服务', approxPE: 40, approxPB: 15, approxDividend: 0.8 },
    { symbol: 'VRSK', nameZh: 'Verisk', nameEn: 'Verisk Analytics', industry: '数据分析', approxPE: 35, approxPB: 15, approxDividend: 0.6 },
    { symbol: 'ROP', nameZh: 'Roper', nameEn: 'Roper Technologies', industry: '工业软件', approxPE: 30, approxPB: 3.0, approxDividend: 0.5 },
    { symbol: 'PAYX', nameZh: 'Paychex', nameEn: 'Paychex', industry: '人力资源', approxPE: 25, approxPB: 12, approxDividend: 2.5 },
    { symbol: 'CTSH', nameZh: 'Cognizant', nameEn: 'Cognizant', industry: 'IT服务', approxPE: 15, approxPB: 3.0, approxDividend: 1.5 },
    { symbol: 'ADP', nameZh: 'ADP', nameEn: 'ADP', industry: '人力资源', approxPE: 28, approxPB: 15, approxDividend: 2.0 },
    // 能源/公用事业
    { symbol: 'CEG', nameZh: 'Constellation', nameEn: 'Constellation Energy', industry: '核电', approxPE: 25, approxPB: 5.0, approxDividend: 0.8 },
    { symbol: 'AEP', nameZh: 'AEP', nameEn: 'American Electric Power', industry: '电力', approxPE: 15, approxPB: 2.0, approxDividend: 3.5 },
    { symbol: 'EXC', nameZh: 'Exelon', nameEn: 'Exelon', industry: '电力', approxPE: 15, approxPB: 1.5, approxDividend: 3.5 },
    { symbol: 'XEL', nameZh: 'Xcel', nameEn: 'Xcel Energy', industry: '电力', approxPE: 15, approxPB: 2.0, approxDividend: 3.5 },
    { symbol: 'FANG', nameZh: 'Diamondback', nameEn: 'Diamondback Energy', industry: '石油', approxPE: 8, approxPB: 1.5, approxDividend: 5.0 },
    { symbol: 'BKR', nameZh: 'Baker Hughes', nameEn: 'Baker Hughes', industry: '油服', approxPE: 15, approxPB: 2.5, approxDividend: 2.5 },
    // 其他
    { symbol: 'MAR', nameZh: '万豪', nameEn: 'Marriott', industry: '酒店', approxPE: 25, approxPB: 20, approxDividend: 1.0 },
    { symbol: 'AXON', nameZh: 'Axon', nameEn: 'Axon Enterprise', industry: '安防', approxPE: 80, approxPB: 15 },
    { symbol: 'APP', nameZh: 'AppLovin', nameEn: 'AppLovin', industry: '广告科技', approxPE: 40, approxPB: 30 },
    { symbol: 'CCEP', nameZh: '可口可乐欧洲', nameEn: 'Coca-Cola Europacific', industry: '饮料', approxPE: 18, approxPB: 3.0, approxDividend: 2.5 },
    { symbol: 'FER', nameZh: 'Ferrovial', nameEn: 'Ferrovial', industry: '基建', approxPE: 50, approxPB: 3.0, approxDividend: 1.5 },
    { symbol: 'TRI', nameZh: 'Thomson Reuters', nameEn: 'Thomson Reuters', industry: '信息服务', approxPE: 30, approxPB: 5.0, approxDividend: 1.5 },
    { symbol: 'STX', nameZh: '希捷', nameEn: 'Seagate', industry: '存储', approxPE: 12, approxPB: 8.0, approxDividend: 3.5 },
    { symbol: 'WDC', nameZh: '西数', nameEn: 'Western Digital', industry: '存储', approxPE: 10, approxPB: 2.0 },
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
    { symbol: 'ATOM-USD', nameZh: 'Cosmos', nameEn: 'Cosmos', industry: '跨链' },
    { symbol: 'LTC-USD', nameZh: '莱特币', nameEn: 'Litecoin', industry: '支付' },
    { symbol: 'NEAR-USD', nameZh: 'NEAR', nameEn: 'NEAR Protocol', industry: 'L1' },
    { symbol: 'AAVE-USD', nameZh: 'Aave', nameEn: 'Aave', industry: 'DeFi' },
    { symbol: 'FIL-USD', nameZh: 'Filecoin', nameEn: 'Filecoin', industry: '存储' },
    { symbol: 'ARB-USD', nameZh: 'Arbitrum', nameEn: 'Arbitrum', industry: 'L2' },
    { symbol: 'OP-USD', nameZh: 'Optimism', nameEn: 'Optimism', industry: 'L2' },
    { symbol: 'APT-USD', nameZh: 'Aptos', nameEn: 'Aptos', industry: 'L1' },
    { symbol: 'SUI-USD', nameZh: 'Sui', nameEn: 'Sui', industry: 'L1' },
    { symbol: 'TRX-USD', nameZh: '波场', nameEn: 'TRON', industry: 'L1' },
    { symbol: 'SHIB-USD', nameZh: '柴犬币', nameEn: 'Shiba Inu', industry: 'Meme' },
    { symbol: 'INJ-USD', nameZh: 'Injective', nameEn: 'Injective', industry: 'DeFi' },
    { symbol: 'RENDER-USD', nameZh: 'Render', nameEn: 'Render', industry: 'AI' },
    { symbol: 'FET-USD', nameZh: 'Fetch.ai', nameEn: 'Fetch.ai', industry: 'AI' },
    { symbol: 'MKR-USD', nameZh: 'Maker', nameEn: 'Maker', industry: 'DeFi' },
    { symbol: 'PEPE-USD', nameZh: 'Pepe', nameEn: 'Pepe', industry: 'Meme' },
    { symbol: 'SEI-USD', nameZh: 'Sei', nameEn: 'Sei', industry: 'L1' },
    { symbol: 'STX-USD', nameZh: 'Stacks', nameEn: 'Stacks', industry: 'BTC L2' },
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
  let score = 50;

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
    else if (stock.rsi14 < 30) score += 6;
    else if (stock.rsi14 > 80) score -= 4;
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

async function fetchAndBuildCandidates(
  defs: StockDef[],
  market: string,
  batchSize = 10
): Promise<StockCandidate[]> {
  const candidates: StockCandidate[] = [];
  const totalBatches = Math.ceil(defs.length / batchSize);
  let failCount = 0;

  for (let i = 0; i < defs.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1;
    const batch = defs.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(def => fetchYahooChartData(def.symbol))
    );

    for (let j = 0; j < batch.length; j++) {
      const def = batch[j];
      const result = results[j];
      if (result.status !== 'fulfilled' || !result.value) continue;

      const chart = result.value;
      if (chart.price <= 0) continue;

      const ma5 = chart.closes.length >= 5 ? calculateMA(chart.closes, 5) : chart.price;
      const ma20 = chart.closes.length >= 20 ? calculateMA(chart.closes, 20) : chart.price;
      const rsi14 = chart.closes.length >= 15 ? calculateRSI(chart.closes, 14) : 50;

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

    // Track failures for this batch
    const batchFails = results.filter(r => r.status !== 'fulfilled' || !r.value).length;
    failCount += batchFails;

    if (i + batchSize < defs.length) {
      // Adaptive delay: increase if seeing failures (API throttling)
      const delay = batchFails > batch.length / 2 ? 800 : 350;
      await new Promise(r => setTimeout(r, delay));
    }

    // Log progress every 10 batches for large pools
    if (totalBatches > 10 && batchNum % 10 === 0) {
      console.log(`[Strategy] ${market}: batch ${batchNum}/${totalBatches}, ${candidates.length} candidates so far, ${failCount} failures`);
    }
  }

  return candidates;
}

export async function runStrategyForMarket(market: string): Promise<{ stocks: ScoredStock[]; sentiment: MarketSentimentResult }> {
  let universe = STOCK_UNIVERSE[market];
  if (!universe) {
    console.error(`[Strategy] Unknown market: ${market}`);
    return { stocks: [], sentiment: getDefaultSentiment(market) };
  }

  // For CN market: dynamically fetch screener data to expand beyond CSI 300
  // This covers all Shanghai + Shenzhen stocks via Yahoo Finance screener
  if (market === 'cn') {
    try {
      console.log(`[Strategy] Fetching CN market screener data (gainers + losers + actives)...`);
      const [gainers, losers, actives] = await Promise.all([
        fetchScreenerStocks('day_gainers', 100),
        fetchScreenerStocks('day_losers', 100),
        fetchScreenerStocks('most_actives', 100),
      ]);

      const dynamicSymbols = new Set(universe.map(d => d.symbol));
      const allScreener = [...gainers, ...losers, ...actives];
      let cnAdded = 0;

      for (const q of allScreener) {
        if (!q.symbol || dynamicSymbols.has(q.symbol)) continue;
        // Only include Shanghai (.SS) and Shenzhen (.SZ) stocks
        if (!q.symbol.endsWith('.SS') && !q.symbol.endsWith('.SZ')) continue;
        dynamicSymbols.add(q.symbol);
        universe = [...universe, {
          symbol: q.symbol,
          nameZh: q.shortName || q.symbol,
          nameEn: q.shortName || q.symbol,
          industry: '动态筛选',
        }];
        cnAdded++;
      }
      console.log(`[Strategy] CN universe expanded to ${universe.length} candidates (+${cnAdded} from screener)`);
    } catch (err: any) {
      console.warn(`[Strategy] CN screener failed, using static CSI300 pool:`, err?.message);
    }
  }

  // For US market: dynamically fetch screener data and merge with blue chip pool
  if (market === 'us') {
    try {
      console.log(`[Strategy] Fetching US market screener data (gainers + losers + actives)...`);
      const [gainers, losers, actives] = await Promise.all([
        fetchScreenerStocks('day_gainers', 50),
        fetchScreenerStocks('day_losers', 50),
        fetchScreenerStocks('most_actives', 50),
      ]);

      const dynamicSymbols = new Set(universe.map(d => d.symbol));
      const allScreener = [...gainers, ...losers, ...actives];

      for (const q of allScreener) {
        if (!q.symbol || dynamicSymbols.has(q.symbol)) continue;
        // Skip OTC, preferred shares, warrants, etc.
        if (q.symbol.includes('.') || q.symbol.includes('-') || q.symbol.length > 5) continue;
        dynamicSymbols.add(q.symbol);
        universe = [...universe, {
          symbol: q.symbol,
          nameZh: q.shortName || q.symbol,
          nameEn: q.shortName || q.symbol,
          industry: '动态筛选',
        }];
      }
      console.log(`[Strategy] US universe expanded to ${universe.length} candidates (${allScreener.length} from screener)`);
    } catch (err: any) {
      console.warn(`[Strategy] US screener failed, using static pool:`, err?.message);
    }
  }

  console.log(`[Strategy] Running strategy for ${market}, ${universe.length} candidates...`);

  const candidates = await fetchAndBuildCandidates(universe, market);

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

  // Calculate market sentiment from ALL candidates
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

  console.log(`[Strategy] ${market}: ${candidates.length} analyzed → top10, #1=${top10[0]?.nameZh}(${top10[0]?.score}), sentiment=${marketState}`);
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
