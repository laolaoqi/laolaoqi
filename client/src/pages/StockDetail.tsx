// ===================================================================
// StockDetail — 个股详情页
// K线图 + 技术指标 + 基本面数据
// ===================================================================

import { useRoute, Link } from 'wouter';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { t } from '@/lib/i18n';
import { trpc } from '@/lib/trpc';
import HudPanel from '@/components/HudPanel';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Activity, Target } from 'lucide-react';

const HERO_BG = 'https://private-us-east-1.manuscdn.com/sessionFile/5mBhgnjK6Lia4j3MfXGMvH/sandbox/NOT8bhL1LfjHxBx0AyI0wR-img-1_1771952361000_na1fn_aGVyby1iZw.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvNW1CaGduaks2TGlhNGozTWZYR012SC9zYW5kYm94L05PVDhiaEwxTGZqSHhCeDBBeUkwd1ItaW1nLTFfMTc3MTk1MjM2MTAwMF9uYTFmbl9hR1Z5YnkxaVp3LmpwZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=qoHWe24bvuKdu1D0CP0~Vo-ld~CZQXa3jXk0IiQJFKBFgJ-ki-pQeVDSG9egdIdB4QgdYPwar8lPX0qmOLzFFmRAqIpaAaqAoJwDTRdxpUyjlKzR3de6JM0UuobYAVFRxh66RsF6-u7X80gdnKSZ~SOM3yMuFqeW9nsFDTJusALH6v9YyPpYKX2aGo3K~gyjrm9Ld5dhbrhEsdrikS78hPazjngkmrHg5ZVwlZgPHq06syWOlC7aqVfzdroxBLDmXF9SJAFkJNJiIQs120ykZ5lIM7FAM-~4LPBzQHBv7jH8zPfHy1OqnMPYZt2198dhB-TRX-QFN3UuhU9ejSxTaA__';

function formatPrice(p: number) {
  if (!p) return '—';
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 100) return p.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatVolume(v: number) {
  if (!v) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toString();
}

