// ===================================================================
// CryptoPanorama — 数字货币全景看板
// 4×5 网格展示全部币种，实时分时图 + K线图
// 涨跌幅超3%闪动动画，点击弹窗查看大图K线
// ===================================================================

import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { Link } from 'wouter';
import { ArrowLeft, RefreshCw, Zap, Clock, TrendingUp, TrendingDown, X, Shield, Lock, LogIn } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSEO } from '@/hooks/useSEO';

// ===================================================================
// Guest trial (same logic as CryptoInvestment)
// ===================================================================
const GUEST_TRIAL_KEY = 'ha_crypto_trial_count';
const MAX_GUEST_TRIALS = 2;

function getGuestTrialCount(): number {
  try { return parseInt(localStorage.getItem(GUEST_TRIAL_KEY) || '0', 10); } catch { return 0; }
}

// ===================================================================
// Formatters
// ===================================================================
function formatPrice(price: number): string {
  if (price === 0) return '$0.00';
  if (price < 0.0001) return `$${price.toFixed(10)}`;
  if (price < 0.001) return `$${price.toFixed(8)}`;
  if (price < 1) return `$${price.toFixed(6)}`;
  if (price < 100) return `$${price.toFixed(4)}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPriceCompact(price: number): string {
  if (price === 0) return '$0';
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  if (price < 1000) return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatVolume(vol: number): string {
  if (!vol) return '-';
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
  return `$${vol.toLocaleString()}`;
}

function formatMarketCap(cap: number): string {
  if (!cap) return '-';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}

// ===================================================================
// Coin Logo
// ===================================================================
function CoinLogo({ src, symbol, size = 28 }: { src?: string; symbol: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    const colors = ['#ff6b00', '#00d4ff', '#ff3366', '#ffd700', '#00cc66', '#9966ff', '#ff4444', '#33ccff'];
    const colorIdx = symbol.charCodeAt(0) % colors.length;
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0 font-bold text-white"
        style={{ width: size, height: size, backgroundColor: colors[colorIdx], fontSize: size * 0.42 }}
      >
        {symbol.charAt(0)}
      </div>
    );
  }
  return (
    <img src={src} alt={symbol} width={size} height={size}
      className="rounded-full shrink-0" onError={() => setFailed(true)} loading="lazy" />
  );
}

// ===================================================================
// Mini Sparkline SVG — card-level chart
// ===================================================================
function MiniSparkline({ data, isUp, width = 120, height = 40 }: {
  data: number[]; isUp: boolean; width?: number; height?: number;
}) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 2;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const pts = data.map((v, i) => {
      const x = pad + (i / (data.length - 1)) * w;
      const y = pad + h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M${pts.join('L')}`;
  }, [data, width, height]);

  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="flex items-center justify-center text-[10px] text-[#556677]">No Data</div>;
  }

  const color = isUp ? '#ff4444' : '#00cc66';
  const gradId = useMemo(() => `pano-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path}L${width - 2},${height - 2}L2,${height - 2}Z`} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ===================================================================
// Mini K-line SVG — card-level candlestick chart
// ===================================================================
function MiniKline({ data, width = 120, height = 40 }: {
  data: number[]; width?: number; height?: number;
}) {
  const candles = useMemo(() => {
    if (!data || data.length < 8) return [];
    // Group sparkline data into candle-like bars (every 4 points = 1 candle)
    const bars: { open: number; close: number; high: number; low: number }[] = [];
    const step = Math.max(1, Math.floor(data.length / 14)); // ~14 candles
    for (let i = 0; i < data.length - step; i += step) {
      const slice = data.slice(i, i + step);
      bars.push({
        open: slice[0],
        close: slice[slice.length - 1],
        high: Math.max(...slice),
        low: Math.min(...slice),
      });
    }
    return bars;
  }, [data]);

  if (candles.length < 3) {
    return <div style={{ width, height }} className="flex items-center justify-center text-[10px] text-[#556677]">No Data</div>;
  }

  const allPrices = candles.flatMap(c => [c.high, c.low]);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;
  const pad = 2;
  const barW = (width - pad * 2) / candles.length;
  const chartH = height - pad * 2;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {candles.map((c, i) => {
        const isUp = c.close >= c.open;
        const color = isUp ? '#ff4444' : '#00cc66';
        const x = pad + i * barW + barW * 0.15;
        const candleW = barW * 0.7;
        const bodyTop = pad + chartH - ((Math.max(c.open, c.close) - min) / range) * chartH;
        const bodyBottom = pad + chartH - ((Math.min(c.open, c.close) - min) / range) * chartH;
        const bodyH = Math.max(1, bodyBottom - bodyTop);
        const wickTop = pad + chartH - ((c.high - min) / range) * chartH;
        const wickBottom = pad + chartH - ((c.low - min) / range) * chartH;
        const cx = x + candleW / 2;
        return (
          <g key={i}>
            {/* Wick */}
            <line x1={cx} y1={wickTop} x2={cx} y2={wickBottom} stroke={color} strokeWidth="0.8" />
            {/* Body */}
            <rect x={x} y={bodyTop} width={candleW} height={bodyH}
              fill={isUp ? color : color} rx="0.5" opacity="0.9" />
          </g>
        );
      })}
    </svg>
  );
}

