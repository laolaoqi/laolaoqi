// ===================================================================
// CryptoInvestment — 主流币 vs 空气币/永续合约 投资看板
// 独立页面，深色HUD主题，涨红跌绿，大字建议
// 含Logo图标 + 7日迷你K线
// ===================================================================

import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { Link } from 'wouter';
import SimPortfolioPanel from '@/components/SimPortfolioPanel';
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Zap, Shield, Globe, Clock, Lock, AlertTriangle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo } from 'react';
import { useSEO } from '@/hooks/useSEO';

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

function formatMarketCap(cap: number): string {
  if (!cap) return '-';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}

function formatVolume(vol: number): string {
  if (!vol) return '-';
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
  return `$${vol.toLocaleString()}`;
}

// ===================================================================
// Mini Sparkline SVG Component
// ===================================================================
function MiniSparkline({ data, isUp, width = 80, height = 28 }: {
  data: number[];
  isUp: boolean;
  width?: number;
  height?: number;
}) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;
    const w = width - padding * 2;
    const h = height - padding * 2;

    const points = data.map((v, i) => {
      const x = padding + (i / (data.length - 1)) * w;
      const y = padding + h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M${points.join('L')}`;
  }, [data, width, height]);

  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="flex items-center justify-center text-[10px] text-[#556677]">-</div>;
  }

  const color = isUp ? '#ff4444' : '#00cc66';
  const gradientId = `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path
        d={`${path}L${width - 2},${height - 2}L2,${height - 2}Z`}
        fill={`url(#${gradientId})`}
      />
      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ===================================================================
// Coin Logo Component
// ===================================================================
function CoinLogo({ src, symbol, size = 24 }: { src?: string; symbol: string; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    // Fallback: colored circle with first letter
    const colors = ['#ff6b00', '#00d4ff', '#ff3366', '#ffd700', '#00cc66', '#9966ff', '#ff4444', '#33ccff'];
    const colorIdx = symbol.charCodeAt(0) % colors.length;
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0 font-bold text-white"
        style={{ width: size, height: size, backgroundColor: colors[colorIdx], fontSize: size * 0.45 }}
      >
        {symbol.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-full shrink-0"
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

// ===================================================================
// Category badge for meme coins
// ===================================================================
function CategoryBadge({ symbol }: { symbol: string }) {
  // Binance Alpha tokens
  if (['XLAB', 'RWA'].includes(symbol)) {
    return <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,215,0,0.12)] text-[#ffd700] font-medium ml-1">Alpha</span>;
  }
  // TRON chain
  if (symbol === 'TRONLIFE') {
    return <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,51,102,0.12)] text-[#ff3366] font-medium ml-1">TRON</span>;
  }
  return null;
}

// ===================================================================
// Main Page Component
// ===================================================================
// ===================================================================
// Access Denied / Login Required Screen
// ===================================================================
function AccessDeniedScreen({ isLoggedIn, isExpired, expiresAt }: {
  isLoggedIn: boolean;
  isExpired: boolean;
  expiresAt: string | null;
}) {
  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col" style={{ fontFamily: "'Inter', 'Noto Sans SC', Arial, sans-serif" }}>
      {/* Scan line effect */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)',
      }} />

      {/* Header */}
      <header className="border-b border-[rgba(0,212,255,0.12)] backdrop-blur-xl bg-[rgba(10,14,23,0.9)]">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent opacity-60" />
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
          <div className="flex items-center h-14 gap-3">
            <Link href="/">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-colors text-sm font-medium">
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">返回首页</span>
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-[#ff6b00] to-[#ff3366] flex items-center justify-center shadow-[0_0_12px_rgba(255,107,0,0.3)]">
                <Zap size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>CRYPTO BOARD</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Access Denied Content */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="max-w-md w-full mx-4 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[rgba(255,107,0,0.15)] to-[rgba(255,51,102,0.15)] border border-[rgba(255,107,0,0.2)] flex items-center justify-center">
            {!isLoggedIn ? (
              <LogIn size={36} className="text-[#ff6b00]" />
            ) : isExpired ? (
              <AlertTriangle size={36} className="text-[#ffd700]" />
            ) : (
              <Lock size={36} className="text-[#ff6b00]" />
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {!isLoggedIn ? 'LOGIN REQUIRED' : isExpired ? 'ACCESS EXPIRED' : 'ACCESS RESTRICTED'}
            </h2>
            <p className="text-[#8899aa] text-sm leading-relaxed">
              {!isLoggedIn ? (
                '请先登录账号以访问投资看板。登录后，管理员将为您开通访问权限。'
              ) : isExpired ? (
                <>您的投资看板访问权限已于 <span className="text-[#ffd700] font-mono">{expiresAt ? new Date(expiresAt).toLocaleDateString('zh-CN') : ''}</span> 过期。请联系管理员续期。</>
              ) : (
                '您的账号尚未获得投资看板的访问权限。请联系管理员开通权限。'
              )}
            </p>
          </div>

          <div className="space-y-3">
            {!isLoggedIn ? (
              <a href={getLoginUrl()}>
                <Button className="w-full bg-gradient-to-r from-[#ff6b00] to-[#ff3366] text-white font-bold py-3 hover:opacity-90 transition-opacity">
                  <LogIn size={16} className="mr-2" /> 登录账号
                </Button>
              </a>
            ) : (
              <div className="rounded-xl border border-[rgba(0,212,255,0.15)] bg-[rgba(0,212,255,0.04)] p-4">
                <p className="text-xs text-[#8899aa] mb-1">如需开通或续期，请联系管理员</p>
                <p className="text-sm text-[#00d4ff] font-medium">管理员可在 Admin Panel → 权限管理 中设置</p>
              </div>
            )}
            <Link href="/">
              <Button variant="outline" className="w-full border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] mt-2">
                <ArrowLeft size={14} className="mr-2" /> 返回首页
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CryptoInvestment() {
  useSEO({
    title: '数字货币投资看板 - 猎手阿尔法 | 主流币 vs 空气币永续合约',
    description: '猎手阿尔法数字货币投资看板，实时跟踪BTC、ETH等主流币与Meme币永续合约行情，提供AI投资建议与模拟投资实盘。',
    canonical: 'https://www.llq555.com/crypto-investment',
    ogTitle: '数字货币投资看板 - 猎手阿尔法 HUNTER ALPHA',
    ogDescription: '实时跟踪BTC、ETH等主流币与Meme币永续合约行情，AI投资建议与模拟投资实盘',
  });

  // Check access permission first
  const { data: accessData, isLoading: accessLoading } = trpc.cryptoBoard.checkAccess.useQuery(undefined, {
    staleTime: 60 * 1000,
    retry: false,
  });

  const { data, isLoading, refetch, isFetching, error } = trpc.cryptoBoard.getData.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    enabled: !!accessData?.hasAccess, // Only fetch data if user has access
    retry: false,
  });

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Show loading while checking access
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

  // Show access denied screen
  if (accessData && !accessData.hasAccess) {
    return <AccessDeniedScreen
      isLoggedIn={accessData.isLoggedIn}
      isExpired={accessData.isExpired}
      expiresAt={accessData.expiresAt ? String(accessData.expiresAt) : null}
    />;
  }

  // If getData returned an error (e.g., permission denied), show access denied
  if (error) {
    return <AccessDeniedScreen isLoggedIn={true} isExpired={error.message.includes('过期')} expiresAt={null} />;
  }

  const lastUpdate = data?.timestamp ? new Date(data.timestamp) : null;

  return (
    <div className="min-h-screen bg-[#0a0e17]" style={{ fontFamily: "'Inter', 'Noto Sans SC', Arial, sans-serif" }}>
      {/* Scan line effect */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)',
      }} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[rgba(0,212,255,0.12)] backdrop-blur-xl bg-[rgba(10,14,23,0.9)]">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent opacity-60" />
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
          <div className="flex items-center h-14 gap-3">
            <Link href="/">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-colors text-sm font-medium">
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">返回首页</span>
              </button>
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-[#ff6b00] to-[#ff3366] flex items-center justify-center shadow-[0_0_12px_rgba(255,107,0,0.3)]">
                <Zap size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-wide" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  CRYPTO BOARD
                </h1>
                <p className="text-[10px] text-[#8899aa] -mt-0.5">主流币 vs 空气币/永续合约</p>
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1.5 text-xs text-[#8899aa]">
              <Clock size={12} />
              <span className="font-mono tabular-nums">{now.toLocaleTimeString('zh-CN', { hour12: false })}</span>
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all text-xs font-medium disabled:opacity-50"
            >
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">刷新</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-4 lg:px-6 py-6 space-y-6">

        {/* BTC Dominance Banner */}
        {data && (
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 px-5 py-3 rounded-xl bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.1)]">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-[#00d4ff]" />
              <span className="text-xs text-[#8899aa]">BTC主导率</span>
              <span className="text-lg font-bold text-[#00d4ff] font-mono">{data.btcDominance.toFixed(1)}%</span>
            </div>
            {data.totalMarketCap > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8899aa]">总市值</span>
                <span className="text-sm font-bold text-white font-mono">{formatMarketCap(data.totalMarketCap)}</span>
              </div>
            )}
            {lastUpdate && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-[#8899aa]">更新于</span>
                <span className="text-xs text-[#aabbcc] font-mono">{lastUpdate.toLocaleString('zh-CN')}</span>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-[#8899aa]">正在获取数据...</span>
            </div>
          </div>
        )}

        {/* Two-column grid */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* === 主流币前10 === */}
            <div className="rounded-xl border border-[rgba(0,212,255,0.12)] bg-[rgba(13,17,34,0.8)] overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-[rgba(0,212,255,0.08)] bg-[rgba(0,212,255,0.03)]">
                <Shield size={16} className="text-[#00d4ff]" />
                <h2 className="text-base font-bold text-[#00d4ff]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  主流币前10（蓝筹）
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(0,212,255,0.06)]">
                      <th className="text-left px-3 py-2.5 text-xs text-[#8899aa] font-medium w-8">#</th>
                      <th className="text-left px-3 py-2.5 text-xs text-[#8899aa] font-medium">币种</th>
                      <th className="text-right px-3 py-2.5 text-xs text-[#8899aa] font-medium">价格</th>
                      <th className="text-right px-3 py-2.5 text-xs text-[#8899aa] font-medium">24h</th>
                      <th className="text-center px-2 py-2.5 text-xs text-[#8899aa] font-medium hidden sm:table-cell">7日走势</th>
                      <th className="text-right px-3 py-2.5 text-xs text-[#8899aa] font-medium hidden md:table-cell">市值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.mainstream.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-[#8899aa]">暂无数据</td></tr>
                    ) : (
                      data.mainstream.map((coin, i) => {
                        const isUp = coin.change24h >= 0;
                        return (
                          <tr key={coin.symbol} className="border-b border-[rgba(0,212,255,0.04)] hover:bg-[rgba(0,212,255,0.03)] transition-colors">
                            <td className="px-3 py-2.5 text-xs text-[#667788] font-mono">{i + 1}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <CoinLogo src={coin.logo} symbol={coin.symbol} size={22} />
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-white leading-tight">{coin.name}</span>
                                  <span className="text-[10px] text-[#667788]">{coin.symbol}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-white text-sm">
                              {formatPrice(coin.price)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold font-mono ${
                                isUp ? 'text-[#ff4444] bg-[rgba(255,68,68,0.08)]' : 'text-[#00cc66] bg-[rgba(0,204,102,0.08)]'
                              }`}>
                                {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {isUp ? '+' : ''}{coin.change24h.toFixed(2)}%
                              </div>
                            </td>
                            <td className="px-2 py-2.5 hidden sm:table-cell">
                              <div className="flex justify-center">
                                <MiniSparkline data={coin.sparkline7d || []} isUp={isUp} width={72} height={24} />
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs text-[#8899aa] font-mono hidden md:table-cell">
                              {formatMarketCap(coin.marketCap || 0)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* === 空气币/永续合约 === */}
            <div className="rounded-xl border border-[rgba(255,107,0,0.15)] bg-[rgba(13,17,34,0.8)] overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-[rgba(255,107,0,0.1)] bg-[rgba(255,107,0,0.03)]">
                <Zap size={16} className="text-[#ff6b00]" />
                <h2 className="text-base font-bold text-[#ff6b00]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  空气币 / 永续合约
                </h2>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,107,0,0.12)] text-[#ff6b00]">永续</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,215,0,0.12)] text-[#ffd700]">Alpha</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,51,102,0.12)] text-[#ff3366]">TRON</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(255,107,0,0.06)]">
                      <th className="text-left px-3 py-2.5 text-xs text-[#8899aa] font-medium w-8">#</th>
                      <th className="text-left px-3 py-2.5 text-xs text-[#8899aa] font-medium">合约/代币</th>
                      <th className="text-right px-3 py-2.5 text-xs text-[#8899aa] font-medium">价格</th>
                      <th className="text-right px-3 py-2.5 text-xs text-[#8899aa] font-medium">24h</th>
                      <th className="text-center px-2 py-2.5 text-xs text-[#8899aa] font-medium hidden sm:table-cell">7日走势</th>
                      <th className="text-right px-3 py-2.5 text-xs text-[#8899aa] font-medium hidden md:table-cell">24h成交额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.meme.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-[#8899aa]">暂无数据</td></tr>
                    ) : (
                      data.meme.map((coin, i) => {
                        const isUp = coin.change24h >= 0;
                        const noData = coin.price === 0;
                        return (
                          <tr key={`${coin.symbol}-${i}`} className="border-b border-[rgba(255,107,0,0.04)] hover:bg-[rgba(255,107,0,0.03)] transition-colors">
                            <td className="px-3 py-2.5 text-xs text-[#667788] font-mono">{i + 1}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <CoinLogo src={coin.logo} symbol={coin.symbol} size={22} />
                                <div className="flex flex-col">
                                  <div className="flex items-center">
                                    <span className="text-sm font-bold text-white leading-tight">{coin.name}</span>
                                    <CategoryBadge symbol={coin.symbol} />
                                  </div>
                                  <span className="text-[10px] text-[#667788]">{coin.symbol}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-white text-sm">
                              {noData ? <span className="text-[#556677]">-</span> : formatPrice(coin.price)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {noData ? (
                                <span className="text-[#556677] text-xs">-</span>
                              ) : (
                                <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold font-mono ${
                                  isUp ? 'text-[#ff4444] bg-[rgba(255,68,68,0.08)]' : 'text-[#00cc66] bg-[rgba(0,204,102,0.08)]'
                                }`}>
                                  {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                  {isUp ? '+' : ''}{coin.change24h.toFixed(2)}%
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2.5 hidden sm:table-cell">
                              <div className="flex justify-center">
                                <MiniSparkline data={coin.sparkline7d || []} isUp={isUp} width={72} height={24} />
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs text-[#8899aa] font-mono hidden md:table-cell">
                              {noData ? <span className="text-[#556677]">-</span> : formatVolume(coin.volume24h || 0)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* === 投资建议 === */}
        {data && data.advice && (
          <div className="rounded-xl border border-[rgba(255,215,0,0.2)] bg-gradient-to-r from-[rgba(255,215,0,0.04)] to-[rgba(255,107,0,0.04)] p-6 sm:p-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ffd700] to-[#ff6b00] flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(255,215,0,0.2)]">
                <span className="text-lg">💡</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#ffd700] mb-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  投资建议
                </h3>
                <p className="text-xs text-[#8899aa]">基于BTC主导率自动生成，仅供参考</p>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
              {data.advice}
            </p>
          </div>
        )}

        {/* === 模拟投资面板 === */}
        <SimPortfolioPanel />

        {/* === 风险提示 === */}
        <div className="text-center py-4 border-t border-[rgba(0,212,255,0.06)]">
          <p className="text-xs text-[#556677]">
            数据来源：CoinGecko · 每小时自动更新 · 仅供参考，不构成投资建议
          </p>
          <p className="text-xs text-[#445566] mt-1">
            永续合约风险极高，请严格控制仓位和止损 · HUNTER ALPHA v7.3
          </p>
        </div>
      </main>
    </div>
  );
}
