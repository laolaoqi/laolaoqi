// ===================================================================
// HeatMap — 市场热力图（行业板块涨跌色块可视化）
// 默认显示8个板块，点击展开显示全部
// 每个板块内显示：成分股代码+名称+当前价格+涨跌幅
// ===================================================================

import HudPanel from './HudPanel';
import { useApp } from '@/contexts/AppContext';
import { t, type Lang } from '@/lib/i18n';
import { trpc } from '@/lib/trpc';
import { useMemo, useState } from 'react';
import { ArrowDownUp, ArrowUpNarrowWide, ArrowDownNarrowWide, ChevronDown, ChevronUp } from 'lucide-react';

const DEFAULT_VISIBLE = 8;

function getHeatColor(change: number): string {
  // 红涨绿跌（中国标准）
  if (change >= 3) return '#d50000';
  if (change >= 2) return '#ff1744';
  if (change >= 1) return '#e53935';
  if (change >= 0.3) return '#c62828';
  if (change > -0.3) return '#37474f';
  if (change > -1) return '#2e7d32';
  if (change > -2) return '#66bb6a';
  if (change > -3) return '#00e676';
  return '#00c853';
}

function getTextColor(change: number): string {
  if (Math.abs(change) < 0.3) return '#90a4ae';
  return '#ffffff';
}

interface StockItem {
  symbol: string;
  name: string;
  changePercent: number;
  price: number;
  volume: number;
}

interface SectorBlock {
  nameZh: string;
  nameEn: string;
  changePercent: number;
  weight: number;
  stocks: StockItem[];
}

function formatPrice(price: number): string {
  if (price <= 0) return '-';
  if (price >= 10000) return `${(price / 10000).toFixed(1)}万`;
  if (price >= 1000) return price.toFixed(1);
  return price.toFixed(2);
}

function cleanSymbol(sym: string): string {
  return sym.replace('.SS', '').replace('.SZ', '').replace('.HK', '').replace('-USD', '');
}

function SectorTile({ sector, lang }: { sector: SectorBlock; lang: Lang }) {
  const bgColor = getHeatColor(sector.changePercent);
  const textColor = getTextColor(sector.changePercent);
  const name = lang === 'zh' || lang === 'ja' || lang === 'ko' ? sector.nameZh : sector.nameEn;
  const isUp = sector.changePercent >= 0;

  return (
    <div
      className="relative rounded-md p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-default group overflow-hidden"
      style={{
        backgroundColor: bgColor,
        minHeight: `${Math.max(80, sector.weight * 18)}px`,
      }}
    >
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '8px 8px',
      }} />

      <div className="relative z-10">
        <div className="text-sm font-bold mb-1" style={{ color: textColor }}>{name}</div>
        <div className="text-xl font-black tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: textColor }}>
          {isUp ? '+' : ''}{sector.changePercent.toFixed(2)}%
        </div>
        <div className="text-xs mt-1 opacity-70" style={{ color: textColor }}>
          {sector.stocks.length} {lang === 'zh' ? '只标的' : 'stocks'}
        </div>
      </div>

      {/* Hover tooltip: show stocks with name + price + change */}
      <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md p-2 z-20 overflow-auto">
        <div className="text-xs text-[#00d4ff] font-bold mb-1.5 border-b border-[#00d4ff]/20 pb-1">{name}</div>
        <div className="space-y-0.5">
          {sector.stocks.map(s => (
            <div key={s.symbol} className="flex items-center justify-between text-xs py-0.5 gap-1">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <span className="text-[#00d4ff] font-mono text-[10px] shrink-0">{cleanSymbol(s.symbol)}</span>
                <span className="text-white/80 truncate text-[10px]">{s.name}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-white/60 font-mono text-[10px]">{formatPrice(s.price)}</span>
                <span
                  className={`font-mono text-[10px] font-semibold ${s.changePercent >= 0 ? 'text-[#ff3b3b]' : 'text-[#00e676]'}`}
                >
                  {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeatMapSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="rounded-md bg-[rgba(0,212,255,0.05)] animate-pulse" style={{ height: `${60 + Math.random() * 40}px` }} />
      ))}
    </div>
  );
}

