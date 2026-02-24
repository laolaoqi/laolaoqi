// ===================================================================
// MarketOverview — 市场全景扫描 v2
// 同时展示所有市场指数，当前市场高亮
// ===================================================================

import { useRef, useEffect, useMemo } from 'react';
import HudPanel from './HudPanel';
import { useApp, type MarketId } from '@/contexts/AppContext';
import { t, getName, type Lang } from '@/lib/i18n';
import type { IndexData } from '@/lib/marketData';

interface Props {
  allIndices: IndexData[];
  loading: boolean;
}

const MARKET_ORDER: { id: MarketId; labelKey: string }[] = [
  { id: 'cn', labelKey: 'market.cn' },
  { id: 'hk', labelKey: 'market.hk' },
  { id: 'us', labelKey: 'market.us' },
  { id: 'crypto', labelKey: 'market.crypto' },
];

function MiniChart({ data, isUp }: { data: { time: number; value: number }[]; isUp: boolean }) {
  if (data.length < 2) return null;
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 130, height = 36, pad = 2;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((d.value - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });
  const color = isUp ? '#00e676' : '#ff3b3b';
  const areaPath = `M${points[0]} ${points.join(' L')} L${width - pad},${height} L${pad},${height} Z`;
  return (
    <svg width={width} height={height} className="opacity-80">
      <defs>
        <linearGradient id={`g-${isUp ? 'u' : 'd'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#g-${isUp ? 'u' : 'd'})`} />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function formatPrice(p: number) {
  if (p >= 10000) return p.toFixed(0);
  if (p >= 100) return p.toFixed(1);
  return p.toFixed(2);
}

function IndexCard({ data, isActiveMarket, lang }: { data: IndexData; isActiveMarket: boolean; lang: Lang }) {
  const isUp = data.change >= 0;
  const color = isUp ? '#00e676' : '#ff3b3b';
  const displayName = getName(data, lang) || data.name;

  return (
    <div className={`relative rounded-lg border p-3 transition-all duration-300 ${
      isActiveMarket
        ? 'border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.04)] shadow-[0_0_12px_rgba(0,212,255,0.08)]'
        : 'border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)] opacity-55 hover:opacity-80'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs text-[#ccddeeff] font-medium">{displayName}</div>
          <div className="text-[9px] text-[#556677] font-mono">{data.symbol}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>
            {formatPrice(data.price)}
          </div>
          <div className="text-[10px] tabular-nums" style={{ color }}>
            {isUp ? '+' : ''}{data.changePercent.toFixed(2)}%
          </div>
        </div>
      </div>
      <MiniChart data={data.chartData} isUp={isUp} />
      <div className="flex items-center justify-between mt-1.5 text-[9px] text-[#667788]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <span>H:{formatPrice(data.high)}</span>
        <span>L:{formatPrice(data.low)}</span>
      </div>
    </div>
  );
}

function IndexCardSkeleton() {
  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.04)] p-3 animate-pulse">
      <div className="h-3 w-16 bg-[rgba(0,212,255,0.1)] rounded mb-2" />
      <div className="h-5 w-24 bg-[rgba(0,212,255,0.1)] rounded mb-3" />
      <div className="h-9 w-full bg-[rgba(0,212,255,0.05)] rounded" />
    </div>
  );
}

export default function MarketOverview({ allIndices, loading }: Props) {
  const { lang, market, setMarket } = useApp();

  // Group indices by market
  const grouped = useMemo(() => {
    const g: Record<string, IndexData[]> = {};
    for (const idx of allIndices) {
      const m = idx.market || 'cn';
      if (!g[m]) g[m] = [];
      g[m].push(idx);
    }
    return g;
  }, [allIndices]);

  return (
    <HudPanel title={t('panel.marketScan', lang)} scan>
      {loading && allIndices.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <IndexCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="space-y-4">
          {MARKET_ORDER.map(mo => {
            const indices = grouped[mo.id] || [];
            if (indices.length === 0) return null;
            const isActive = mo.id === market;
            return (
              <div key={mo.id}>
                {/* Market section header */}
                <button
                  onClick={() => setMarket(mo.id)}
                  className={`flex items-center gap-2 mb-2 w-full text-left transition-all ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-70'}`}
                >
                  <div className={`w-1 h-3 rounded-full transition-colors ${isActive ? 'bg-[#00d4ff]' : 'bg-[#334455]'}`} />
                  <span className={`text-[10px] font-medium tracking-wider transition-colors ${isActive ? 'text-[#00d4ff]' : 'text-[#556677]'}`}>
                    {t(mo.labelKey, lang)}
                  </span>
                  <div className="flex-1 h-[1px] bg-[rgba(0,212,255,0.06)]" />
                  {isActive && <span className="text-[8px] text-[#00d4ff] bg-[rgba(0,212,255,0.1)] px-1.5 py-0.5 rounded">{t('overview.active', lang)}</span>}
                </button>
                {/* Index cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {indices.map(idx => (
                    <IndexCard key={idx.symbol} data={idx} isActiveMarket={isActive} lang={lang} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[rgba(0,212,255,0.08)]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" />
          <span className="text-[10px] text-[#8899aa]">{t('overview.realtime', lang)}</span>
        </div>
        <span className="text-[10px] text-[#8899aa]/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {t('overview.autoRefresh', lang)}
        </span>
      </div>
    </HudPanel>
  );
}