// SVG K-line chart
function KLineChart({ data }: { data: any[] }) {
  if (!data || data.length < 2) return <div className="text-center text-[#556677] py-8">No chart data</div>;

  const width = 800, height = 300, padding = { top: 20, right: 60, bottom: 30, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allHighs = data.map(d => d.high);
  const allLows = data.map(d => d.low);
  const maxPrice = Math.max(...allHighs);
  const minPrice = Math.min(...allLows);
  const priceRange = maxPrice - minPrice || 1;

  const barWidth = Math.max(1, Math.min(8, chartW / data.length - 1));

  const toY = (price: number) => padding.top + (1 - (price - minPrice) / priceRange) * chartH;
  const toX = (i: number) => padding.left + (i / (data.length - 1)) * chartW;

  // Volume chart
  const maxVol = Math.max(...data.map(d => d.volume || 0)) || 1;
  const volH = 50;

  return (
    <svg viewBox={`0 0 ${width} ${height + volH + 10}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Price grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = padding.top + pct * chartH;
        const price = maxPrice - pct * priceRange;
        return (
          <g key={pct}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(0,212,255,0.06)" strokeWidth="0.5" />
            <text x={width - padding.right + 5} y={y + 3} fill="#556677" fontSize="9" fontFamily="'JetBrains Mono', monospace">
              {formatPrice(price)}
            </text>
          </g>
        );
      })}

      {/* Candlesticks */}
      {data.map((d, i) => {
        const x = toX(i);
        const isUp = d.close >= d.open;
        const color = isUp ? '#00e676' : '#ff3b3b';
        const bodyTop = toY(Math.max(d.open, d.close));
        const bodyBottom = toY(Math.min(d.open, d.close));
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);

        return (
          <g key={i}>
            {/* Wick */}
            <line x1={x} y1={toY(d.high)} x2={x} y2={toY(d.low)} stroke={color} strokeWidth="0.8" />
            {/* Body */}
            <rect
              x={x - barWidth / 2} y={bodyTop}
              width={barWidth} height={bodyHeight}
              fill={isUp ? color : color} fillOpacity={isUp ? 0.3 : 0.8}
              stroke={color} strokeWidth="0.5"
            />
          </g>
        );
      })}

      {/* Volume bars */}
      {data.map((d, i) => {
        const x = toX(i);
        const isUp = d.close >= d.open;
        const volBarH = ((d.volume || 0) / maxVol) * volH;
        const volY = height + 10 + volH - volBarH;
        return (
          <rect
            key={`vol-${i}`}
            x={x - barWidth / 2} y={volY}
            width={barWidth} height={volBarH}
            fill={isUp ? 'rgba(0,230,118,0.3)' : 'rgba(255,59,59,0.3)'}
          />
        );
      })}

      {/* Volume label */}
      <text x={width - padding.right + 5} y={height + 15} fill="#556677" fontSize="8" fontFamily="'JetBrains Mono', monospace">VOL</text>
    </svg>
  );
}

// Intraday line chart
function IntradayChart({ data }: { data: any[] }) {
  if (!data || data.length < 2) return <div className="text-center text-[#556677] py-8">No intraday data</div>;

  const width = 800, height = 200, pad = 30;
  const values = data.map(d => d.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const isUp = values[values.length - 1] >= values[0];
  const color = isUp ? '#00e676' : '#ff3b3b';

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (d.close - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const areaPath = `M${points[0]} ${points.join(' L')} L${width - pad},${height - pad} L${pad},${height - pad} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="intraday-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0, 0.5, 1].map(pct => {
        const y = pad + pct * (height - pad * 2);
        const price = max - pct * range;
        return (
          <g key={pct}>
            <line x1={pad} y1={y} x2={width - pad} y2={y} stroke="rgba(0,212,255,0.06)" strokeWidth="0.5" />
            <text x={width - pad + 5} y={y + 3} fill="#556677" fontSize="9" fontFamily="'JetBrains Mono', monospace">{formatPrice(price)}</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#intraday-grad)" />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Current price dot */}
      {points.length > 0 && (
        <circle cx={parseFloat(points[points.length - 1].split(',')[0])} cy={parseFloat(points[points.length - 1].split(',')[1])} r="3" fill={color} />
      )}
    </svg>
  );
}

function TechnicalIndicator({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[rgba(0,212,255,0.05)]">
      <span className="text-[11px] text-[#667788]">{label}</span>
      <span className="text-[11px] font-mono tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function StockDetailContent() {
  const { lang } = useApp();
  const [, params] = useRoute('/stock/:symbol');
  const symbol = params?.symbol ? decodeURIComponent(params.symbol) : '';

  const { data, isLoading } = trpc.market.stockDetail.useQuery(
    { symbol },
    { enabled: !!symbol, refetchInterval: 60000 }
  );

  if (!symbol) return <div className="text-center py-20 text-[#556677]">No symbol provided</div>;

  const isUp = (data?.change || 0) >= 0;
  const priceColor = isUp ? '#00e676' : '#ff3b3b';

  return (
    <div className="min-h-screen flex flex-col bg-background grid-bg">
      <div className="fixed inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{ backgroundImage: `url(${HERO_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-3 lg:px-5 py-4 w-full">
        {/* Back button */}
        <Link href="/" className="inline-flex items-center gap-2 text-[#667788] hover:text-[#00d4ff] transition-colors mb-4 text-sm">
          <ArrowLeft size={16} />
          <span>{lang === 'zh' ? '返回仪表盘' : 'Back to Dashboard'}</span>
        </Link>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-48 bg-[rgba(0,212,255,0.1)] rounded" />
            <div className="h-64 bg-[rgba(0,212,255,0.05)] rounded-lg" />
          </div>
        ) : !data?.isLive ? (
          <div className="text-center py-20">
            <div className="text-[#556677] text-lg mb-2">{lang === 'zh' ? '无法获取数据' : 'Unable to fetch data'}</div>
            <div className="text-[#334455] text-sm">{symbol}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#ccddeeff]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {symbol}
                </h1>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-3xl font-black tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: priceColor }}>
                    {formatPrice(data.price)}
                  </span>
                  <div className="flex items-center gap-1">
                    {isUp ? <TrendingUp size={18} style={{ color: priceColor }} /> : <TrendingDown size={18} style={{ color: priceColor }} />}
                    <span className="text-lg font-bold tabular-nums" style={{ color: priceColor }}>
                      {isUp ? '+' : ''}{data.change?.toFixed(2)} ({isUp ? '+' : ''}{data.changePercent?.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-[#667788]">
                <div><span className="text-[#556677]">{lang === 'zh' ? '最高' : 'High'}: </span><span className="font-mono text-[#aabbcc]">{formatPrice(data.high)}</span></div>
                <div><span className="text-[#556677]">{lang === 'zh' ? '最低' : 'Low'}: </span><span className="font-mono text-[#aabbcc]">{formatPrice(data.low)}</span></div>
                <div><span className="text-[#556677]">{lang === 'zh' ? '成交量' : 'Volume'}: </span><span className="font-mono text-[#aabbcc]">{formatVolume(data.volume)}</span></div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <HudPanel title={lang === 'zh' ? '分时走势' : 'Intraday'}>
                <IntradayChart data={data.intradayChart || []} />
              </HudPanel>
              <HudPanel title={lang === 'zh' ? 'K线图 (6个月)' : 'K-Line (6M)'}>
                <KLineChart data={data.dailyChart || []} />
              </HudPanel>
            </div>

            {/* Technical Indicators + Key Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <HudPanel title={lang === 'zh' ? '技术指标' : 'Technical Indicators'}>
                <div className="space-y-0">
                  <TechnicalIndicator label="MA5" value={formatPrice(data.technicals?.ma5)} color={data.technicals?.ma5 > data.price ? '#ff3b3b' : '#00e676'} />
                  <TechnicalIndicator label="MA10" value={formatPrice(data.technicals?.ma10)} color={data.technicals?.ma10 > data.price ? '#ff3b3b' : '#00e676'} />
                  <TechnicalIndicator label="MA20" value={formatPrice(data.technicals?.ma20)} color={data.technicals?.ma20 > data.price ? '#ff3b3b' : '#00e676'} />
                  <TechnicalIndicator label="MA60" value={formatPrice(data.technicals?.ma60)} color={data.technicals?.ma60 > data.price ? '#ff3b3b' : '#00e676'} />
                </div>
              </HudPanel>

              <HudPanel title={lang === 'zh' ? '动量指标' : 'Momentum'}>
                <div className="space-y-0">
                  <TechnicalIndicator
                    label="RSI (14)"
                    value={data.technicals?.rsi14?.toFixed(1) || '—'}
                    color={data.technicals?.rsi14 > 70 ? '#ff3b3b' : data.technicals?.rsi14 < 30 ? '#00e676' : '#ffaa00'}
                  />
                  <TechnicalIndicator label="MACD" value={data.technicals?.macd?.toFixed(3) || '—'} color={data.technicals?.macd >= 0 ? '#00e676' : '#ff3b3b'} />
                  <TechnicalIndicator label="Signal" value={data.technicals?.signal?.toFixed(3) || '—'} color="#8899aa" />
                  <TechnicalIndicator label="Histogram" value={data.technicals?.histogram?.toFixed(3) || '—'} color={data.technicals?.histogram >= 0 ? '#00e676' : '#ff3b3b'} />
                </div>
                {/* RSI Gauge */}
                <div className="mt-3 pt-2 border-t border-[rgba(0,212,255,0.08)]">
                  <div className="flex items-center justify-between text-[9px] text-[#556677] mb-1">
                    <span>{lang === 'zh' ? '超卖' : 'Oversold'}</span>
                    <span>{lang === 'zh' ? '中性' : 'Neutral'}</span>
                    <span>{lang === 'zh' ? '超买' : 'Overbought'}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gradient-to-r from-[#00e676] via-[#ffaa00] to-[#ff3b3b] relative">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#0a0e17] shadow-lg"
                      style={{ left: `${Math.min(100, Math.max(0, data.technicals?.rsi14 || 50))}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  </div>
                </div>
              </HudPanel>

              <HudPanel title={lang === 'zh' ? '关键数据' : 'Key Data'}>
                <div className="space-y-0">
                  <TechnicalIndicator label={lang === 'zh' ? '昨收' : 'Prev Close'} value={formatPrice(data.prevClose)} color="#8899aa" />
                  <TechnicalIndicator label={lang === 'zh' ? '52周高' : '52W High'} value={formatPrice(data.fiftyTwoWeekHigh)} color="#00e676" />
                  <TechnicalIndicator label={lang === 'zh' ? '52周低' : '52W Low'} value={formatPrice(data.fiftyTwoWeekLow)} color="#ff3b3b" />
                  {data.marketCap > 0 && (
                    <TechnicalIndicator label={lang === 'zh' ? '市值' : 'Market Cap'} value={formatVolume(data.marketCap)} color="#00d4ff" />
                  )}
                </div>
              </HudPanel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StockDetail() {
  return (
    <AppProvider>
      <StockDetailContent />
    </AppProvider>
  );
}
