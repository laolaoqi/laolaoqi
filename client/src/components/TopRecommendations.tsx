// ===================================================================
// TopRecommendations — 核心推荐 TOP 10 v5 (策略引擎 + 标签 + 理由弹窗)
// ===================================================================

import { useState } from 'react';
import { StockRecommendation } from '@/lib/marketData';
import HudPanel from './HudPanel';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { t, getName, getReason, Lang } from '@/lib/i18n';
import { Link } from 'wouter';
import { ExternalLink, Lock, X, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

interface Props { recommendations: StockRecommendation[]; }

const SIGNAL_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  buy: { bg: 'rgba(0,230,118,0.15)', text: '#00e676', border: 'rgba(0,230,118,0.4)', label: '买入' },
  add: { bg: 'rgba(0,212,255,0.15)', text: '#00d4ff', border: 'rgba(0,212,255,0.4)', label: '加仓' },
  hold: { bg: 'rgba(240,180,41,0.15)', text: '#f0b429', border: 'rgba(240,180,41,0.4)', label: '持有' },
  reduce: { bg: 'rgba(255,59,59,0.15)', text: '#ff3b3b', border: 'rgba(255,59,59,0.4)', label: '减仓' },
};

const TAG_COLORS: Record<string, string> = {
  '低估值': '#00d4ff',
  '破净': '#00d4ff',
  '高股息': '#00e676',
  '稳定分红': '#00e676',
  '主力流入': '#f0b429',
  '主力流出': '#ff3b3b',
  '超卖反弹': '#a78bfa',
  '强势': '#f0b429',
  '多头排列': '#00e676',
  '放量上涨': '#00e676',
  '创新高': '#f0b429',
  '底部区域': '#00d4ff',
};

function SignalBadge({ signal, lang }: { signal: string; lang: string }) {
  const c = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG['hold'];
  const labelKey = `signal.${signal}`;
  return (
    <span className="inline-flex items-center px-2.5 py-1 text-sm font-bold rounded-sm border" style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}>
      {t(labelKey, lang as Lang)}
    </span>
  );
}