// ===================================================================
// Big Line Chart (Modal) — Canvas-based time/sparkline chart
// ===================================================================
function BigLineChart({ data, isUp, width, height }: {
  data: number[]; isUp: boolean; width: number; height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padX = 60, padY = 20;
    const chartW = width - padX - 10;
    const chartH = height - padY * 2;

    // Grid
    ctx.strokeStyle = 'rgba(0,212,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padY + (i / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(padX + chartW, y); ctx.stroke();
      const val = max - (i / 4) * range;
      ctx.fillStyle = '#667788';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(val >= 1 ? val.toFixed(2) : val.toFixed(6), padX - 6, y + 3);
    }

    const color = isUp ? '#ff4444' : '#00cc66';
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
    data.forEach((v, i) => {
      const x = padX + (i / (data.length - 1)) * chartW;
      const y = padY + chartH - ((v - min) / range) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.lineTo(padX + chartW, padY + chartH);
    ctx.lineTo(padX, padY + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padY, 0, padY + chartH);
    grad.addColorStop(0, isUp ? 'rgba(255,68,68,0.15)' : 'rgba(0,204,102,0.15)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad; ctx.fill();
  }, [data, isUp, width, height]);

  return <canvas ref={canvasRef} style={{ width, height }} className="rounded-lg bg-[#0a0e17]" />;
}

// ===================================================================
// Big Candlestick Chart (Modal) — Canvas OHLC candles + volume
// ===================================================================
interface OHLCCandle {
  time: number; open: number; high: number; low: number; close: number;
}

function BigCandleChart({ candles, width, height, period }: {
  candles: OHLCCandle[]; width: number; height: number; period?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !candles || candles.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const padX = 60, padTop = 20, padBottom = 30;
    const chartW = width - padX - 10;
    const chartH = height - padTop - padBottom;

    // Price range
    const allHigh = candles.map(c => c.high);
    const allLow = candles.map(c => c.low);
    const priceMin = Math.min(...allLow);
    const priceMax = Math.max(...allHigh);
    const priceRange = priceMax - priceMin || 1;
    const pricePad = priceRange * 0.05;
    const adjMin = priceMin - pricePad;
    const adjMax = priceMax + pricePad;
    const adjRange = adjMax - adjMin;

    const toY = (price: number) => padTop + chartH - ((price - adjMin) / adjRange) * chartH;

    // Grid lines + price labels
    ctx.strokeStyle = 'rgba(0,212,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = padTop + (i / 5) * chartH;
      ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(padX + chartW, y); ctx.stroke();
      const val = adjMax - (i / 5) * adjRange;
      ctx.fillStyle = '#667788';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(val >= 1 ? val.toFixed(2) : val.toFixed(6), padX - 6, y + 3);
    }

    // Draw candles
    const n = candles.length;
    const barW = chartW / n;
    const bodyW = Math.max(1, barW * 0.65);
    const wickW = Math.max(0.5, barW * 0.08);

    for (let i = 0; i < n; i++) {
      const c = candles[i];
      const isUp = c.close >= c.open;
      const upColor = '#ff4444';   // 红色涨
      const downColor = '#00cc66'; // 绿色跌
      const color = isUp ? upColor : downColor;

      const x = padX + i * barW + barW / 2;
      const yHigh = toY(c.high);
      const yLow = toY(c.low);
      const yOpen = toY(c.open);
      const yClose = toY(c.close);
      const bodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(1, Math.abs(yOpen - yClose));

      // Wick (shadow)
      ctx.strokeStyle = color;
      ctx.lineWidth = wickW;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Body
      if (isUp) {
        // Hollow or filled for up candles — use filled red
        ctx.fillStyle = color;
        ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyH);
      } else {
        // Filled green for down candles
        ctx.fillStyle = color;
        ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyH);
      }
    }

    // Time labels — format based on period type
    ctx.fillStyle = '#556677';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    const labelCount = Math.min(7, n);
    const labelStep = Math.max(1, Math.floor(n / labelCount));

    // Determine time format based on period
    const formatTime = (ts: number): string => {
      const d = new Date(ts * 1000);
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      const MM = (d.getMonth() + 1).toString().padStart(2, '0');
      const DD = d.getDate().toString().padStart(2, '0');

      switch (period) {
        case 'time':
        case '1m':
        case '5m':
        case '15m':
          // Intraday: HH:MM
          return `${hh}:${mm}`;
        case '1h':
          // Hourly over multi-day: MM/DD HH:MM
          return `${MM}/${DD} ${hh}:${mm}`;
        case '4h':
          // 4-hour over 2 weeks: MM/DD HH时
          return `${MM}/${DD} ${hh}:00`;
        case '1d':
          // Daily: MM/DD
          return `${MM}/${DD}`;
        default:
          // Auto-detect: if time span > 3 days show date, otherwise time
          if (n > 0) {
            const span = candles[n - 1].time - candles[0].time;
            if (span > 3 * 86400) return `${MM}/${DD}`;
            if (span > 86400) return `${MM}/${DD} ${hh}:${mm}`;
          }
          return `${hh}:${mm}`;
      }
    };

    for (let i = 0; i < n; i += labelStep) {
      const c = candles[i];
      const x = padX + i * barW + barW / 2;
      const label = formatTime(c.time);
      ctx.fillText(label, x, height - 8);
    }

  }, [candles, width, height, period]);

  return <canvas ref={canvasRef} style={{ width, height }} className="rounded-lg bg-[#0a0e17]" />;
}

