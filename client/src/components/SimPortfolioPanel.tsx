// ===================================================================
// SimPortfolioPanel — 模拟投资面板组件
// 展示模拟持仓、收益率、交易记录、资产曲线
// 新增：单日/当月/一年收益统计
// ===================================================================

import { trpc } from '@/lib/trpc';
import { TrendingUp, TrendingDown, Clock, DollarSign, BarChart3, History, Wallet, Calendar, CalendarDays, CalendarRange, Trophy, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';

// ===================================================================
// Formatters
// ===================================================================
function fmtUSD(v: number): string {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function fmtQty(q: number): string {
  if (q >= 1) return q.toFixed(4);
  if (q >= 0.001) return q.toFixed(6);
  return q.toFixed(8);
}

// ===================================================================
// Mini equity curve SVG
// ===================================================================
function EquityCurve({ snapshots }: { snapshots: Array<{ totalValue: number; createdAt: string }> }) {
  const path = useMemo(() => {
    if (!snapshots || snapshots.length < 2) return '';
    const reversed = [...snapshots].reverse();
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

  const lastVal = snapshots[0]?.totalValue ?? 100000;
  const isUp = lastVal >= 100000;
  const color = isUp ? '#00e676' : '#ff4444';

  return (
    <svg viewBox="0 0 300 60" className="w-full h-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="30" x2="300" y2="30" stroke="#334455" strokeWidth="0.5" strokeDasharray="4,4" />
      <path d={`${path} L300,60 L0,60 Z`} fill="url(#equityGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ===================================================================
// P&L Stats Card
// ===================================================================
function PnlStatsSection({ pnlStats }: { pnlStats: any }) {
  if (!pnlStats) return null;

  const items = [
    {
      label: '单日收益',
      icon: Calendar,
      pnl: pnlStats.todayPnl,
      pnlPercent: pnlStats.todayPnlPercent,
      sublabel: '今日实时',
    },
    {
      label: '当月收益',
      icon: CalendarDays,
      pnl: pnlStats.monthPnl,
      pnlPercent: pnlStats.monthPnlPercent,
      sublabel: '本月累计',
    },
    {
      label: '一年收益',
      icon: CalendarRange,
      pnl: pnlStats.yearPnl,
      pnlPercent: pnlStats.yearPnlPercent,
      sublabel: '年度累计',
    },
  ];

  return (
    <div className="px-5 sm:px-6 py-4 border-b border-[rgba(0,212,255,0.08)]">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-[#ffd700]" />
        <span className="text-sm font-bold text-[#ffd700]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          收益统计
        </span>
      </div>

      {/* Main P&L cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isPositive = item.pnl >= 0;
          const pnlColor = isPositive ? '#00e676' : '#ff4444';
          const bgGlow = isPositive ? 'rgba(0,230,118,0.05)' : 'rgba(255,68,68,0.05)';
          return (
            <div
              key={item.label}
              className="rounded-lg border border-[rgba(0,212,255,0.08)] p-3 relative overflow-hidden"
              style={{ backgroundColor: bgGlow }}
            >
              {/* Subtle glow */}
              <div
                className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 blur-xl"
                style={{ backgroundColor: pnlColor }}
              />
              <div className="relative">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: pnlColor }} />
                  <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">{item.label}</span>
                </div>
                <div className="text-lg font-bold" style={{ color: pnlColor, fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmtPct(item.pnlPercent)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: pnlColor, opacity: 0.8, fontFamily: "'JetBrains Mono', monospace" }}>
                  {item.pnl >= 0 ? '+' : ''}{fmtUSD(item.pnl)}
                </div>
                <div className="text-[9px] text-[#556677] mt-1">{item.sublabel}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Win/loss stats row */}
      {pnlStats.totalDays > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded bg-[rgba(0,20,40,0.4)] px-3 py-2 text-center">
            <div className="text-[9px] text-[#556677] uppercase">交易天数</div>
            <div className="text-sm font-bold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {pnlStats.totalDays}
            </div>
          </div>
          <div className="rounded bg-[rgba(0,20,40,0.4)] px-3 py-2 text-center">
            <div className="text-[9px] text-[#556677] uppercase">胜率</div>
            <div className="text-sm font-bold" style={{
              color: pnlStats.winRate >= 50 ? '#00e676' : '#ff4444',
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              {pnlStats.winRate.toFixed(1)}%
            </div>
          </div>
          <div className="rounded bg-[rgba(0,20,40,0.4)] px-3 py-2 text-center">
            <div className="text-[9px] text-[#00e676] uppercase">盈利天数</div>
            <div className="text-sm font-bold text-[#00e676]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {pnlStats.profitDays}
            </div>
          </div>
          <div className="rounded bg-[rgba(0,20,40,0.4)] px-3 py-2 text-center">
            <div className="text-[9px] text-[#ff4444] uppercase">亏损天数</div>
            <div className="text-sm font-bold text-[#ff4444]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {pnlStats.lossDays}
            </div>
          </div>
        </div>
      )}

      {/* Best/Worst day */}
      {(pnlStats.bestDay || pnlStats.worstDay) && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {pnlStats.bestDay && (
            <div className="rounded bg-[rgba(0,230,118,0.05)] border border-[rgba(0,230,118,0.1)] px-3 py-2">
              <div className="flex items-center gap-1 mb-1">
                <Trophy className="w-3 h-3 text-[#00e676]" />
                <span className="text-[9px] text-[#00e676] uppercase">最佳单日</span>
              </div>
              <div className="text-xs font-bold text-[#00e676]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtPct(pnlStats.bestDay.pnlPercent)} ({fmtUSD(pnlStats.bestDay.pnl)})
              </div>
              <div className="text-[9px] text-[#556677] mt-0.5">{pnlStats.bestDay.date}</div>
            </div>
          )}
          {pnlStats.worstDay && (
            <div className="rounded bg-[rgba(255,68,68,0.05)] border border-[rgba(255,68,68,0.1)] px-3 py-2">
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3 h-3 text-[#ff4444]" />
                <span className="text-[9px] text-[#ff4444] uppercase">最差单日</span>
              </div>
              <div className="text-xs font-bold text-[#ff4444]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtPct(pnlStats.worstDay.pnlPercent)} ({fmtUSD(pnlStats.worstDay.pnl)})
              </div>
              <div className="text-[9px] text-[#556677] mt-0.5">{pnlStats.worstDay.date}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===================================================================
// Main Component
// ===================================================================
export default function SimPortfolioPanel() {
  const { data, isLoading } = trpc.simInvestment.getData.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[rgba(0,212,255,0.15)] bg-[rgba(0,10,20,0.6)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#00d4ff]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              模拟投资
            </h3>
            <p className="text-xs text-[#8899aa]">加载中...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-[#112233] rounded" />
          <div className="h-40 bg-[#112233] rounded" />
        </div>
      </div>
    );
  }

  if (!data || (!data.positions.length && !data.trades.length)) {
    return (
      <div className="rounded-xl border border-[rgba(0,212,255,0.15)] bg-[rgba(0,10,20,0.6)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#00d4ff]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              模拟投资
            </h3>
            <p className="text-xs text-[#8899aa]">$100,000 虚拟本金 · 每日08:00自动调仓</p>
          </div>
        </div>
        <div className="text-center py-8 text-[#556677]">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">模拟投资即将启动...</p>
          <p className="text-xs mt-1">系统将在下一个调仓时间自动建仓</p>
        </div>
      </div>
    );
  }

  const { summary, positions, trades, snapshots, config, pnlStats } = data;
  const pnlColor = summary.totalPnl >= 0 ? '#00e676' : '#ff4444';
  const PnlIcon = summary.totalPnl >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-xl border border-[rgba(0,212,255,0.15)] bg-[rgba(0,10,20,0.6)] overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-[rgba(0,212,255,0.08)]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00d4ff]/20 to-[#7c3aed]/20 flex items-center justify-center shadow-[0_0_16px_rgba(0,212,255,0.15)]">
              <BarChart3 className="w-5 h-5 text-[#00d4ff]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#00d4ff]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                模拟投资
              </h3>
              <p className="text-xs text-[#8899aa]">
                $100,000 虚拟本金 · 每日08:00重置
              </p>
            </div>
          </div>
          {summary.lastUpdateTime && (
            <div className="flex items-center gap-1 text-[10px] text-[#556677]">
              <Clock className="w-3 h-3" />
              <span>更新: {fmtTime(summary.lastUpdateTime)}</span>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Value */}
          <div className="rounded-lg bg-[rgba(0,20,40,0.6)] border border-[rgba(0,212,255,0.08)] p-3">
            <div className="text-[10px] text-[#556677] uppercase tracking-wider mb-1">总资产</div>
            <div className="text-lg font-bold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtUSD(summary.totalValue)}
            </div>
          </div>

          {/* P&L */}
          <div className="rounded-lg bg-[rgba(0,20,40,0.6)] border border-[rgba(0,212,255,0.08)] p-3">
            <div className="text-[10px] text-[#556677] uppercase tracking-wider mb-1">当日盈亏</div>
            <div className="flex items-center gap-1">
              <PnlIcon className="w-4 h-4" style={{ color: pnlColor }} />
              <span className="text-lg font-bold" style={{ color: pnlColor, fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtPct(summary.totalPnlPercent)}
              </span>
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: pnlColor }}>
              {summary.totalPnl >= 0 ? '+' : ''}{fmtUSD(summary.totalPnl)}
            </div>
          </div>

          {/* Cash */}
          <div className="rounded-lg bg-[rgba(0,20,40,0.6)] border border-[rgba(0,212,255,0.08)] p-3">
            <div className="text-[10px] text-[#556677] uppercase tracking-wider mb-1">现金</div>
            <div className="text-lg font-bold text-[#ffd700]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtUSD(summary.cashBalance)}
            </div>
          </div>

          {/* Positions */}
          <div className="rounded-lg bg-[rgba(0,20,40,0.6)] border border-[rgba(0,212,255,0.08)] p-3">
            <div className="text-[10px] text-[#556677] uppercase tracking-wider mb-1">持仓数</div>
            <div className="text-lg font-bold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {summary.positionCount}
            </div>
            <div className="text-[10px] text-[#556677] mt-0.5">
              投入 {fmtUSD(summary.investedValue)}
            </div>
          </div>
        </div>
      </div>

      {/* P&L Statistics Section */}
      {pnlStats && <PnlStatsSection pnlStats={pnlStats} />}

      {/* Equity Curve */}
      {snapshots.length >= 2 && (
        <div className="px-5 sm:px-6 py-3 border-b border-[rgba(0,212,255,0.08)]">
          <div className="text-[10px] text-[#556677] uppercase tracking-wider mb-2">资产曲线</div>
          <EquityCurve snapshots={snapshots} />
        </div>
      )}

      {/* Positions Table */}
      {positions.length > 0 && (
        <div className="px-5 sm:px-6 py-4 border-b border-[rgba(0,212,255,0.08)]">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-[#00d4ff]" />
            <span className="text-sm font-bold text-[#00d4ff]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              当前持仓
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-[#556677] uppercase tracking-wider">
                  <th className="text-left py-2 pr-2">币种</th>
                  <th className="text-left py-2 pr-2 hidden sm:table-cell">类型</th>
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
                  const pColor = pos.pnl >= 0 ? '#00e676' : '#ff4444';
                  return (
                    <tr key={i} className="border-t border-[rgba(0,212,255,0.04)] hover:bg-[rgba(0,212,255,0.03)]">
                      <td className="py-2.5 pr-2">
                        <span className="font-bold text-white">{pos.symbol}</span>
                      </td>
                      <td className="py-2.5 pr-2 hidden sm:table-cell">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          pos.category === 'mainstream'
                            ? 'bg-[#00d4ff]/10 text-[#00d4ff]'
                            : 'bg-[#ff6b00]/10 text-[#ff6b00]'
                        }`}>
                          {pos.category === 'mainstream' ? '主流' : '空气'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-right text-[#aabbcc]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmtUSD(pos.entryPrice)}
                      </td>
                      <td className="py-2.5 pr-2 text-right text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmtUSD(pos.currentPrice)}
                      </td>
                      <td className="py-2.5 pr-2 text-right text-[#aabbcc]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmtQty(pos.quantity)}
                      </td>
                      <td className="py-2.5 pr-2 text-right text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmtUSD(pos.currentValue)}
                      </td>
                      <td className="py-2.5 pr-2 text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        <span style={{ color: pColor }}>{fmtPct(pos.pnlPercent)}</span>
                      </td>
                      <td className="py-2.5 text-right text-[#aabbcc]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
            <span className="text-[10px] text-[#556677]">（最近{Math.min(trades.length, 20)}笔）</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-[#556677] uppercase tracking-wider">
                  <th className="text-left py-2 pr-2">时间</th>
                  <th className="text-left py-2 pr-2">操作</th>
                  <th className="text-left py-2 pr-2">币种</th>
                  <th className="text-right py-2 pr-2">价格</th>
                  <th className="text-right py-2 pr-2">金额</th>
                  <th className="text-left py-2 hidden sm:table-cell">原因</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 20).map((trade, i) => (
                  <tr key={i} className="border-t border-[rgba(0,212,255,0.04)] hover:bg-[rgba(0,212,255,0.03)]">
                    <td className="py-2 pr-2 text-[#8899aa] text-xs whitespace-nowrap">
                      {fmtTime(trade.time)}
                    </td>
                    <td className="py-2 pr-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        trade.action === 'BUY'
                          ? 'bg-[#00e676]/10 text-[#00e676]'
                          : 'bg-[#ff4444]/10 text-[#ff4444]'
                      }`}>
                        {trade.action === 'BUY' ? '买入' : '卖出'}
                      </span>
                    </td>
                    <td className="py-2 pr-2 font-bold text-white">{trade.symbol}</td>
                    <td className="py-2 pr-2 text-right text-[#aabbcc]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmtUSD(trade.price)}
                    </td>
                    <td className="py-2 pr-2 text-right text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmtUSD(trade.value)}
                    </td>
                    <td className="py-2 text-[#8899aa] text-xs hidden sm:table-cell truncate max-w-[200px]">
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
      <div className="px-5 sm:px-6 py-3 bg-[rgba(0,10,20,0.4)] border-t border-[rgba(0,212,255,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#445566]">
          <span>⏰ 每日08:00（北京时间）清零重建 · 14:00/20:00更新持仓</span>
          <span>💰 初始本金：$100,000 · 策略：基于BTC主导率自动配置</span>
        </div>
      </div>
    </div>
  );
}
