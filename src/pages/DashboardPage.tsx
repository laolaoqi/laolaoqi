import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useMarketData } from '@/hooks/useMarketData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Brain, LogOut, User, Shield, TrendingUp, 
  Activity, Target, Clock, 
  Zap, BarChart3, Radar, 
  Scan, ArrowUpRight, ArrowDownRight,
  AlertTriangle, CheckCircle, ChevronUp, ChevronDown,
  Minus, Flame, Snowflake, Scale, Wallet,
  RefreshCw, Wifi, WifiOff
} from 'lucide-react';

// ==================== Types ====================
interface MarketMode {
  type: 'attack' | 'defense' | 'neutral';
  score: number;
  label: string;
  color: string;
}

// ==================== Components ====================

// 1. 模式栏组件
const ModePanel = ({ 
  modeScores, 
  currentMode 
}: { 
  modeScores: { attack: number; defense: number; neutral: number }; 
  currentMode: MarketMode;
}) => {
  const modes = [
    { type: 'attack' as const, score: modeScores.attack, label: '进攻模式', color: 'green', Icon: Zap },
    { type: 'defense' as const, score: modeScores.defense, label: '防御模式', color: 'blue', Icon: Shield },
    { type: 'neutral' as const, score: modeScores.neutral, label: '震荡模式', color: 'yellow', Icon: Minus },
  ];

  return (
    <Card className="metric-card border-slate-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-500" />
            <CardTitle className="text-base text-white">市场模式评分</CardTitle>
          </div>
          <Badge className={`${
            currentMode.type === 'attack' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
            currentMode.type === 'defense' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
            'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
          }`}>
            当前: {currentMode.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {modes.map((mode) => {
          const Icon = mode.Icon;
          const isActive = mode.type === currentMode.type;
          const colorClass = mode.color === 'green' ? 'text-green-400 bg-green-500' : 
                            mode.color === 'blue' ? 'text-blue-400 bg-blue-500' : 
                            'text-yellow-400 bg-yellow-500';
          
          return (
            <div key={mode.type} className={`p-3 rounded-lg border transition-all ${
              isActive ? `border-${mode.color}-500/50 bg-${mode.color}-500/10` : 'border-slate-700/50 bg-slate-800/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive ? `bg-${mode.color}-500/20` : 'bg-slate-700/50'
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? colorClass : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {mode.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {mode.type === 'attack' && '技术50% + 资金30% + 基础20%'}
                      {mode.type === 'defense' && '基础50% + 资金30% + 技术20%'}
                      {mode.type === 'neutral' && '资金40% + 技术30% + 基础30%'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold font-mono ${isActive ? colorClass : 'text-slate-500'}`}>
                    {mode.score}
                  </p>
                  <p className="text-xs text-slate-500">分</p>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-slate-800">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                  style={{ width: `${mode.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

// 2. 市场全景扫描 - 动态指数图
const IndexChart = ({ data }: { data: {
  name: string;
  code: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  updateTime: string;
} }) => {
  const isUp = data.change >= 0;
  
  // 生成模拟的历史走势数据
  const historyPoints = Array.from({ length: 20 }, (_, i) => {
    const basePrice = data.prevClose;
    const variance = (Math.random() - 0.5) * basePrice * 0.02;
    return basePrice + variance + (data.change * i / 20);
  });
  
  const maxVal = Math.max(...historyPoints, data.high);
  const minVal = Math.min(...historyPoints, data.low);
  const range = maxVal - minVal || 1;
  
  const points = historyPoints.map((val, idx) => {
    const x = (idx / (historyPoints.length - 1)) * 100;
    const y = 100 - ((val - minVal) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Card className="metric-card overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-slate-400 text-sm">{data.name}</p>
            <p className="text-xs text-slate-600 font-mono">{data.code}</p>
          </div>
          <Badge variant="outline" className={`text-xs ${isUp ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>
            {isUp ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {Math.abs(data.changePercent).toFixed(2)}%
          </Badge>
        </div>
        
        <div className="flex items-baseline gap-2 mb-2">
          <span className={`text-2xl font-bold font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {data.price.toFixed(2)}
          </span>
          <span className={`text-sm ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {isUp ? '+' : ''}{data.change.toFixed(2)}
          </span>
        </div>

        {/* 动态走势图 */}
        <div className="h-16 w-full">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`gradient-${data.code}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity="0.3" />
                <stop offset="100%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon 
              points={`0,100 ${points} 100,100`} 
              fill={`url(#gradient-${data.code})`}
            />
            <polyline 
              points={points} 
              fill="none" 
              stroke={isUp ? '#22c55e' : '#ef4444'} 
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle 
              cx="100" 
              cy={100 - ((data.price - minVal) / range) * 80 - 10} 
              r="3" 
              fill={isUp ? '#22c55e' : '#ef4444'}
            />
          </svg>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-slate-500">成交量: {data.volume}</span>
          <span className="text-slate-600 font-mono">{data.updateTime}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// 3. 动态权重分配
const WeightPanel = ({ weights }: { weights: { fund: number; technical: number; fundamental: number } }) => {
  return (
    <Card className="metric-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-base text-white">动态权重分配</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-slate-300">基本面权重</span>
            </div>
            <span className="text-sm font-mono text-blue-400">{weights.fundamental}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-slate-800">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${weights.fundamental}%` }} />
          </div>
          <p className="text-xs text-slate-500">ROE、股息率、负债率等硬指标</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-slate-300">资金流向权重</span>
            </div>
            <span className="text-sm font-mono text-amber-400">{weights.fund}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-slate-800">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${weights.fund}%` }} />
          </div>
          <p className="text-xs text-slate-500">主力净流入、北向资金、机构持仓</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-slate-300">技术动量权重</span>
            </div>
            <span className="text-sm font-mono text-green-400">{weights.technical}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-slate-800">
            <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${weights.technical}%` }} />
          </div>
          <p className="text-xs text-slate-500">均线排列、MACD、量价关系</p>
        </div>

        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <p className="text-xs text-slate-400">
            <span className="text-amber-500 font-medium">权重逻辑：</span>
            当前市场涨跌比43%，主力资金小幅流入，系统切换至
            <span className="text-yellow-400 font-medium">震荡模式</span>，
            均衡配置基本面、资金流向和技术动量权重。
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// 4. 市场情绪指标
const SentimentPanel = ({ data }: { data: {
  upCount: number;
  downCount: number;
  flatCount: number;
  limitUp: number;
  limitDown: number;
  upDownRatio: string;
} }) => {
  const total = data.upCount + data.downCount + data.flatCount;
  const upPercent = ((data.upCount / total) * 100).toFixed(1);
  const downPercent = ((data.downCount / total) * 100).toFixed(1);
  const flatPercent = ((data.flatCount / total) * 100).toFixed(1);
  
  return (
    <Card className="metric-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-base text-white">市场情绪指标</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 涨跌比进度条 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">涨跌比</span>
            <span className={`text-lg font-bold font-mono ${parseFloat(data.upDownRatio) < 40 ? 'text-red-400' : 'text-green-400'}`}>
              {data.upDownRatio}%
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-slate-800 flex">
            <div className="h-full bg-green-500" style={{ width: `${upPercent}%` }} />
            <div className="h-full bg-slate-600" style={{ width: `${flatPercent}%` }} />
            <div className="h-full bg-red-500" style={{ width: `${downPercent}%` }} />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-green-400">涨 {upPercent}%</span>
            <span className="text-slate-500">平 {flatPercent}%</span>
            <span className="text-red-400">跌 {downPercent}%</span>
          </div>
        </div>

        {/* 涨跌家数 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-xl font-bold text-green-400 font-mono">{data.upCount}</p>
            <p className="text-xs text-slate-500">上涨家数</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-slate-500/10 border border-slate-500/20">
            <p className="text-xl font-bold text-slate-400 font-mono">{data.flatCount}</p>
            <p className="text-xs text-slate-500">平盘家数</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xl font-bold text-red-400 font-mono">{data.downCount}</p>
            <p className="text-xs text-slate-500">下跌家数</p>
          </div>
        </div>

        {/* 涨跌停 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-500" />
              <span className="text-sm text-slate-400">涨停</span>
            </div>
            <span className="text-lg font-bold text-red-400 font-mono">{data.limitUp}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-400">跌停</span>
            </div>
            <span className="text-lg font-bold text-blue-400 font-mono">{data.limitDown}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 5. 舆情摘要
const NewsSummary = () => {
  return (
    <Card className="metric-card border-amber-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Scan className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-base text-white">舆情摘要</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-1 h-full min-h-[60px] rounded-full bg-amber-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-amber-500 font-medium mb-1">【主基调】</p>
              <p className="text-sm text-slate-300 leading-relaxed">
                今日市场呈现震荡分化格局，上证指数微涨0.25%，但个股跌多涨少，涨跌比仅43%。主力资金小幅净流入，显示市场情绪谨慎乐观。
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="w-1 h-full min-h-[60px] rounded-full bg-blue-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-blue-500 font-medium mb-1">【资金动向】</p>
              <p className="text-sm text-slate-300 leading-relaxed">
                北向资金近期呈现结构性流入特征，银行、保险、公用事业板块获外资青睐。市场资金正从高位科技股向业绩确定性强的防御型板块转移。
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="w-1 h-full min-h-[60px] rounded-full bg-green-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-green-500 font-medium mb-1">【策略建议】</p>
              <p className="text-sm text-slate-300 leading-relaxed">
                建议控制仓位在50-70%。重点关注高股息、低估值的银行保险板块，以及业绩确定性强的公用事业股。AI板块短期调整后仍具配置价值。
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 6. TOP10股票表格
const StockTable = ({ stocks }: { stocks: Array<{
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
}> }) => {
  const getSignalBadge = (signal: string) => {
    switch (signal) {
      case 'BUY': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">买入</Badge>;
      case 'WATCH': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">关注</Badge>;
      default: return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">持有</Badge>;
    }
  };

  return (
    <Card className="metric-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            <CardTitle className="text-base text-white">核心推荐 TOP 10</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>已排除ST股及重大利空标的</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">排名</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">股票名称</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">代码</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">行业</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">现价</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">涨跌幅</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500">评分</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500">信号</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">资金流向</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">推荐理由</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">止损/止盈</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock) => {
                const isUp = stock.change >= 0;
                return (
                  <tr key={stock.code} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                        stock.rank <= 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'
                      }`}>
                        {stock.rank}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-white">{stock.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-500 font-mono">{stock.code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-slate-400">{stock.sector}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono text-white">¥{stock.price.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`flex items-center justify-end gap-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {isUp ? '+' : ''}{stock.change.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                            style={{ width: `${stock.score}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-amber-400">{stock.score}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getSignalBadge(stock.signal)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm ${stock.fundFlow.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                        {stock.fundFlow}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm text-slate-400 truncate max-w-[200px] cursor-help">
                              {stock.reason}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-sm p-3 bg-slate-900 border-slate-700">
                            <p className="text-xs text-slate-300">{stock.reason}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-xs space-y-0.5">
                        <p className="text-red-400 font-mono">{stock.stopLoss.toFixed(2)}</p>
                        <p className="text-green-400 font-mono">{stock.takeProfit.toFixed(2)}</p>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// 7. 风控面板
const RiskPanel = () => {
  return (
    <Card className="metric-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-base text-white">风控与交易计划</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 止损策略 */}
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-sm font-medium text-red-400">止损策略</span>
            </div>
            <p className="text-3xl font-bold text-red-400 font-mono mb-2">-7%</p>
            <p className="text-xs text-slate-500">硬止损线，根据波动率可微调±1%</p>
            <div className="mt-3 pt-3 border-t border-red-500/20">
              <p className="text-xs text-slate-400">当股价跌破买入价的7%时，无条件止损离场</p>
            </div>
          </div>

          {/* 止盈策略 */}
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-green-400">止盈策略</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">+30%</span>
                <span className="text-sm font-mono text-green-400">卖出 1/3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">+50%</span>
                <span className="text-sm font-mono text-green-400">再卖 1/2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">剩余</span>
                <span className="text-sm font-mono text-amber-400">看趋势</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-500/20">
              <p className="text-xs text-slate-400">分批止盈，锁定利润，让利润奔跑</p>
            </div>
          </div>

          {/* 仓位建议 */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">仓位建议</span>
            </div>
            <p className="text-3xl font-bold text-blue-400 font-mono mb-2">50-70%</p>
            <p className="text-xs text-slate-500">当前震荡模式，建议适度仓位</p>
            <div className="mt-3 pt-3 border-t border-blue-500/20 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">牛市:</span>
                <span className="text-green-400 font-mono">80-100%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">震荡:</span>
                <span className="text-amber-400 font-mono">50-70%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">熊市:</span>
                <span className="text-red-400 font-mono">&lt;30%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 静态情绪数据
const SENTIMENT_DATA = {
  upCount: 2156,
  downCount: 2845,
  flatCount: 89,
  limitUp: 45,
  limitDown: 12,
  upDownRatio: '43.0',
};

// ==================== Main Component ====================
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isAdmin, isAuthenticated } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected] = useState(true);
  
  const {
    indexData,
    sentimentData,
    modeScores,
    topStocks,
    loading,
    lastUpdate,
    error,
    startAutoRefresh,
    stopAutoRefresh,
    getWeights,
    getCurrentMode,
  } = useMarketData();

  // 时间更新
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 启动实时数据刷新
  useEffect(() => {
    startAutoRefresh(5000); // 每5秒刷新一次
    return () => stopAutoRefresh();
  }, [startAutoRefresh, stopAutoRefresh]);

  // 检查认证
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const weights = getWeights();
  const currentMode = getCurrentMode();
  const displaySentiment = sentimentData || SENTIMENT_DATA;

  return (
    <div className="min-h-screen bg-[#0a0c10] data-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-[#0a0c10]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  猎手阿尔法 <span className="text-amber-500">HUNTER ALPHA</span>
                </h1>
                <p className="text-xs text-slate-500">动态感知投资作战室</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* 连接状态 */}
              <div className="flex items-center gap-2 text-sm">
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-500" />
                    <span className="text-green-500 text-xs">已连接</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-500" />
                    <span className="text-red-500 text-xs">未连接</span>
                  </>
                )}
              </div>
              
              {/* 最后更新时间 */}
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                <span>更新: {lastUpdate.toLocaleTimeString('zh-CN')}</span>
              </div>
              
              <div className="hidden md:flex items-center gap-4 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{currentTime.toLocaleTimeString('zh-CN')}</span>
              </div>
              
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  管理后台
                </Button>
              )}
              
              <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-white font-medium">{user?.username}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-300" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-slate-400 hover:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 加载状态 */}
        {loading && indexData.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="ml-3 text-slate-400">正在连接市场数据...</span>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-center">
            {error}
          </div>
        )}

        {/* 第一行：模式栏 + 市场全景 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 模式栏 */}
          <div className="lg:col-span-1">
            <ModePanel modeScores={modeScores} currentMode={currentMode} />
          </div>
          
          {/* 市场全景扫描 */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radar className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-white">市场全景扫描</h2>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
                  实时更新
                </Badge>
              </div>
              <span className="text-xs text-slate-500">
                数据延迟约3-15秒
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {indexData.length > 0 ? (
                indexData.map((data) => (
                  <IndexChart key={data.code} data={data} />
                ))
              ) : (
                // 骨架屏
                [1, 2, 3].map((i) => (
                  <Card key={i} className="metric-card h-48 animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-slate-800 rounded w-1/3 mb-4" />
                      <div className="h-8 bg-slate-800 rounded w-1/2 mb-4" />
                      <div className="h-16 bg-slate-800 rounded" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 第二行：动态权重 + 市场情绪 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeightPanel weights={weights} />
          <SentimentPanel data={displaySentiment} />
        </div>

        {/* 第三行：舆情摘要 */}
        <NewsSummary />

        {/* 第四行：核心推荐 TOP10 */}
        {topStocks.length > 0 && <StockTable stocks={topStocks} />}

        {/* 第五行：风控面板 */}
        <RiskPanel />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-8 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                系统运行正常
              </span>
              <span className="text-slate-600">|</span>
              <span>数据源: 新浪财经</span>
            </div>
            <div className="flex items-center gap-4">
              <span>猎手阿尔法 AI Agent v2.0</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-500">唯一不变的是变化本身</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-4 text-center">
            风险提示：本系统提供的分析仅供参考，不构成投资建议。股市有风险，投资需谨慎。
          </p>
        </div>
      </footer>
    </div>
  );
}
