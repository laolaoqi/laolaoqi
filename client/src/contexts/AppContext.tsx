// ===================================================================
// 猎手阿尔法 — 全局应用上下文
// 管理：语言 / 当前市场 / 全球交易时钟
// ===================================================================

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { Lang, LANGS, isRTL } from '@/lib/i18n';

export type MarketId = 'cn' | 'hk' | 'us' | 'crypto';

// === 交易时间配置 ===
interface TradingSession { open: number; close: number; lunchStart?: number; lunchEnd?: number; }
interface MarketTimezone { tz: string; sessions: TradingSession[]; is24h?: boolean; }

const MARKET_TIMEZONES: Record<MarketId, MarketTimezone> = {
  cn: {
    tz: 'Asia/Shanghai',
    sessions: [{ open: 9 * 60 + 30, close: 15 * 60, lunchStart: 11 * 60 + 30, lunchEnd: 13 * 60 }],
  },
  hk: {
    tz: 'Asia/Hong_Kong',
    sessions: [{ open: 9 * 60 + 30, close: 16 * 60, lunchStart: 12 * 60, lunchEnd: 13 * 60 }],
  },
  us: {
    tz: 'America/New_York',
    sessions: [{ open: 9 * 60 + 30, close: 16 * 60 }],
  },
  crypto: {
    tz: 'UTC',
    sessions: [],
    is24h: true,
  },
};

export type TradingStatus = 'trading' | 'closed' | 'premarket' | 'afterhours' | 'lunchbreak' | '24h';

export interface MarketClock {
  market: MarketId;
  timezone: string;
  localTime: string;
  localDate: string;
  status: TradingStatus;
  nextEvent: string; // e.g. "Opens in 2h 15m"
}

function getMarketClock(market: MarketId): MarketClock {
  const cfg = MARKET_TIMEZONES[market];
  const now = new Date();

  const localTime = now.toLocaleTimeString('en-GB', { timeZone: cfg.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const localDate = now.toLocaleDateString('en-GB', { timeZone: cfg.tz, year: 'numeric', month: '2-digit', day: '2-digit' });

  // Get local hour/minute in that timezone
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: cfg.tz, hour: 'numeric', minute: 'numeric', weekday: 'short', hour12: false }).formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const weekday = parts.find(p => p.type === 'weekday')?.value || '';
  const currentMinutes = hour * 60 + minute;
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';

  if (cfg.is24h) {
    return { market, timezone: cfg.tz, localTime, localDate, status: '24h', nextEvent: '' };
  }

  if (isWeekend) {
    return { market, timezone: cfg.tz, localTime, localDate, status: 'closed', nextEvent: 'Weekend' };
  }

  const session = cfg.sessions[0];
  if (!session) {
    return { market, timezone: cfg.tz, localTime, localDate, status: 'closed', nextEvent: '' };
  }

  // Check lunch break
  if (session.lunchStart && session.lunchEnd && currentMinutes >= session.lunchStart && currentMinutes < session.lunchEnd) {
    const diff = session.lunchEnd - currentMinutes;
    return { market, timezone: cfg.tz, localTime, localDate, status: 'lunchbreak', nextEvent: `${diff}m` };
  }

  // Check trading hours
  if (currentMinutes >= session.open && currentMinutes < session.close) {
    const diff = session.close - currentMinutes;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return { market, timezone: cfg.tz, localTime, localDate, status: 'trading', nextEvent: h > 0 ? `${h}h ${m}m` : `${m}m` };
  }

  // Pre-market (before open)
  if (currentMinutes < session.open) {
    const diff = session.open - currentMinutes;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return { market, timezone: cfg.tz, localTime, localDate, status: 'premarket', nextEvent: h > 0 ? `${h}h ${m}m` : `${m}m` };
  }

  // After hours
  return { market, timezone: cfg.tz, localTime, localDate, status: 'afterhours', nextEvent: '' };
}

// === Context ===
interface AppContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  market: MarketId;
  setMarket: (market: MarketId) => void;
  clocks: MarketClock[];
  currentClock: MarketClock;
  userLocalTime: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh');
  const [market, setMarket] = useState<MarketId>('cn');
  const [clocks, setClocks] = useState<MarketClock[]>([]);
  const [userLocalTime, setUserLocalTime] = useState('');
  const langDetected = useRef(false);

  // Detect language from IP on mount
  useEffect(() => {
    if (langDetected.current) return;
    langDetected.current = true;

    // Check localStorage first
    const saved = localStorage.getItem('hunter-alpha-lang');
    if (saved && ['zh', 'en', 'ja', 'ko', 'ar'].includes(saved)) {
      setLangState(saved as Lang);
      return;
    }

    // Detect from browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh')) { setLangState('zh'); return; }
    if (browserLang.startsWith('ja')) { setLangState('ja'); return; }
    if (browserLang.startsWith('ko')) { setLangState('ko'); return; }
    if (browserLang.startsWith('ar')) { setLangState('ar'); return; }
    if (browserLang.startsWith('en')) { setLangState('en'); return; }

    // Fallback: try IP detection via backend
    fetch('/api/trpc/locale.detect')
      .then(r => r.json())
      .then(data => {
        const detected = data?.result?.data?.json?.lang || data?.result?.data?.json;
        if (typeof detected === 'string' && ['zh', 'en', 'ja', 'ko', 'ar'].includes(detected)) {
          setLangState(detected as Lang);
        }
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('hunter-alpha-lang', l);
    // Update document direction for RTL
    document.documentElement.dir = isRTL(l) ? 'rtl' : 'ltr';
  }, []);

  // Update clocks every second
  useEffect(() => {
    const update = () => {
      const markets: MarketId[] = ['cn', 'hk', 'us', 'crypto'];
      setClocks(markets.map(getMarketClock));
      setUserLocalTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Set RTL on lang change
  useEffect(() => {
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  const currentClock = clocks.find(c => c.market === market) || {
    market, timezone: 'UTC', localTime: '--:--:--', localDate: '--/--/----', status: 'closed' as TradingStatus, nextEvent: '',
  };

  return (
    <AppContext.Provider value={{ lang, setLang, market, setMarket, clocks, currentClock, userLocalTime }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