// ===================================================================
// Modal — Full K-line view with period tabs + real OHLC data
// ===================================================================
const TABS = [
  { key: 'time', label: '分时' },
  { key: '1m', label: '1分' },
  { key: '5m', label: '5分' },
  { key: '15m', label: '15分' },
  { key: '1h', label: '1时' },
  { key: '4h', label: '4时' },
  { key: '1d', label: '日K' },
] as const;

type TabKey = typeof TABS[number]['key'];

interface CoinData {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
  logo?: string;
  sparkline7d?: number[];
}

function CoinModal({ coin, onClose }: { coin: CoinData; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>('1d');
  const isUp = coin.change24h >= 0;

  // Fetch real OHLC data from backend
  const { data: ohlcData, isLoading: ohlcLoading } = trpc.cryptoBoard.getOHLC.useQuery(
    { symbol: coin.symbol, period: activeTab },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );

  // Fallback sparkline data for time chart
  const sparklineData = useMemo(() => {
    const base = coin.sparkline7d || [];
    if (base.length < 2) return [];
    return base;
  }, [coin.sparkline7d]);

  // Determine chart mode: 'time' tab = line chart, others = candlestick
  const isLineMode = activeTab === 'time';
  const hasOHLC = ohlcData?.candles && ohlcData.candles.length >= 2;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[95%] max-w-[900px] bg-[#151520] border border-[rgba(0,212,255,0.15)] rounded-2xl p-5 sm:p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-[#222] hover:bg-[#333] flex items-center justify-center text-[#8899aa] hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <CoinLogo src={coin.logo} symbol={coin.symbol} size={36} />
          <div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {coin.symbol}
            </h2>
            <p className="text-xs text-[#8899aa]">{coin.name}</p>
          </div>
          <div className="ml-4 flex items-center gap-3">
            <span className="text-2xl font-bold text-white font-mono">{formatPrice(coin.price)}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-bold font-mono ${
              isUp ? 'text-[#ff4444] bg-[rgba(255,68,68,0.1)]' : 'text-[#00cc66] bg-[rgba(0,204,102,0.1)]'
            }`}>
              {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {isUp ? '+' : ''}{coin.change24h.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-[#00d4ff] text-black font-bold'
                  : 'bg-[#1a1a2e] text-[#8899aa] hover:bg-[#222244] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {ohlcLoading && (
            <span className="flex items-center gap-1 text-[10px] text-[#00d4ff] ml-2">
              <RefreshCw size={10} className="animate-spin" /> 加载中...
            </span>
          )}
        </div>

        {/* Chart */}
        <div className="w-full rounded-xl overflow-hidden bg-[#0a0e17] border border-[rgba(0,212,255,0.08)]">
          {isLineMode ? (
            // 分时图：用sparkline数据画折线，或用OHLC close价格画折线
            hasOHLC ? (
              <BigLineChart
                data={ohlcData!.candles.map((c: OHLCCandle) => c.close)}
                isUp={isUp}
                width={850}
                height={360}
              />
            ) : sparklineData.length >= 2 ? (
              <BigLineChart data={sparklineData} isUp={isUp} width={850} height={360} />
            ) : (
              <div className="flex items-center justify-center h-[360px] text-[#556677] text-sm">
                暂无分时数据
              </div>
            )
          ) : (
            // K线图：用真实OHLC数据画蜡烛图
            hasOHLC ? (
              <BigCandleChart candles={ohlcData!.candles} width={850} height={360} period={activeTab} />
            ) : ohlcLoading ? (
              <div className="flex items-center justify-center h-[360px] text-[#00d4ff] text-sm">
                <RefreshCw size={16} className="animate-spin mr-2" /> 正在加载K线数据...
              </div>
            ) : (
              <div className="flex items-center justify-center h-[360px] text-[#556677] text-sm">
                暂无K线数据
              </div>
            )
          )}
        </div>

        {/* Chart type indicator */}
        <div className="flex items-center gap-3 mt-2 text-[10px] text-[#556677]">
          <span>{isLineMode ? '◈ 分时折线图' : '■ OHLC 蜡烛图'}</span>
          {hasOHLC && <span>· {ohlcData!.candles.length} 根K线</span>}
          <span className="ml-auto">
            <span className="inline-block w-2 h-2 rounded-sm bg-[#ff4444] mr-1" />涨
            <span className="inline-block w-2 h-2 rounded-sm bg-[#00cc66] ml-2 mr-1" />跌
          </span>
        </div>

        {/* Info row */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-[#8899aa]">
          {coin.marketCap ? (
            <div>市值: <span className="text-white font-mono">{formatMarketCap(coin.marketCap)}</span></div>
          ) : null}
          {coin.volume24h ? (
            <div>24h成交额: <span className="text-white font-mono">{formatVolume(coin.volume24h)}</span></div>
          ) : null}
          <div>24h涨跌: <span className={`font-mono font-bold ${isUp ? 'text-[#ff4444]' : 'text-[#00cc66]'}`}>
            {isUp ? '+' : ''}{coin.change24h.toFixed(2)}%
          </span></div>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Card Component
// ===================================================================
function CoinCard({ coin, index, onClick }: {
  coin: CoinData; index: number; onClick: () => void;
}) {
  const isUp = coin.change24h >= 0;
  const isAlert = Math.abs(coin.change24h) >= 3;
  const noData = coin.price === 0;

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-xl p-3 cursor-pointer transition-all duration-200
        bg-[#13172a] hover:bg-[#1a1f38] border-2
        ${isAlert
          ? (isUp
            ? 'border-[#ff4444] animate-[pulse-red_1.5s_ease-in-out_infinite]'
            : 'border-[#00cc66] animate-[pulse-green_1.5s_ease-in-out_infinite]')
          : 'border-[#1e2340] hover:border-[rgba(0,212,255,0.3)]'
        }
      `}
    >
      {/* Alert badge */}
      {isAlert && (
        <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${isUp ? 'bg-[#ff4444]' : 'bg-[#00cc66]'} animate-ping`} />
      )}

      {/* Top row: logo + symbol + rank */}
      <div className="flex items-center gap-2 mb-1.5">
        <CoinLogo src={coin.logo} symbol={coin.symbol} size={24} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white truncate">{coin.symbol}</span>
            <span className="text-[9px] text-[#556677] font-mono">#{index + 1}</span>
          </div>
          <p className="text-[10px] text-[#667788] truncate">{coin.name}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-1">
        <span className="text-base font-bold text-white font-mono leading-none">
          {noData ? '-' : formatPriceCompact(coin.price)}
        </span>
      </div>

      {/* Change badge */}
      <div className="mb-2">
        {noData ? (
          <span className="text-[10px] text-[#556677]">No Data</span>
        ) : (
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold font-mono ${
            isUp ? 'text-[#ff4444] bg-[rgba(255,68,68,0.1)]' : 'text-[#00cc66] bg-[rgba(0,204,102,0.1)]'
          } ${isAlert ? 'text-sm' : ''}`}>
            {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {isUp ? '+' : ''}{coin.change24h.toFixed(2)}%
          </span>
        )}
      </div>

      {/* Mini sparkline chart — full width, larger */}
      <div className="w-full h-[56px] mt-1">
        <MiniSparkline data={coin.sparkline7d || []} isUp={isUp} width={200} height={56} />
      </div>
    </div>
  );
}

