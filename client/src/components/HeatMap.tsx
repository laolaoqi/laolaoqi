// ===================================================================
// HeatMap — 市场热力图（行业板块涨跌色块可视化）
// ===================================================================

import HudPanel from './HudPanel';
import { useApp } from '@/contexts/AppContext';
import { t, type Lang } from '@/lib/i18n';
import { trpc } from '@/lib/trpc';

function getHeatColor(change: number): string {
  if (change >= 3) return '#00c853';
  if (change >= 2) return '#00e676';
  if (change >= 1) return '#66bb6a';
  if (change >= 0.3) return '#2e7d32';
  if (change > -0.3) return '#37474f';
  if (change > -1) return '#c62828';
  if (change > -2) return '#e53935';
  if (change > -3) return '#ff1744';
  return '#d50000';
}

function getTextColor(change: number): string {
  if (Math.abs(change) < 0.3) return '#90a4ae';
  return '#ffffff';
}

interface SectorBlock {
  nameZh: string;
  nameEn: string;
  changePercent: number;
  weight: number;
  stocks: { symbol: string; changePercent: number; price: number; volume: number }[];
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
        minHeight: `${Math.max(60, sector.weight * 22)}px`,
      }}
    >
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '8px 8px',
      }} />

      <div className="relative z-10">
        <div className="text-xs font-bold mb-1" style={{ color: textColor }}>{name}</div>
        <div className="text-lg font-black tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: textColor }}>
          {isUp ? '+' : ''}{sector.changePercent.toFixed(2)}%
        </div>
        <div className="text-[9px] mt-1 opacity-70" style={{ color: textColor }}>
          {sector.stocks.length} {lang === 'zh' ? '只标的' : 'stocks'}
        </div>
      </div>

      {/* Hover tooltip with stocks */}
      <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md p-2 z-20 overflow-auto">
        <div className="text-[10px] text-[#00d4ff] font-bold mb-1">{name}</div>
        {sector.stocks.map(s => (
          <div key={s.symbol} className="flex justify-between text-[9px] py-0.5">
            <span className="text-[#8899aa] font-mono">{s.symbol.replace('.SS', '').replace('.SZ', '').replace('.HK', '').replace('-USD', '')}</span>
            <span className={s.changePercent >= 0 ? 'text-[#00e676]' : 'text-[#ff3b3b]'} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatMapSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="rounded-md bg-[rgba(0,212,255,0.05)] animate-pulse" style={{ height: `${60 + Math.random() * 40}px` }} />
      ))}
    </div>
  );
}

export default function HeatMap() {
  const { lang, market } = useApp();

  const { data, isLoading } = trpc.market.heatmap.useQuery(
    { market },
    { refetchInterval: 5 * 60 * 1000, retry: 2 }
  );

  const sectors: SectorBlock[] = data?.data || [];

  return (
    <HudPanel title={t('panel.heatmap', lang)}>
      {isLoading && sectors.length === 0 ? (
        <HeatMapSkeleton />
      ) : sectors.length === 0 ? (
        <div className="text-center py-6 text-[#556677] text-sm">
          {lang === 'zh' ? '暂无热力图数据' : 'No heatmap data available'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {sectors.map(sector => (
            <SectorTile key={sector.nameEn} sector={sector} lang={lang} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 mt-3 pt-2 border-t border-[rgba(0,212,255,0.08)]">
        {[
          { label: '-3%', color: '#d50000' },
          { label: '-1%', color: '#e53935' },
          { label: '0%', color: '#37474f' },
          { label: '+1%', color: '#66bb6a' },
          { label: '+3%', color: '#00c853' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-[8px] text-[#667788] font-mono">{item.label}</span>
          </div>
        ))}
      </div>
    </HudPanel>
  );
}
