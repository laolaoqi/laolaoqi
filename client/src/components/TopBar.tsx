// ===================================================================
// TopBar — 顶部导航 v2
// 品牌 | 市场标签 | 全球交易时钟 | 语言切换 | 用户
// ===================================================================

import { useApp, type MarketId, type TradingStatus } from '@/contexts/AppContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { t, LANGS, type Lang } from '@/lib/i18n';
import { RefreshCw, Wifi, WifiOff, Globe, ChevronDown, LogIn, LogOut, User, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { useState, useRef, useEffect } from 'react';

interface TopBarProps {
  isLive: boolean;
  lastUpdate: Date | null;
  onRefresh: () => void;
}

const MARKETS: { id: MarketId; icon: string }[] = [
  { id: 'cn', icon: '🇨🇳' },
  { id: 'hk', icon: '🇭🇰' },
  { id: 'us', icon: '🇺🇸' },
  { id: 'crypto', icon: '₿' },
];

const STATUS_CONFIG: Record<TradingStatus, { color: string; pulse: boolean }> = {
  trading: { color: '#00ff88', pulse: true },
  closed: { color: '#ff4466', pulse: false },
  premarket: { color: '#ffaa00', pulse: true },
  afterhours: { color: '#ffaa00', pulse: false },
  lunchbreak: { color: '#ffaa00', pulse: true },
  '24h': { color: '#00ff88', pulse: true },
};

export default function TopBar({ isLive, lastUpdate, onRefresh }: TopBarProps) {
  const { lang, setLang, market, setMarket, clocks, userLocalTime } = useApp();
  const { user, isAuthenticated, logout } = useAuth();
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--theme-panel-border)] backdrop-blur-xl" style={{ backgroundColor: 'var(--theme-header-bg)' }}>
      {/* Glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent opacity-60" />

      {/* Main bar */}
      <div className="max-w-[1600px] mx-auto px-3 lg:px-5">
        <div className="flex items-center h-12 gap-2 sm:gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-[#00d4ff] to-[#0066ff] flex items-center justify-center shadow-[0_0_12px_rgba(0,212,255,0.3)]">
              <span className="text-xs font-black text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>HA</span>
            </div>
            <span className="text-sm font-bold text-[#00d4ff] hidden sm:block tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {t('brand.name', lang)}
            </span>
          </div>

          {/* Divider */}
          <div className="w-[1px] h-5 bg-[rgba(0,212,255,0.12)] hidden sm:block" />

          {/* Market Tabs */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {MARKETS.map(m => (
              <button
                key={m.id}
                onClick={() => setMarket(m.id)}
                className={`px-2 sm:px-2.5 py-1 rounded text-xs sm:text-xs font-medium transition-all duration-200 ${
                  market === m.id
                    ? 'bg-[rgba(0,212,255,0.15)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)] shadow-[0_0_8px_rgba(0,212,255,0.15)]'
                    : 'text-red-500 hover:text-red-400 hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
                }`}
              >
                <span className="mr-0.5 sm:mr-1">{m.icon}</span>
                <span>{t(`market.${m.id}`, lang)}</span>
              </button>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Trading Clocks - desktop */}
          <div className="hidden xl:flex items-center gap-4">
            {clocks.map(c => {
              const cfg = STATUS_CONFIG[c.status];
              const isActive = c.market === market;
              return (
                <button
                  key={c.market}
                  onClick={() => setMarket(c.market)}
                  className={`flex items-center gap-1.5 transition-opacity ${isActive ? 'opacity-100' : 'opacity-60 hover:opacity-85'}`}
                >
                  <div className="relative shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                    {cfg.pulse && <div className="absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: cfg.color, opacity: 0.4 }} />}
                  </div>
                  <span className="text-sm text-foreground font-mono tabular-nums font-bold">{c.localTime}</span>
                  <span className="text-sm px-1.5 py-0.5 rounded font-semibold" style={{ color: cfg.color, backgroundColor: `${cfg.color}25` }}>
                    {t(`status.${c.status}`, lang)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Data Status */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[rgba(0,0,0,0.3)]">
            {isLive ? (
              <Wifi size={11} className="text-[#00ff88]" />
            ) : (
              <WifiOff size={11} className="text-[#ff8800]" />
            )}
            <span className="text-xs font-mono" style={{ color: isLive ? '#00ff88' : '#ff8800' }}>
              {isLive ? t('topbar.live', lang) : t('topbar.mock', lang)}
            </span>
          </div>

          {/* Refresh */}
          <button onClick={onRefresh} className="p-1.5 rounded hover:bg-[rgba(0,212,255,0.08)] text-red-500/70 hover:text-[#00d4ff] transition-colors" title={t('topbar.refresh', lang)}>
            <RefreshCw size={13} />
          </button>

          {/* Language Switcher */}
          <div ref={langRef} className="relative">
            <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-[rgba(0,212,255,0.08)] text-red-500/70 hover:text-muted-foreground/80 transition-colors">
              <Globe size={13} />
              <span className="text-xs">{LANGS.find(l => l.id === lang)?.flag}</span>
              <ChevronDown size={9} className={`transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 bg-popover border border-[var(--theme-panel-border)] rounded-lg shadow-2xl overflow-y-auto z-50 min-w-[140px] max-h-[400px]">
                {LANGS.map(l => (
                  <button
                    key={l.id}
                    onClick={() => { setLang(l.id); setLangOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors ${lang === l.id ? 'text-primary bg-accent' : 'text-red-500'}`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User */}
          <div ref={userRef} className="relative">
            {isAuthenticated ? (
              <>
                <button onClick={() => setUserOpen(!userOpen)} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[rgba(0,212,255,0.08)] text-red-500 transition-colors">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#0066ff] flex items-center justify-center">
                    <User size={10} className="text-white" />
                  </div>
                  <span className="text-xs hidden sm:inline max-w-[60px] truncate text-red-400">{user?.name || 'User'}</span>
                </button>
                {userOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-popover border border-[var(--theme-panel-border)] rounded-lg shadow-2xl overflow-hidden z-50 min-w-[120px]">
                    <div className="px-3 py-2 border-b border-border">
                      <div className="text-xs text-red-400">{user?.name}</div>
                      <div className="text-xs text-red-500/60">{user?.email}</div>
                    </div>
                    {user?.role === 'admin' && (
                      <Link href="/admin">
                        <button
                          onClick={() => setUserOpen(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-[rgba(239,68,68,0.08)] transition-colors border-b border-[rgba(0,212,255,0.08)]"
                        >
                          <ShieldCheck size={12} />
                          <span>{lang === 'zh' ? '管理后台' : 'Admin Panel'}</span>
                        </button>
                      </Link>
                    )}
                    <a href="/crypto-investment">
                      <button
                        onClick={() => setUserOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-[rgba(239,68,68,0.08)] transition-colors border-b border-[rgba(0,212,255,0.08)]"
                      >
                        <span className="text-sm">₿</span>
                        <span>{lang === 'zh' ? '投资看板' : 'Crypto Board'}</span>
                      </button>
                    </a>
                    <a href="/ashare-sim">
                      <button
                        onClick={() => setUserOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-[rgba(239,68,68,0.08)] transition-colors border-b border-[rgba(0,212,255,0.08)]"
                      >
                        <span className="text-sm">🇨🇳</span>
                        <span>{lang === 'zh' ? 'A股模拟投资' : 'A-Share Sim'}</span>
                      </button>
                    </a>
                    <a href="/about">
                      <button
                        onClick={() => setUserOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-[rgba(239,68,68,0.08)] transition-colors border-b border-[rgba(0,212,255,0.08)]"
                      >
                        <span className="text-sm">📖</span>
                        <span>{lang === 'zh' ? '数据模型说明' : 'Data Model'}</span>
                      </button>
                    </a>
                    <button
                      onClick={() => { logout(); setUserOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#ff4466] hover:bg-[rgba(255,68,102,0.08)] transition-colors"
                    >
                      <LogOut size={12} />
                      <span>{t('topbar.logout', lang)}</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <a href={getLoginUrl()} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.18)] transition-all text-xs font-medium">
                <LogIn size={11} />
                <span>{t('topbar.login', lang)}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Trading Clock Bar - mobile/tablet */}
      <div className="xl:hidden border-t border-[rgba(0,212,255,0.06)] px-3 py-1">
        <div className="flex items-center justify-between gap-1 overflow-x-auto">
          {clocks.map(c => {
            const cfg = STATUS_CONFIG[c.status];
            const isActive = c.market === market;
            return (
              <button
                key={c.market}
                onClick={() => setMarket(c.market)}
                className={`flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded transition-all ${isActive ? 'opacity-100 bg-[rgba(0,212,255,0.08)]' : 'opacity-55 hover:opacity-75'}`}
              >
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="text-sm text-foreground font-mono font-semibold">{t(`market.${c.market}`, lang)}</span>
                <span className="text-sm text-foreground/90 font-mono tabular-nums font-bold">{c.localTime}</span>
                <span className="text-sm font-semibold" style={{ color: cfg.color }}>{t(`status.${c.status}`, lang)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
