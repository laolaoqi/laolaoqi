// ===================================================================
// MarketOverview — 市场全景扫描 v3
// 只展示当前选中市场的指数
// ===================================================================

import { useMemo } from 'react';
import HudPanel from './HudPanel';
import { useApp } from '@/contexts/AppContext';
import { t, getName, type Lang } from '@/lib/i18n';
import type { IndexData } from '@/lib/marketData';

interface Props {
  indices: IndexData[];
  loading: boolean;
}

function MiniChart({ data, isUp }: { data: { time: number; value: number }[]; isUp: boolean }) {
  if (data.length < 2) return null;
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 160, height = 48, pad = 2;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((d.value - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });
  const color = isUp ? '#00e676' : '#ff3b3b';
  const areaPath = `M${points[0]} ${points.join(' L')} L${width - pad},${height} L${pad},${height} Z`;
  return (
    <svg width={width} height={height} className="w-full opacity-80">
      <defs>
        <linearGradient id={`g-${isUp ? 'u' : 'd'}-${Math.random().toString(36).slice(2, 6)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#g-${isUp ? 'u' : 'd'}-${Math.random().toString(36).slice(2, 6)})`} />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function formatPrice(p: number) {
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 100) return p.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatVolume(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toString();
}

function IndexCard({ data, lang }: { data: IndexData; lang: Lang }) {
  const isUp = data.change >= 0;
  const color = isUp ? '#00e676' : '#ff3b3b';
  const displayName = getName(data, lang) || data.name;

  return (
    <div className="relative rounded-lg border border-[rgba(0,212,255,0.15)] bg-[rgba(0,212,255,0.03)] p-4 transition-all duration-300 hover:border-[rgba(0,212,255,0.3)] hover:shadow-[0_0_16px_rgba(0,212,255,0.1)] group">
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden">
        <div className={`absolute top-0 right-0 w-12 h-12 -translate-y-1/2 translate-x-1/2 rotate-45 ${isUp ? 'bg-[rgba(0,230,118,0.15)]' : 'bg-[rgba(255,59,59,0.15)]'}`} />
      </div>

      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-base text-foreground font-semibold mb-0.5">{displayName}</div>
          <div className="text-xs text-red-400 font-mono">{data.symbol}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>
            {formatPrice(data.price)}
          </div>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-sm tabular-nums font-medium" style={{ color }}>
              {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{data.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-2">
        <MiniChart data={data.chartData} isUp={isUp} />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs text-red-400 font-mono tabular-nums">
        <span>H: {formatPrice(data.high)}</span>
        <span>L: {formatPrice(data.low)}</span>
        {data.volume > 0 && <span>Vol: {formatVolume(data.volume)}</span>}
      </div>
    </div>
  );
}

function IndexCardSkeleton() {
  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.04)] p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div>
          <div className="h-4 w-20 bg-[rgba(0,212,255,0.1)] rounded mb-1.5" />
          <div className="h-3 w-14 bg-[rgba(0,212,255,0.06)] rounded" />
        </div>
        <div className="text-right">
          <div className="h-5 w-24 bg-[rgba(0,212,255,0.1)] rounded mb-1" />
          <div className="h-3 w-16 bg-[rgba(0,212,255,0.06)] rounded" />
        </div>
      </div>
      <div className="h-12 w-full bg-[rgba(0,212,255,0.05)] rounded mb-2" />
      <div className="h-3 w-full bg-[rgba(0,212,255,0.03)] rounded" />
    </div>
  );
}

export default function MarketOverview({ indices, loading }: Props) {
  const { lang, market } = useApp();

  // Generate unique gradient IDs
  const gradientIds = useMemo(() => {
    return indices.map((_, i) => `chart-grad-${market}-${i}-${Date.now()}`);
  }, [indices, market]);

  return (
    <HudPanel title={t('panel.marketScan', lang)} scan>
      {loading && indices.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <IndexCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {indices.map(idx => (
            <IndexCard key={idx.symbol} data={idx} lang={lang} />
          ))}
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[rgba(0,212,255,0.08)]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" />
          <span className="text-xs text-red-400 font-medium">{t('overview.realtime', lang)}</span>
        </div>
        <span className="text-xs text-red-400/60 font-mono">
          {t('market.' + market, lang)} · {t('overview.autoRefresh', lang)}
        </span>
      </div>
    </HudPanel>
  );
}
