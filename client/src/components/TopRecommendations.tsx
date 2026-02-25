// ===================================================================
// TopRecommendations — 核心推荐 TOP 10 v3 (多语言 + 点击跳转详情)
// ===================================================================

import { StockRecommendation } from '@/lib/marketData';
import HudPanel from './HudPanel';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { t, getName, getReason } from '@/lib/i18n';
import { Link } from 'wouter';
import { ExternalLink, Lock } from 'lucide-react';

interface Props { recommendations: StockRecommendation[]; }

const SIGNAL_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  buy: { bg: 'rgba(0,230,118,0.1)', text: '#00e676', border: 'rgba(0,230,118,0.3)' },
  add: { bg: 'rgba(0,212,255,0.1)', text: '#00d4ff', border: 'rgba(0,212,255,0.3)' },
  hold: { bg: 'rgba(240,180,41,0.1)', text: '#f0b429', border: 'rgba(240,180,41,0.3)' },
  reduce: { bg: 'rgba(255,59,59,0.1)', text: '#ff3b3b', border: 'rgba(255,59,59,0.3)' },
};

function SignalBadge({ signal, lang }: { signal: string; lang: string }) {
  const c = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG['hold'];
  const labelKey = `signal.${signal}`;
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-sm border" style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}>
      {t(labelKey, lang as any)}
    </span>
  );
}

function getCurrencySymbol(market: string) {
  switch (market) {
    case 'cn': return '¥';
    case 'hk': return 'HK$';
    case 'us': return '$';
    case 'crypto': return '$';
    default: return '¥';
  }
}

export default function TopRecommendations({ recommendations }: Props) {
  const { lang, market } = useApp();
  const { isAuthenticated } = useAuth();
  const currency = getCurrencySymbol(market);
  const isGuest = !isAuthenticated;

  return (
    <HudPanel title={t('panel.topRec', lang)} scan>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <thead>
            <tr className="text-red-500/60 text-[10px] tracking-wider border-b border-[rgba(0,212,255,0.08)]">
              <th className="text-left py-2 px-1 font-normal">#</th>
              <th className="text-left py-2 px-1 font-normal">{t('table.name', lang)}</th>
              <th className="text-left py-2 px-1 font-normal hidden sm:table-cell">{t('table.code', lang)}</th>
              <th className="text-left py-2 px-1 font-normal hidden md:table-cell">{t('table.industry', lang)}</th>
              <th className="text-right py-2 px-1 font-normal">{t('table.price', lang)}</th>
              <th className="text-right py-2 px-1 font-normal">{t('table.change', lang)}</th>
              <th className="text-center py-2 px-1 font-normal hidden sm:table-cell">{t('table.score', lang)}</th>
              <th className="text-center py-2 px-1 font-normal">{t('table.signal', lang)}</th>
              <th className="text-right py-2 px-1 font-normal hidden lg:table-cell">{t('table.flow', lang)}</th>
              <th className="text-left py-2 px-1 font-normal hidden xl:table-cell">{t('table.reason', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map(stock => {
              const isUp = stock.changePercent >= 0;
              const color = isUp ? '#00e676' : '#ff3b3b';
              const flowColor = stock.capitalFlow >= 0 ? '#00e676' : '#ff3b3b';
              const displayName = getName(stock as any, lang) || stock.name;
              const displayReason = getReason(stock as any, lang) || stock.reason;
              const stockSymbol = stock.symbol || stock.code;

              return (
                <tr key={stock.code} className="border-b border-[rgba(0,212,255,0.04)] hover:bg-[rgba(0,212,255,0.03)] transition-colors">
                  <td className="py-2 px-1">
                    <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-sm ${stock.rank <= 3 ? 'bg-[rgba(240,180,41,0.15)] text-[#f0b429] border border-[rgba(240,180,41,0.3)]' : 'text-[#8899aa]/50'}`}>
                      {stock.rank}
                    </span>
                  </td>
                  <td className="py-2 px-1">
                    {isGuest ? (
                      <span className="text-red-500/60 font-medium">{'★'.repeat(Math.min(stock.rank, 3))} ***</span>
                    ) : (
                      <Link
                        href={`/stock/${encodeURIComponent(stockSymbol)}`}
                        className="text-[#e0e8f0] font-medium hover:text-[#00d4ff] transition-colors inline-flex items-center gap-1 group"
                      >
                        {displayName}
                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                      </Link>
                    )}
                  </td>
                  <td className="py-2 px-1 text-red-500 hidden sm:table-cell">{isGuest ? '***' : stock.code}</td>
                  <td className="py-2 px-1 text-red-500 hidden md:table-cell">{isGuest ? '***' : stock.industry}</td>
                  <td className="py-2 px-1 text-right tabular-nums" style={{ color: isGuest ? '#ef4444' : color }}>{isGuest ? '***' : `${currency}${stock.price.toFixed(2)}`}</td>
                  <td className="py-2 px-1 text-right tabular-nums" style={{ color: isGuest ? '#ef4444' : color }}>{isGuest ? '***' : `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%`}</td>
                  <td className="py-2 px-1 text-center hidden sm:table-cell">
                    {isGuest ? (
                      <span className="text-red-500/50 text-[10px]">***</span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-8 h-5 text-[10px] font-bold rounded-sm" style={{ backgroundColor: `rgba(0,212,255,${stock.score / 300})`, color: stock.score >= 85 ? '#00d4ff' : '#8899aa', border: stock.score >= 85 ? '1px solid rgba(0,212,255,0.3)' : 'none' }}>
                        {stock.score}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-1 text-center">{isGuest ? <span className="text-red-500/50 text-[10px]">***</span> : <SignalBadge signal={stock.signal} lang={lang} />}</td>
                  <td className="py-2 px-1 text-right tabular-nums hidden lg:table-cell" style={{ color: isGuest ? '#ef4444' : flowColor }}>
                    {isGuest ? '***' : `${stock.capitalFlow >= 0 ? '+' : ''}${stock.capitalFlow.toFixed(2)}${t('table.flowUnit', lang)}`}
                  </td>
                  <td className="py-2 px-1 text-red-500/70 hidden xl:table-cell text-[10px]">{isGuest ? '***' : displayReason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Guest login prompt */}
      {isGuest && (
        <div className="flex items-center justify-center gap-2 mt-3 py-3 border border-red-500/20 rounded bg-red-500/5">
          <Lock size={14} className="text-red-500" />
          <span className="text-xs text-red-500">
            {lang === 'zh' ? '登录后查看完整推荐数据' : 'Login to view full recommendation data'}
          </span>
          <a
            href={getLoginUrl()}
            className="ml-2 px-3 py-1 text-[10px] font-medium bg-red-500/20 border border-red-500/30 text-red-400 rounded hover:bg-red-500/30 transition-colors"
          >
            {lang === 'zh' ? '立即登录' : 'Login Now'}
          </a>
        </div>
      )}

      {/* Next update hint */}
      <div className="flex items-center justify-end mt-2 pt-2 border-t border-[rgba(0,212,255,0.06)]">
        <span className="text-[9px] text-red-500/50 font-mono">
          {t('rec.nextUpdate', lang)}: 30 min · {t('market.' + market, lang)}
        </span>
      </div>
    </HudPanel>
  );
}
