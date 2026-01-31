import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  fetchIndexData, 
  fetchSentimentData, 
  fetchTopStocks, 
  calculateMarketMode,
  type IndexData,
} from '@/services/marketData';

export interface MarketMode {
  type: 'attack' | 'defense' | 'neutral';
  score: number;
  label: string;
  color: string;
  icon: string;
}

export interface SentimentData {
  upCount: number;
  downCount: number;
  flatCount: number;
  limitUp: number;
  limitDown: number;
  upDownRatio: string;
}

export interface StockPick {
  rank: number;
  name: string;
  code: string;
  price: number;
  change: number;
  score: number;
  signal: 'BUY' | 'HOLD' | 'WATCH';
  sector: string;
  fundFlow: string;
  reason: string;
  stopLoss: number;
  takeProfit: number;
}

export const useMarketData = () => {
  const [indexData, setIndexData] = useState<IndexData[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [modeScores, setModeScores] = useState({ attack: 25, defense: 68, neutral: 42 });
  const [topStocks, setTopStocks] = useState<StockPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 获取所有市场数据
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 并行获取数据
      const [indices, sentiment, stocks] = await Promise.all([
        fetchIndexData(),
        fetchSentimentData(),
        fetchTopStocks(),
      ]);
      
      setIndexData(indices);
      setSentimentData(sentiment);
      
      // 计算模式分数
      const modes = calculateMarketMode(indices);
      setModeScores(modes);
      
      // 转换股票数据
      const stockPool: StockPick[] = [
        { rank: 1, name: '招商银行', code: '600036', price: 0, change: 0, score: 92, signal: 'BUY', sector: '银行', fundFlow: '+7.35亿', reason: '银行龙头，北向资金持续加仓，高股息防御属性突出，当前PB仅0.95倍', stopLoss: 35.80, takeProfit: 44.00 },
        { rank: 2, name: '中国平安', code: '601318', price: 0, change: 0, score: 89, signal: 'BUY', sector: '保险', fundFlow: '+4.69亿', reason: '保险龙头，公募基金增持超100亿，业绩确定性高', stopLoss: 48.50, takeProfit: 60.00 },
        { rank: 3, name: '长江电力', code: '600900', price: 0, change: 0, score: 87, signal: 'BUY', sector: '公用事业', fundFlow: '+2.18亿', reason: '水电龙头，现金流稳定，机构重仓持有', stopLoss: 26.50, takeProfit: 32.00 },
        { rank: 4, name: '中国神华', code: '601088', price: 0, change: 0, score: 85, signal: 'WATCH', sector: '煤炭', fundFlow: '+1.56亿', reason: '高股息代表，能源安全核心资产，适合长期配置', stopLoss: 32.00, takeProfit: 40.00 },
        { rank: 5, name: '中国移动', code: '600941', price: 0, change: 0, score: 83, signal: 'WATCH', sector: '通信', fundFlow: '+1.24亿', reason: '通信运营商龙头，数字经济基础设施', stopLoss: 95.00, takeProfit: 115.00 },
        { rank: 6, name: '美的集团', code: '000333', price: 0, change: 0, score: 82, signal: 'BUY', sector: '家电', fundFlow: '+3.21亿', reason: '家电龙头，海外业务持续扩张，成本端压力缓解', stopLoss: 58.00, takeProfit: 72.00 },
        { rank: 7, name: '宁德时代', code: '300750', price: 0, change: 0, score: 80, signal: 'WATCH', sector: '新能源', fundFlow: '-0.85亿', reason: '动力电池全球龙头，短期受价格战影响', stopLoss: 200.00, takeProfit: 260.00 },
        { rank: 8, name: '贵州茅台', code: '600519', price: 0, change: 0, score: 79, signal: 'WATCH', sector: '白酒', fundFlow: '+2.08亿', reason: '白酒绝对龙头，批价企稳回升，渠道库存去化', stopLoss: 1480.00, takeProfit: 1750.00 },
        { rank: 9, name: '中际旭创', code: '300308', price: 0, change: 0, score: 78, signal: 'BUY', sector: 'AI算力', fundFlow: '+5.67亿', reason: '光模块龙头，AI算力核心受益，800G产品放量', stopLoss: 115.00, takeProfit: 150.00 },
        { rank: 10, name: '紫金矿业', code: '601899', price: 0, change: 0, score: 76, signal: 'WATCH', sector: '有色金属', fundFlow: '+0.92亿', reason: '有色金属龙头，降息预期利好金价', stopLoss: 11.80, takeProfit: 14.50 },
      ];
      
      // 更新股票实时价格
      const updatedStocks = stockPool.map((stock, index) => {
        const realStock = stocks[index];
        if (realStock) {
          return {
            ...stock,
            price: realStock.price,
            change: realStock.change,
          };
        }
        return stock;
      });
      
      // 根据实时表现重新排序
      const sortedStocks = updatedStocks.map(stock => {
        let dynamicScore = stock.score;
        if (stock.change > 2) dynamicScore += 2;
        if (stock.change < -1) dynamicScore -= 1;
        if (stock.signal === 'BUY') dynamicScore += 1;
        return { ...stock, score: Math.min(95, Math.max(70, dynamicScore)) };
      }).sort((a, b) => b.score - a.score).map((stock, index) => ({ ...stock, rank: index + 1 }));
      
      setTopStocks(sortedStocks);
      setLastUpdate(new Date());
    } catch (err) {
      setError('数据获取失败，请稍后重试');
      console.error('Market data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 启动自动刷新
  const startAutoRefresh = useCallback((intervalMs: number = 5000) => {
    // 立即获取一次
    fetchAllData();
    
    // 清除旧定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // 设置新定时器
    intervalRef.current = setInterval(fetchAllData, intervalMs);
  }, [fetchAllData]);

  // 停止自动刷新
  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopAutoRefresh();
    };
  }, [stopAutoRefresh]);

  // 获取权重配置
  const getWeights = useCallback(() => {
    const currentMode = Object.entries(modeScores).sort((a, b) => b[1] - a[1])[0][0];
    
    if (currentMode === 'attack') {
      return { fund: 30, technical: 50, fundamental: 20 };
    } else if (currentMode === 'defense') {
      return { fund: 30, technical: 20, fundamental: 50 };
    }
    return { fund: 40, technical: 30, fundamental: 30 };
  }, [modeScores]);

  // 获取当前模式
  const getCurrentMode = useCallback((): MarketMode => {
    const entries = Object.entries(modeScores);
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const [modeType, score] = sorted[0];
    
    const modeConfig: Record<string, MarketMode> = {
      attack: { type: 'attack', score, label: '进攻模式', color: 'green', icon: 'Zap' },
      defense: { type: 'defense', score, label: '防御模式', color: 'blue', icon: 'Shield' },
      neutral: { type: 'neutral', score, label: '震荡模式', color: 'yellow', icon: 'Minus' },
    };
    
    return modeConfig[modeType] || modeConfig.neutral;
  }, [modeScores]);

  return {
    indexData,
    sentimentData,
    modeScores,
    topStocks,
    loading,
    lastUpdate,
    error,
    fetchAllData,
    startAutoRefresh,
    stopAutoRefresh,
    getWeights,
    getCurrentMode,
  };
};
