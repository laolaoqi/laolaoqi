// ===================================================================
// MarketSentiment — 市场情绪指标 v2 (多语言)
// ===================================================================

import { MarketSentiment as SentimentData } from '@/lib/marketData';
import HudPanel from './HudPanel';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/lib/i18n';

interface Props { sentiment: SentimentData; }

export default function MarketSentimentPanel({ sentiment }: Props) {
  const { lang } = useApp();
  const total = sentiment.riseCount + sentiment.flatCount + sentiment.fallCount;
  const riseRatio = (sentiment.riseCount / total) * 100;
  const flatRatio = (sentiment.flatCount / total) * 100;

  return (
    <HudPanel title={t('panel.sentiment', lang)}>
      {/* Rise/Fall ratio bar */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-red-500">{t('sentiment.risefall', lang)}</span>
          <span className="font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: riseRatio > 50 ? '#ff3b3b' : '#00e676' }}>
            {riseRatio.toFixed(1)}%
          </span>
        </div>
        <div className="h-4 bg-[rgba(255,255,255,0.04)] rounded-sm overflow-hidden flex">
          <div className="h-full transition-all duration-1000" style={{ width: `${riseRatio}%`, background: 'linear-gradient(90deg, #ff3b3b, #ff3b3b80)', boxShadow: '0 0 8px #ff3b3b30' }} />
          <div className="h-full transition-all duration-1000" style={{ width: `${flatRatio}%`, background: '#8899aa40' }} />
          <div className="h-full flex-1 transition-all duration-1000" style={{ background: 'linear-gradient(90deg, #00e67680, #00e676)', boxShadow: '0 0 8px #00e67630' }} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-[rgba(255,59,59,0.05)] rounded-sm border border-[rgba(255,59,59,0.1)]">
          <div className="text-sm text-[#ff3b3b]/70 mb-0.5">{t('sentiment.rise', lang)}</div>
          <div className="text-base font-bold text-[#ff3b3b] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sentiment.riseCount}</div>
        </div>
        <div className="text-center p-2 bg-[rgba(136,153,170,0.05)] rounded-sm border border-[rgba(136,153,170,0.1)]">
          <div className="text-sm text-red-400/80 mb-0.5">{t('sentiment.flat', lang)}</div>
          <div className="text-base font-bold text-red-500 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sentiment.flatCount}</div>
        </div>
        <div className="text-center p-2 bg-[rgba(0,230,118,0.05)] rounded-sm border border-[rgba(0,230,118,0.1)]">
          <div className="text-sm text-[#00e676]/70 mb-0.5">{t('sentiment.fall', lang)}</div>
          <div className="text-base font-bold text-[#00e676] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sentiment.fallCount}</div>
        </div>
      </div>

      {/* Limit up/down */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center justify-between p-2 bg-[rgba(0,230,118,0.03)] rounded-sm">
          <span className="text-xs text-red-500">{t('sentiment.limitUp', lang)}</span>
          <span className="text-base font-bold text-[#ff3b3b] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sentiment.limitUp}</span>
        </div>
        <div className="flex-1 flex items-center justify-between p-2 bg-[rgba(255,59,59,0.03)] rounded-sm">
          <span className="text-xs text-red-500">{t('sentiment.limitDown', lang)}</span>
          <span className="text-base font-bold text-[#00e676] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sentiment.limitDown}</span>
        </div>
      </div>
    </HudPanel>
  );
}
