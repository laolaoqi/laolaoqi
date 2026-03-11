// ===================================================================
// SimAsharePanel — A股模拟投资面板组件
// 展示A股模拟持仓、收益率、交易记录、资产曲线
// ¥1,000,000 初始本金，每天9:00（北京时间）更新策略
// ===================================================================

import { trpc } from '@/lib/trpc';
import { TrendingUp, TrendingDown, Clock, Landmark, BarChart3, History, Wallet, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';

// ===================================================================
// Formatters
// ===================================================================
function fmtCNY(v: number): string {
  if (Math.abs(v) >= 10000) {
    return `¥${(v / 10000).toFixed(2)}万`;
  }
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtCNYFull(v: number): string {
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

function fmtTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ===================================================================
// Mini equity curve SVG
// ===================================================================
function EquityCurve({ snapshots, initialCapital }: { snapshots: Array<{ totalValue: number; createdAt: string }>; initialCapital: number }) {
  const path = useMemo(() => {
    if (!snapshots || snapshots.length < 2) return '';
    const reversed = [...snapshots].reverse(); // oldest first
    const values = reversed.map(s => s.totalValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const w = 300;
    const h = 60;
    const step = w / (values.length - 1);
    return values.map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [snapshots]);

  if (!path) return null;

  const lastVal = snapshots[0]?.totalValue ?? initialCapital;
  const isUp = lastVal >= initialCapital;
  const color = isUp ? '#ff4444' : '#00e676'; // A-share convention: red = up, green = down

  return (
    <svg viewBox="0 0 300 60" className="w-full h-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id="ashareEquityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Baseline at initial capital */}
      <line x1="0" y1="30" x2="300" y2="30" stroke="#334455" strokeWidth="0.5" strokeDasharray="4,4" />
      {/* Fill area */}
      <path d={`${path} L300,60 L0,60 Z`} fill="url(#ashareEquityGrad)" />
      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ===================================================================
// Strategy badge
// ===================================================================
function StrategyBadge({ strategy }: { strategy: string }) {
  const colorMap: Record<string, string> = {
    '防御模式': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    '保守模式': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    '均衡模式': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    '进攻模式': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    '全面进攻': 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const cls = colorMap[strategy] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border ${cls}`}>
      <ShieldCheck className="w-3 h-3 inline mr-1" />
      {strategy}
    </span>
  );
}

// ===================================================================
// Main Component
// ===================================================================
export default function SimAsharePanel() {
  const { data, isLoading } = trpc.simAshare.getData.useQuery(undefined, {
    refetchInterval: 120_000, // Refresh every 2 minutes
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[rgba(255,68,68,0.15)] bg-card/80 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#ff4444]/10 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-[#ff4444]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#ff4444]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              A股模拟投资
            </h3>
            <p className="text-xs text-muted-foreground">加载中...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-muted rounded" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!data || (!data.positions.length && !data.trades.length)) {
    return (
      <div className="rounded-xl border border-[rgba(255,68,68,0.15)] bg-card/80 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#ff4444]/10 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-[#ff4444]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#ff4444]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              A股模拟投资
            </h3>
            <p className="text-xs text-muted-foreground">¥1,000,000 虚拟本金 · 每日9:00自动调仓</p>
          </div>
        </div>
        <div className="text-center py-8 text-muted-foreground/50">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">A股模拟投资即将启动...</p>
          <p className="text-xs mt-1">系统将在下一个交易日9:00自动建仓</p>
        </div>
      </div>
    );
  }

  const { summary, positions, trades, snapshots, config } = data;
  // A-share convention: red = profit, green = loss
  const pnlColor = summary.totalPnl >= 0 ? '#ff4444' : '#00e676';
  const PnlIcon = summary.totalPnl >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-xl border border-[rgba(255,68,68,0.15)] bg-card/80 overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-[rgba(255,68,68,0.08)]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ff4444]/20 to-[#ff8800]/20 flex items-center justify-center shadow-[0_0_16px_rgba(255,68,68,0.15)]">
              <Landmark className="w-5 h-5 text-[#ff4444]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#ff4444]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                A股模拟投资
              </h3>
              <p className="text-xs text-muted-foreground">
                ¥{(config.initialCapital / 10000).toFixed(0)}万虚拟本金 · 开始于 {fmtDate(config.startDate)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StrategyBadge strategy={summary.strategy} />
            {summary.lastUpdateTime && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                <Clock className="w-3 h-3" />
                <span>更新: {fmtTime(summary.lastUpdateTime)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Value */}
          <div className="rounded-lg bg-secondary/60 border border-[rgba(255,68,68,0.08)] p-3">
            <div className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-1">总资产</div>
            <div className="text-lg font-bold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtCNY(summary.totalValue)}
            </div>
          </div>

          {/* P&L */}
          <div className="rounded-lg bg-secondary/60 border border-[rgba(255,68,68,0.08)] p-3">
            <div className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-1">总盈亏</div>
            <div className="flex items-center gap-1">
              <PnlIcon className="w-4 h-4" style={{ color: pnlColor }} />
              <span className="text-lg font-bold" style={{ color: pnlColor, fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtPct(summary.totalPnlPercent)}
              </span>
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: pnlColor }}>
              {summary.totalPnl >= 0 ? '+' : ''}{fmtCNY(summary.totalPnl)}
            </div>
          </div>

          {/* Cash */}
          <div className="rounded-lg bg-secondary/60 border border-[rgba(255,68,68,0.08)] p-3">
            <div className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-1">现金</div>
            <div className="text-lg font-bold text-[#ffd700]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtCNY(summary.cashBalance)}
            </div>
          </div>

          {/* Positions */}
          <div className="rounded-lg bg-secondary/60 border border-[rgba(255,68,68,0.08)] p-3">
            <div className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-1">持仓数</div>
            <div className="text-lg font-bold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {summary.positionCount}
            </div>
            <div className="text-[10px] text-muted-foreground/50 mt-0.5">
              投入 {fmtCNY(summary.investedValue)}
            </div>
          </div>
        </div>
      </div>

      {/* Equity Curve */}
      {snapshots.length >= 2 && (
        <div className="px-5 sm:px-6 py-3 border-b border-[rgba(255,68,68,0.08)]">
          <div className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-2">资产曲线</div>
          <EquityCurve snapshots={snapshots} initialCapital={config.initialCapital} />
        </div>
      )}

      {/* Positions Table */}
      {positions.length > 0 && (
        <div className="px-5 sm:px-6 py-4 border-b border-[rgba(255,68,68,0.08)]">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[#ff4444]" />
            <span className="text-sm font-bold text-[#ff4444]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              当前持仓
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  <th className="text-left py-2 pr-2">股票</th>
                  <th className="text-left py-2 pr-2 hidden sm:table-cell">类型</th>
                  <th className="text-left py-2 pr-2 hidden md:table-cell">行业</th>
                  <th className="text-right py-2 pr-2">买入价</th>
                  <th className="text-right py-2 pr-2">现价</th>
                  <th className="text-right py-2 pr-2">数量</th>
                  <th className="text-right py-2 pr-2">市值</th>
                  <th className="text-right py-2 pr-2">盈亏</th>
                  <th className="text-right py-2">占比</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos, i) => {
                  // A-share convention: red = profit, green = loss
                  const pColor = pos.pnl >= 0 ? '#ff4444' : '#00e676';
                  return (
                    <tr key={i} className="border-t border-[rgba(255,68,68,0.04)] hover:bg-[rgba(255,68,68,0.03)]">
                      <td className="py-2.5 pr-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{pos.name}</span>
                          <span className="text-[10px] text-muted-foreground/50">{pos.symbol}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-2 hidden sm:table-cell">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          pos.category === 'blueChip'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-orange-500/10 text-orange-400'
                        }`}>
                          {pos.category === 'blueChip' ? '蓝筹' : '成长'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 hidden md:table-cell text-xs text-muted-foreground/60">
                        {pos.industry}
                      </td>
                      <td className="py-2.5 pr-2 text-right text-muted-foreground/80" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        ¥{pos.entryPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-2 text-right" style={{ fontFamily: "'JetBrains Mono', monospace", color: pColor }}>
                        ¥{pos.currentPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-2 text-right text-muted-foreground/80" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {pos.quantity.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-2 text-right text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmtCNY(pos.currentValue)}
                      </td>
                      <td className="py-2.5 pr-2 text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        <span style={{ color: pColor }}>{fmtPct(pos.pnlPercent)}</span>
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground/80" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {pos.weight.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trade History */}
      {trades.length > 0 && (
        <div className="px-5 sm:px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-[#ffd700]" />
            <span className="text-sm font-bold text-[#ffd700]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              交易记录
            </span>
            <span className="text-[10px] text-muted-foreground/50">（最近{Math.min(trades.length, 20)}笔）</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  <th className="text-left py-2 pr-2">时间</th>
                  <th className="text-left py-2 pr-2">操作</th>
                  <th className="text-left py-2 pr-2">股票</th>
                  <th className="text-right py-2 pr-2">价格</th>
                  <th className="text-right py-2 pr-2">数量</th>
                  <th className="text-right py-2 pr-2">金额</th>
                  <th className="text-left py-2 hidden sm:table-cell">原因</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 20).map((trade, i) => (
                  <tr key={i} className="border-t border-[rgba(255,68,68,0.04)] hover:bg-[rgba(255,68,68,0.03)]">
                    <td className="py-2 pr-2 text-muted-foreground text-xs whitespace-nowrap">
                      {fmtTime(trade.time)}
                    </td>
                    <td className="py-2 pr-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        trade.action === 'BUY'
                          ? 'bg-[#ff4444]/10 text-[#ff4444]'
                          : 'bg-[#00e676]/10 text-[#00e676]'
                      }`}>
                        {trade.action === 'BUY' ? '买入' : '卖出'}
                      </span>
                    </td>
                    <td className="py-2 pr-2">
                      <span className="font-bold text-foreground">{trade.name}</span>
                      <span className="text-[10px] text-muted-foreground/50 ml-1">{trade.symbol}</span>
                    </td>
                    <td className="py-2 pr-2 text-right text-muted-foreground/80" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      ¥{trade.price.toFixed(2)}
                    </td>
                    <td className="py-2 pr-2 text-right text-muted-foreground/80" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {trade.quantity.toLocaleString()}
                    </td>
                    <td className="py-2 pr-2 text-right text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmtCNY(trade.value)}
                    </td>
                    <td className="py-2 text-muted-foreground text-xs hidden sm:table-cell truncate max-w-[200px]">
                      {trade.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="px-5 sm:px-6 py-3 bg-card/40 border-t border-[rgba(255,68,68,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground/40">
          <span>⏰ 调仓时间：每日 09:00（北京时间）</span>
          <span>💰 初始本金：¥{(config.initialCapital / 10000).toFixed(0)}万 · 策略：基于A股模式评分自动配置</span>
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground/30">
          ⚠️ 模拟投资仅供参考，不构成投资建议。A股红涨绿跌。
        </div>
      </div>
    </div>
  );
}
