// ===================================================================
// MarketOverview — 市场全景扫描
// 赛博战术指挥中心：指数卡片 + 迷你走势图 + 实时更新
// ===================================================================

import { IndexData } from '@/lib/marketData';
import HudPanel from './HudPanel';
import { useMemo } from 'react';

interface MarketOverviewProps {
  indices: IndexData[];
  loading: boolean;
}

function MiniChart({ data, isUp }: { data: { time: number; value: number }[]; isUp: boolean }) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 120;
  const height = 40;
  const padding = 2;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const color = isUp ? '#00e676' : '#ff3b3b';

  // Create area fill path
  const areaPath = `M${points[0]} ${points.join(' L')} L${width - padding},${height} L${padding},${height} Z`;

  return (
    <svg width={width} height={height} className="opacity-80">
      <defs>
        <linearGradient id={`grad-${isUp ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${isUp ? 'up' : 'down'})`} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IndexCard({ data }: { data: IndexData }) {
  const isUp = data.change >= 0;
  const color = isUp ? '#00e676' : '#ff3b3b';

  return (
    <div className="hud-panel p-3 hover:border-[rgba(0,212,255,0.3)] transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs text-[#8899aa] mb-0.5">{data.name}</div>
          <div
            className="text-lg font-bold tabular-nums number-update"
            style={{ fontFamily: "'JetBrains Mono', monospace", color }}
          >
            {data.price.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-sm font-semibold tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace", color }}
          >
            {isUp ? '+' : ''}{data.changePercent.toFixed(2)}%
          </div>
          <div
            className="text-xs tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: `${color}99` }}
          >
            {isUp ? '+' : ''}{data.change.toFixed(2)}
          </div>
        </div>
      </div>
      <MiniChart data={data.chartData} isUp={isUp} />
      <div className="flex items-center justify-between mt-1.5 text-[10px] text-[#8899aa]/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <span>H:{data.high.toFixed(2)}</span>
        <span>L:{data.low.toFixed(2)}</span>
      </div>
    </div>
  );
}

function IndexCardSkeleton() {
  return (
    <div className="hud-panel p-3 animate-pulse">
      <div className="h-3 w-16 bg-[rgba(0,212,255,0.1)] rounded mb-2" />
      <div className="h-5 w-24 bg-[rgba(0,212,255,0.1)] rounded mb-3" />
      <div className="h-10 w-full bg-[rgba(0,212,255,0.05)] rounded" />
    </div>
  );
}

export default function MarketOverview({ indices, loading }: MarketOverviewProps) {
  // Group indices: A股 | H股 | 美股 | 数字货币
  const groups = useMemo(() => {
    const aShares = indices.filter((i) => i.symbol.endsWith('.SS') || i.symbol.endsWith('.SZ'));
    const hk = indices.filter((i) => i.symbol === '^HSI');
    const us = indices.filter((i) => i.symbol === '^GSPC');
    const crypto = indices.filter((i) => i.symbol === 'BTC-USD');
    return { aShares, hk, us, crypto };
  }, [indices]);

  return (
    <HudPanel title="市场全景扫描" scan>
      {/* Market tabs */}
      <div className="flex items-center gap-4 mb-3 text-[10px] tracking-wider">
        <span className="text-[#00d4ff] border-b border-[#00d4ff] pb-0.5">A股</span>
        <span className="text-[#8899aa] hover:text-[#00d4ff] transition-colors cursor-pointer">H股</span>
        <span className="text-[#8899aa] hover:text-[#00d4ff] transition-colors cursor-pointer">美股</span>
        <span className="text-[#8899aa] hover:text-[#00d4ff] transition-colors cursor-pointer">数字货币</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <IndexCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {indices.map((idx) => (
            <IndexCard key={idx.symbol} data={idx} />
          ))}
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[rgba(0,212,255,0.08)]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00e676] cursor-blink" />
          <span className="text-[10px] text-[#8899aa]">实时更新中</span>
        </div>
        <span className="text-[10px] text-[#8899aa]/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          每30秒自动刷新
        </span>
      </div>
    </HudPanel>
  );
}