// ===================================================================
// Main Page
// ===================================================================
export default function CryptoPanorama() {
  useSEO({
    title: '数字货币全景看板 - 猎手阿尔法 | 全部币种实时K线',
    description: '猎手阿尔法数字货币全景看板，4x5网格实时展示全部主流币与空气币行情、分时图和K线图。',
    canonical: 'https://www.llq555.vip/crypto-panorama',
    ogTitle: '数字货币全景看板 - 猎手阿尔法 HUNTER ALPHA',
    ogDescription: '全部币种实时K线看板，涨跌一目了然',
  });

  const { isAuthenticated } = useAuth();

  // Access check
  const { data: accessData, isLoading: accessLoading } = trpc.cryptoBoard.checkAccess.useQuery(undefined, {
    staleTime: 60 * 1000,
    retry: false,
  });

  const isAuthorizedUser = !!accessData?.hasAccess;
  const isGuestMode = !isAuthenticated && !accessLoading;
  const guestTrialCount = getGuestTrialCount();
  const guestTrialExpired = isGuestMode && guestTrialCount >= MAX_GUEST_TRIALS;

  // Fetch data
  const { data: authData, isLoading: authLoading, refetch: authRefetch, isFetching: authFetching } = trpc.cryptoBoard.getData.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 15_000,
    enabled: isAuthorizedUser,
    retry: 1,
  });

  const { data: publicData, isLoading: publicLoading, refetch: publicRefetch, isFetching: publicFetching } = trpc.cryptoBoard.getDataPublic.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 15_000,
    enabled: isGuestMode && !guestTrialExpired,
    retry: 1,
  });

  const data = isAuthorizedUser ? authData : publicData;
  const isLoading = isAuthorizedUser ? authLoading : publicLoading;
  const refetch = isAuthorizedUser ? authRefetch : publicRefetch;
  const isFetching = isAuthorizedUser ? authFetching : publicFetching;

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Merge all coins into a single array
  const allCoins = useMemo(() => {
    if (!data) return [];
    return [...(data.mainstream || []), ...(data.meme || [])];
  }, [data]);

  // Modal state
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
  const handleClose = useCallback(() => setSelectedCoin(null), []);

  // Loading
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#8899aa]">正在验证访问权限...</span>
        </div>
      </div>
    );
  }

  // Guest trial expired
  if (guestTrialExpired) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col items-center justify-center gap-6 px-4">
        <Shield size={48} className="text-[#00d4ff]" />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>TRIAL ENDED</h2>
        <p className="text-[#8899aa] text-sm text-center max-w-md">免费试用已结束，请注册账号并联系管理员开通权限。</p>
        <div className="flex gap-3">
          <a href={getLoginUrl()} className="px-4 py-2 rounded-lg bg-[#00d4ff] text-black font-bold text-sm">登录</a>
          <Link href="/"><button className="px-4 py-2 rounded-lg border border-[rgba(0,212,255,0.2)] text-[#00d4ff] text-sm">返回首页</button></Link>
        </div>
      </div>
    );
  }

  // No access
  if (isAuthenticated && accessData && !accessData.hasAccess) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col items-center justify-center gap-6 px-4">
        <Lock size={48} className="text-[#ff6b00]" />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>ACCESS RESTRICTED</h2>
        <p className="text-[#8899aa] text-sm text-center max-w-md">您的账号尚未获得访问权限，请联系管理员开通。</p>
        <Link href="/"><button className="px-4 py-2 rounded-lg border border-[rgba(0,212,255,0.2)] text-[#00d4ff] text-sm">返回首页</button></Link>
      </div>
    );
  }

  const lastUpdate = data?.timestamp ? new Date(data.timestamp) : null;

  return (
    <div className="min-h-screen bg-[#0a0e17]" style={{ fontFamily: "'Inter', 'Noto Sans SC', Arial, sans-serif" }}>
      {/* Scan line effect */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)',
      }} />

      {/* Custom animations */}
      <style>{`
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,68,68,0); }
          50% { box-shadow: 0 0 16px 2px rgba(255,68,68,0.5); }
        }
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,204,102,0); }
          50% { box-shadow: 0 0 16px 2px rgba(0,204,102,0.5); }
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[rgba(0,212,255,0.12)] backdrop-blur-xl bg-[rgba(10,14,23,0.95)]">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent opacity-60" />
        <div className="max-w-[1600px] mx-auto px-3 lg:px-5">
          <div className="flex items-center h-12 gap-2">
            <Link href="/crypto-investment">
              <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-colors text-xs font-medium">
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">投资看板</span>
              </button>
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-gradient-to-br from-[#ff6b00] to-[#ff3366] flex items-center justify-center shadow-[0_0_10px_rgba(255,107,0,0.3)]">
                <Zap size={14} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  CRYPTO PANORAMA
                </h1>
                <p className="text-[9px] text-[#8899aa] -mt-0.5">全景看板 · 4×5 Grid · Real-time</p>
              </div>
            </div>

            <div className="flex-1" />

            {/* BTC Dominance */}
            {data && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs">
                <span className="text-[#8899aa]">BTC</span>
                <span className="text-[#00d4ff] font-mono font-bold">{data.btcDominance.toFixed(1)}%</span>
              </div>
            )}

            {/* Coin count */}
            <div className="flex items-center gap-1 text-xs text-[#8899aa]">
              <span className="font-mono">{allCoins.length}</span>
              <span>coins</span>
            </div>

            {/* Clock */}
            <div className="flex items-center gap-1 text-xs text-[#8899aa]">
              <Clock size={11} />
              <span className="font-mono tabular-nums">{now.toLocaleTimeString('zh-CN', { hour12: false })}</span>
            </div>

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all text-xs disabled:opacity-50"
            >
              <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">刷新</span>
            </button>

            {/* Last update */}
            {lastUpdate && (
              <div className="hidden md:flex items-center gap-1 text-[10px] text-[#667788]">
                <span>更新: {lastUpdate.toLocaleTimeString('zh-CN', { hour12: false })}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-[1600px] mx-auto px-3 lg:px-5 py-4">

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-[#8899aa]">正在获取全部币种数据...</span>
            </div>
          </div>
        )}

        {/* 4×5 Grid */}
        {allCoins.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {allCoins.map((coin, i) => (
              <CoinCard
                key={`${coin.symbol}-${i}`}
                coin={coin}
                index={i}
                onClick={() => setSelectedCoin(coin)}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        {allCoins.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-[10px] text-[#667788]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-2 border-[#ff4444] animate-[pulse-red_1.5s_ease-in-out_infinite]" />
              <span>涨幅 ≥ 3% 闪动</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-2 border-[#00cc66] animate-[pulse-green_1.5s_ease-in-out_infinite]" />
              <span>跌幅 ≥ 3% 闪动</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-2 border-[#1e2340]" />
              <span>正常波动</span>
            </div>
            <span>·</span>
            <span>点击卡片查看详细K线图</span>
            <span>·</span>
            <span>数据每30秒自动刷新</span>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4 mt-4 border-t border-[rgba(0,212,255,0.06)]">
          <p className="text-xs text-[#556677]">
            数据来源：CoinGecko · 每30秒自动刷新 · 仅供参考，不构成投资建议
          </p>
        </div>
      </main>

      {/* Modal */}
      {selectedCoin && (
        <CoinModal coin={selectedCoin} onClose={handleClose} />
      )}
    </div>
  );
}
