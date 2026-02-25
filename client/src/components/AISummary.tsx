// ===================================================================
// AISummary — AI 智能市场摘要
// ===================================================================

import HudPanel from './HudPanel';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/lib/i18n';
import { trpc } from '@/lib/trpc';
import { Brain, AlertTriangle, TrendingUp, Lightbulb, RefreshCw } from 'lucide-react';

export default function AISummary() {
  const { lang, market } = useApp();

  const { data, isLoading, refetch, isFetching } = trpc.market.aiSummary.useQuery(
    { market, lang },
    { refetchInterval: 15 * 60 * 1000, retry: 1, staleTime: 10 * 60 * 1000 }
  );

  const summary = data?.summary;

  return (
    <HudPanel title={t('panel.aiSummary', lang)}>
      <div className="relative">
        {/* Refresh button */}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="absolute top-0 right-0 p-1 rounded hover:bg-[rgba(0,212,255,0.1)] text-red-400/80 hover:text-[#00d4ff] transition-colors disabled:opacity-30"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
        </button>

        {isLoading || !summary ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-5 w-3/4 bg-[rgba(0,212,255,0.1)] rounded" />
            <div className="h-4 w-full bg-[rgba(0,212,255,0.06)] rounded" />
            <div className="h-4 w-5/6 bg-[rgba(0,212,255,0.06)] rounded" />
            <div className="flex items-center gap-2 pt-2">
              <Brain size={14} className="text-[#00d4ff] animate-pulse" />
              <span className="text-sm text-red-400/80">
                {lang === 'zh' ? 'AI 正在分析市场数据...' : 'AI analyzing market data...'}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Title */}
            <div className="flex items-start gap-2">
              <Brain size={16} className="text-[#00d4ff] shrink-0 mt-0.5" />
              <h3 className="text-sm font-bold text-[#ccddeeff] leading-snug">{summary.title}</h3>
            </div>

            {/* Overview */}
            <p className="text-sm text-red-500 leading-relaxed pl-6">{summary.overview}</p>

            {/* Key Points */}
            <div className="pl-6 space-y-1.5">
              {summary.keyPoints?.map((point: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <Lightbulb size={11} className="text-[#ffaa00] shrink-0 mt-0.5" />
                  <span className="text-[11px] text-[#aabbcc]">{point}</span>
                </div>
              ))}
            </div>

            {/* Outlook */}
            <div className="flex items-start gap-2 pl-6 pt-1">
              <TrendingUp size={12} className="text-[#00e676] shrink-0 mt-0.5" />
              <span className="text-[11px] text-[#88cc88]">{summary.outlook}</span>
            </div>

            {/* Risk Warning */}
            <div className="flex items-start gap-2 mt-2 p-2 rounded bg-[rgba(255,68,102,0.05)] border border-[rgba(255,68,102,0.1)]">
              <AlertTriangle size={12} className="text-[#ff4466] shrink-0 mt-0.5" />
              <span className="text-sm text-[#ff6677]">{summary.riskWarning}</span>
            </div>

            {/* AI badge */}
            <div className="flex items-center justify-end gap-1.5 pt-1">
              <div className="w-1 h-1 rounded-full bg-[#00d4ff] animate-pulse" />
              <span className="text-sm text-red-400/80 font-mono">
                AI Generated · {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </HudPanel>
  );
}