function TagBadge({ tag }: { tag: string }) {
  const color = TAG_COLORS[tag] || '#8899aa';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm border"
      style={{ color, borderColor: `${color}44`, backgroundColor: `${color}11` }}
    >
      {tag}
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

// Stock Detail Modal
function StockDetailModal({ stock, market, lang, onClose }: { stock: StockRecommendation; market: string; lang: Lang; onClose: () => void }) {
  const currency = getCurrencySymbol(market);
  const isUp = stock.changePercent >= 0;
  const color = isUp ? '#00e676' : '#ff3b3b';
  const c = SIGNAL_CONFIG[stock.signal] || SIGNAL_CONFIG['hold'];
  const tags: string[] = (stock as any).tags || [];
  const reasonDetail: string = (stock as any).reasonDetail || stock.reason || '';
  const displayName = getName(stock as any, lang) || stock.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[var(--hud-bg,rgba(8,16,28,0.95))] border border-[rgba(0,212,255,0.2)] rounded-lg shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[rgba(0,212,255,0.1)]">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold" style={{ color: '#e0e8f0' }}>{displayName}</span>
            <span className="text-sm text-red-400 font-mono">{stock.code}</span>
            <SignalBadge signal={stock.signal} lang={lang} />
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
            <X size={18} className="text-red-400" />
          </button>
        </div>

        {/* Price section */}
        <div className="p-4 border-b border-[rgba(0,212,255,0.06)]">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
              {currency}{stock.price.toFixed(2)}
            </span>
            <span className="text-lg font-medium tabular-nums" style={{ color }}>
              {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </span>
            {isUp ? <TrendingUp size={20} style={{ color }} /> : stock.changePercent < 0 ? <TrendingDown size={20} style={{ color }} /> : <Minus size={20} className="text-gray-400" />}
          </div>
          <div className="text-sm text-red-400 mt-1">{stock.industry}</div>
        </div>

        {/* Score & Metrics */}
        <div className="p-4 border-b border-[rgba(0,212,255,0.06)]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-2 rounded bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.1)]">
              <div className="text-xs text-red-400 mb-1">综合评分</div>
              <div className="text-xl font-bold" style={{ color: stock.score >= 75 ? '#00d4ff' : stock.score >= 50 ? '#f0b429' : '#ff3b3b' }}>{stock.score}</div>
            </div>
            {(stock as any).pe != null && (
              <div className="text-center p-2 rounded bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.1)]">
                <div className="text-xs text-red-400 mb-1">PE</div>
                <div className="text-lg font-bold text-[#e0e8f0]">{(stock as any).pe?.toFixed(1)}</div>
              </div>
            )}
            {(stock as any).pb != null && (
              <div className="text-center p-2 rounded bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.1)]">
                <div className="text-xs text-red-400 mb-1">PB</div>
                <div className="text-lg font-bold text-[#e0e8f0]">{(stock as any).pb?.toFixed(2)}</div>
              </div>
            )}
            {(stock as any).dividendYield != null && (stock as any).dividendYield > 0 && (
              <div className="text-center p-2 rounded bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.1)]">
                <div className="text-xs text-red-400 mb-1">股息率</div>
                <div className="text-lg font-bold text-[#e0e8f0]">{(stock as any).dividendYield?.toFixed(1)}%</div>
              </div>
            )}
            <div className="text-center p-2 rounded bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.1)]">
              <div className="text-xs text-red-400 mb-1">资金流</div>
              <div className="text-lg font-bold" style={{ color: stock.capitalFlow >= 0 ? '#00e676' : '#ff3b3b' }}>
                {stock.capitalFlow >= 0 ? '+' : ''}{stock.capitalFlow.toFixed(1)}亿
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="px-4 pt-3 pb-2 border-b border-[rgba(0,212,255,0.06)]">
            <div className="text-xs text-red-400 mb-2 font-medium">策略标签</div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => <TagBadge key={i} tag={tag} />)}
            </div>
          </div>
        )}

        {/* Reason Detail */}
        <div className="p-4">
          <div className="text-xs text-red-400 mb-2 font-medium flex items-center gap-1">
            <Info size={12} /> AI推荐理由
          </div>
          <div className="text-sm text-[#c0ccd8] leading-relaxed whitespace-pre-line font-mono" style={{ fontSize: '13px' }}>
            {reasonDetail || stock.reason || '综合评分较高，基本面稳健'}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="px-4 pb-3">
          <div className="text-[11px] text-red-400/40 text-center border-t border-[rgba(0,212,255,0.06)] pt-2">
            数据仅供参考，不构成投资建议
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TopRecommendations({ recommendations }: Props) {
  const { lang, market } = useApp();
  const { isAuthenticated } = useAuth();
  const currency = getCurrencySymbol(market);
  const isGuest = !isAuthenticated;
  const [selectedStock, setSelectedStock] = useState<StockRecommendation | null>(null);

  return (
    <HudPanel title={t('panel.topRec', lang)} scan>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <thead>
            <tr className="text-red-400 text-sm tracking-wider border-b border-[rgba(0,212,255,0.12)]">
              <th className="text-left py-2.5 px-1.5 font-semibold">#</th>
              <th className="text-left py-2.5 px-1.5 font-semibold">{t('table.name', lang)}</th>
              <th className="text-left py-2.5 px-1.5 font-semibold hidden sm:table-cell">{t('table.code', lang)}</th>
              <th className="text-left py-2.5 px-1.5 font-semibold hidden md:table-cell">{t('table.industry', lang)}</th>
              <th className="text-right py-2.5 px-1.5 font-semibold">{t('table.price', lang)}</th>
              <th className="text-right py-2.5 px-1.5 font-semibold">{t('table.change', lang)}</th>
              <th className="text-center py-2.5 px-1.5 font-semibold hidden sm:table-cell">{t('table.score', lang)}</th>
              <th className="text-center py-2.5 px-1.5 font-semibold">{t('table.signal', lang)}</th>
              <th className="text-right py-2.5 px-1.5 font-semibold hidden lg:table-cell">{t('table.flow', lang)}</th>
              <th className="text-left py-2.5 px-1.5 font-semibold hidden xl:table-cell">标签</th>
              <th className="text-center py-2.5 px-1.5 font-semibold hidden xl:table-cell">详情</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map(stock => {
              const isUp = stock.changePercent >= 0;
              const color = isUp ? '#00e676' : '#ff3b3b';
              const flowColor = stock.capitalFlow >= 0 ? '#00e676' : '#ff3b3b';
              const displayName = getName(stock as any, lang) || stock.name;
              const stockSymbol = stock.symbol || stock.code;
              const tags: string[] = (stock as any).tags || [];

              return (
                <tr key={stock.code} className="border-b border-[rgba(0,212,255,0.04)] hover:bg-[rgba(0,212,255,0.03)] transition-colors">
                  <td className="py-2.5 px-1.5">
                    <span className={`inline-flex items-center justify-center w-7 h-7 text-sm font-bold rounded-sm ${stock.rank <= 3 ? 'bg-[rgba(240,180,41,0.2)] text-[#f0b429] border border-[rgba(240,180,41,0.4)]' : 'text-red-400/60'}`}>
                      {stock.rank}
                    </span>
                  </td>
                  <td className="py-2.5 px-1.5">
                    {isGuest ? (
                      <span className="text-red-500/60 font-medium text-sm">{'★'.repeat(Math.min(stock.rank, 3))} ***</span>
                    ) : (
                      <button
                        onClick={() => setSelectedStock(stock)}
                        className="text-[#e0e8f0] font-medium hover:text-[#00d4ff] transition-colors inline-flex items-center gap-1 group text-sm cursor-pointer bg-transparent border-0"
                      >
                        {displayName}
                        <Info size={12} className="opacity-0 group-hover:opacity-60 transition-opacity text-[#00d4ff]" />
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-1.5 text-red-400 hidden sm:table-cell text-sm">{isGuest ? '***' : stock.code}</td>
                  <td className="py-2.5 px-1.5 text-red-400 hidden md:table-cell text-sm">{isGuest ? '***' : stock.industry}</td>
                  <td className="py-2.5 px-1.5 text-right tabular-nums font-medium text-sm" style={{ color: isGuest ? '#ef4444' : color }}>{isGuest ? '***' : `${currency}${stock.price.toFixed(2)}`}</td>
                  <td className="py-2.5 px-1.5 text-right tabular-nums font-medium text-sm" style={{ color: isGuest ? '#ef4444' : color }}>{isGuest ? '***' : `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%`}</td>
                  <td className="py-2.5 px-1.5 text-center hidden sm:table-cell">
                    {isGuest ? (
                      <span className="text-red-500/50 text-xs">***</span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-10 h-7 text-sm font-bold rounded-sm" style={{ backgroundColor: `rgba(0,212,255,${stock.score / 300})`, color: stock.score >= 75 ? '#00d4ff' : '#f0b429', border: stock.score >= 75 ? '1px solid rgba(0,212,255,0.3)' : 'none' }}>
                        {stock.score}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-1.5 text-center">{isGuest ? <span className="text-red-500/50 text-xs">***</span> : <SignalBadge signal={stock.signal} lang={lang} />}</td>
                  <td className="py-2.5 px-1.5 text-right tabular-nums hidden lg:table-cell font-medium text-sm" style={{ color: isGuest ? '#ef4444' : flowColor }}>
                    {isGuest ? '***' : `${stock.capitalFlow >= 0 ? '+' : ''}${stock.capitalFlow.toFixed(2)}${t('table.flowUnit', lang)}`}
                  </td>
                  <td className="py-2.5 px-1.5 hidden xl:table-cell">
                    {isGuest ? (
                      <span className="text-red-500/50 text-xs">***</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {tags.slice(0, 3).map((tag, i) => <TagBadge key={i} tag={tag} />)}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-1.5 text-center hidden xl:table-cell">
                    {!isGuest && (
                      <button
                        onClick={() => setSelectedStock(stock)}
                        className="p-1.5 rounded hover:bg-[rgba(0,212,255,0.1)] transition-colors cursor-pointer bg-transparent border border-[rgba(0,212,255,0.15)]"
                        title="查看推荐理由"
                      >
                        <Info size={14} className="text-[#00d4ff]" />
                      </button>
                    )}
                  </td>
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
          <span className="text-sm text-red-500 font-medium">
            {lang === 'zh' ? '登录后查看完整推荐数据' : 'Login to view full recommendation data'}
          </span>
          <a
            href={getLoginUrl()}
            className="ml-2 px-4 py-1.5 text-xs font-medium bg-red-500/20 border border-red-500/30 text-red-400 rounded hover:bg-red-500/30 transition-colors"
          >
            {lang === 'zh' ? '立即登录' : 'Login Now'}
          </a>
        </div>
      )}

      {/* Strategy engine info */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(0,212,255,0.06)]">
        <span className="text-xs text-red-400/80 font-mono">
          策略引擎 · 每5分钟自动更新
        </span>
        <span className="text-xs text-red-400/60 font-mono">
          {t('rec.nextUpdate', lang)}: 5 min · {t('market.' + market, lang)}
        </span>
      </div>

      {/* Stock Detail Modal */}
      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          market={market}
          lang={lang}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </HudPanel>
  );
}