type SortMode = 'default' | 'asc' | 'desc';

export default function HeatMap() {
  const { lang, market } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const { data, isLoading } = trpc.market.heatmap.useQuery(
    { market },
    { refetchInterval: 5 * 60 * 1000, retry: 2 }
  );

  const rawSectors: SectorBlock[] = data?.data || [];

  // Sort sectors by changePercent
  const allSectors = useMemo(() => {
    if (sortMode === 'default') return rawSectors;
    return [...rawSectors].sort((a, b) =>
      sortMode === 'desc'
        ? b.changePercent - a.changePercent
        : a.changePercent - b.changePercent
    );
  }, [rawSectors, sortMode]);

  const hasMore = allSectors.length > DEFAULT_VISIBLE;
  const visibleSectors = expanded ? allSectors : allSectors.slice(0, DEFAULT_VISIBLE);

  // Cycle through sort modes: default → desc → asc → default
  const cycleSortMode = () => {
    setSortMode(prev => {
      if (prev === 'default') return 'desc';
      if (prev === 'desc') return 'asc';
      return 'default';
    });
  };

  const sortLabel = sortMode === 'default'
    ? (lang === 'zh' ? '排序' : 'Sort')
    : sortMode === 'desc'
      ? (lang === 'zh' ? '涨幅↓' : 'Change ↓')
      : (lang === 'zh' ? '涨幅↑' : 'Change ↑');

  const SortIcon = sortMode === 'default'
    ? ArrowDownUp
    : sortMode === 'desc'
      ? ArrowDownNarrowWide
      : ArrowUpNarrowWide;

  return (
    <HudPanel title={t('panel.heatmap', lang)}>
      {/* Sort button - top right */}
      {rawSectors.length > 0 && (
        <div className="flex justify-end mb-2 -mt-1">
          <button
            onClick={cycleSortMode}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-all duration-200 border ${
              sortMode !== 'default'
                ? 'text-[#00d4ff] border-[#00d4ff]/50 bg-[rgba(0,212,255,0.12)]'
                : 'text-[#8899aa]/70 border-[#8899aa]/20 bg-transparent hover:text-[#00d4ff] hover:border-[#00d4ff]/30 hover:bg-[rgba(0,212,255,0.05)]'
            }`}
          >
            <SortIcon size={13} />
            {sortLabel}
          </button>
        </div>
      )}

      {isLoading && allSectors.length === 0 ? (
        <HeatMapSkeleton />
      ) : allSectors.length === 0 ? (
        <div className="text-center py-6 text-red-400/80 text-sm">
          {lang === 'zh' ? '暂无热力图数据' : 'No heatmap data available'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {visibleSectors.map(sector => (
              <SectorTile key={sector.nameEn} sector={sector} lang={lang} />
            ))}
          </div>

          {/* Expand / Collapse button */}
          {hasMore && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border"
                style={{
                  color: '#00d4ff',
                  borderColor: 'rgba(0,212,255,0.3)',
                  background: 'rgba(0,212,255,0.05)',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.background = 'rgba(0,212,255,0.15)';
                  (e.target as HTMLElement).style.borderColor = 'rgba(0,212,255,0.6)';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.background = 'rgba(0,212,255,0.05)';
                  (e.target as HTMLElement).style.borderColor = 'rgba(0,212,255,0.3)';
                }}
              >
                {expanded ? (
                  <>
                    <ChevronUp size={14} />
                    {lang === 'zh' ? `收起 (显示前${DEFAULT_VISIBLE}个)` : `Collapse (show ${DEFAULT_VISIBLE})`}
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    {lang === 'zh' ? `展开全部 (共${allSectors.length}个板块)` : `Show all (${allSectors.length} sectors)`}
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 mt-3 pt-2 border-t border-[rgba(0,212,255,0.08)]">
        {[
          { label: '-3%', color: '#00c853' },
          { label: '-1%', color: '#66bb6a' },
          { label: '0%', color: '#37474f' },
          { label: '+1%', color: '#e53935' },
          { label: '+3%', color: '#d50000' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] text-red-400 font-mono">{item.label}</span>
          </div>
        ))}
      </div>
    </HudPanel>
  );
}
