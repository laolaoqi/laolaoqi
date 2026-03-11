// ===================================================================
// AshareSimulation — A股模拟投资独立页面
// ¥1,000,000 虚拟本金，每天9:00（北京时间）更新策略
// 独立页面，深色HUD主题，红涨绿跌（A股惯例）
// ===================================================================

import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl, getRegisterUrl } from '@/const';
import { Link } from 'wouter';
import SimAsharePanel from '@/components/SimAsharePanel';
import {
  ArrowLeft, RefreshCw, Landmark, Shield, Clock, Lock,
  AlertTriangle, LogIn, UserPlus, TrendingUp, BarChart3, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useSEO } from '@/hooks/useSEO';

// ===================================================================
// Access Denied Screen
// ===================================================================
function AccessDeniedScreen({ isLoggedIn, isExpired, expiresAt }: { isLoggedIn: boolean; isExpired?: boolean; expiresAt?: string | null }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-[rgba(255,68,68,0.12)] backdrop-blur-xl" style={{ background: 'var(--theme-header-bg)' }}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff4444] to-transparent opacity-60" />
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
          <div className="flex items-center h-14 gap-3">
            <Link href="/">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#ff4444] hover:bg-[rgba(255,68,68,0.08)] transition-colors text-sm font-medium">
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">返回首页</span>
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-[#ff4444] to-[#ff8800] flex items-center justify-center shadow-[0_0_12px_rgba(255,68,68,0.3)]">
                <Landmark size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground tracking-wide" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  A-SHARE SIM
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-5 max-w-md px-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(255,68,68,0.1)] flex items-center justify-center">
            {isExpired ? (
              <AlertTriangle size={32} className="text-[#ff8800]" />
            ) : (
              <Lock size={32} className="text-[#ff4444]/60" />
            )}
          </div>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            {isExpired ? '权限已过期' : '需要访问权限'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isExpired
              ? `您的权限已于 ${expiresAt ? new Date(Number(expiresAt)).toLocaleDateString('zh-CN') : '近期'} 过期，请联系管理员续期。`
              : isLoggedIn
                ? '您的账号尚未获得A股模拟投资的访问权限，请联系管理员开通。'
                : '请先登录您的账号以访问A股模拟投资。'}
          </p>
          <div className="flex flex-col gap-3">
            {!isLoggedIn && (
              <a href={getLoginUrl()}>
                <Button className="w-full bg-[#ff4444] text-white hover:bg-[#cc3333]">
                  <LogIn size={14} className="mr-2" /> 登录账号
                </Button>
              </a>
            )}
            <Link href="/">
              <Button variant="outline" className="w-full border-[rgba(255,68,68,0.2)] text-[#ff4444] hover:bg-[rgba(255,68,68,0.08)] mt-2">
                <ArrowLeft size={14} className="mr-2" /> 返回首页
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Main Page
// ===================================================================
export default function AshareSimulation() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  useSEO({
    title: 'A股模拟投资 - 猎手阿尔法 HUNTER ALPHA | AI智能选股模拟实盘',
    description: '猎手阿尔法A股模拟投资系统，¥1,000,000虚拟本金，基于AI多因子策略模型自动选股调仓，每日9:00更新策略，红涨绿跌。',
    canonical: 'https://www.llq555.vip/ashare-sim',
    ogTitle: 'A股模拟投资 - 猎手阿尔法',
  });

  // Check access permission
  const { data: accessData, isLoading: accessLoading } = trpc.cryptoBoard.checkAccess.useQuery(undefined, {
    staleTime: 60 * 1000,
    retry: false,
  });

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Show loading while checking access
  if (authLoading || accessLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#ff4444] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">正在验证访问权限...</span>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!isAuthenticated) {
    return <AccessDeniedScreen isLoggedIn={false} />;
  }

  // Logged in but no access
  if (accessData && !accessData.hasAccess) {
    return <AccessDeniedScreen
      isLoggedIn={true}
      isExpired={accessData.isExpired}
      expiresAt={accessData.expiresAt ? String(accessData.expiresAt) : null}
    />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background texture */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, #ff4444 1px, transparent 1px), radial-gradient(circle at 75% 75%, #ff8800 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[rgba(255,68,68,0.12)] backdrop-blur-xl" style={{ background: 'var(--theme-header-bg)' }}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff4444] to-transparent opacity-60" />
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
          <div className="flex items-center h-14 gap-3">
            {/* Back to Home */}
            <Link href="/">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#ff4444] hover:bg-[rgba(255,68,68,0.08)] transition-colors text-sm font-medium">
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">首页</span>
              </button>
            </Link>

            {/* Title */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-[#ff4444] to-[#ff8800] flex items-center justify-center shadow-[0_0_12px_rgba(255,68,68,0.3)]">
                <Landmark size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground tracking-wide" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  A-SHARE SIM
                </h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5">A股模拟投资 · ¥100万虚拟本金</p>
              </div>
            </div>

            <div className="flex-1" />

            {/* Quick nav links */}
            <Link href="/crypto-investment">
              <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[rgba(255,107,0,0.12)] to-[rgba(255,51,102,0.12)] border border-[rgba(255,107,0,0.25)] text-[#ff6b00] hover:from-[rgba(255,107,0,0.2)] hover:to-[rgba(255,51,102,0.2)] transition-all text-xs font-bold">
                <Zap size={12} />
                <span>投资看板</span>
              </button>
            </Link>

            <Link href="/crypto-panorama">
              <button className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[rgba(0,212,255,0.08)] to-[rgba(0,100,200,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:from-[rgba(0,212,255,0.15)] hover:to-[rgba(0,100,200,0.15)] transition-all text-xs font-bold">
                <BarChart3 size={12} />
                <span>全景看板</span>
              </button>
            </Link>

            {/* Clock */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={12} />
              <span className="font-mono tabular-nums">{now.toLocaleTimeString('zh-CN', { hour12: false })}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-4 lg:px-6 py-6 space-y-6">

        {/* Strategy intro banner */}
        <div className="rounded-xl border border-[rgba(255,68,68,0.15)] bg-gradient-to-r from-[rgba(255,68,68,0.05)] via-[rgba(255,136,0,0.05)] to-[rgba(255,68,68,0.05)] p-5">
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff4444]/20 to-[#ff8800]/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-[#ff4444]" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <h2 className="text-base font-bold text-foreground mb-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                AI A-SHARE SIMULATION
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                基于猎手阿尔法AI多因子策略模型，从沪深300+全市场活跃股中自动选股。
                初始本金 <span className="text-[#ff4444] font-bold">¥1,000,000</span>，
                每日 <span className="text-[#ff8800] font-bold">9:00（北京时间）</span> 自动调仓。
                选股原则与交易策略与数字货币模拟投资一致：根据模式评分（进攻/防御/震荡）动态配置仓位。
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  🔴 红涨绿跌（A股惯例）
                </span>
                <span className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  📊 多因子评分选股
                </span>
                <span className="text-[10px] px-2 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  ⏰ 每日9:00自动调仓
                </span>
                <span className="text-[10px] px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  🎯 沪深300+全市场扫描
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* A-Share Simulation Panel */}
        <SimAsharePanel />

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/">
            <div className="rounded-xl border border-[rgba(0,212,255,0.15)] bg-card/60 p-4 hover:bg-card/80 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center group-hover:bg-[#00d4ff]/20 transition-colors">
                  <BarChart3 className="w-5 h-5 text-[#00d4ff]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">AI选股首页</div>
                  <div className="text-[10px] text-muted-foreground">A股/港股/美股/加密货币</div>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/crypto-investment">
            <div className="rounded-xl border border-[rgba(255,107,0,0.15)] bg-card/60 p-4 hover:bg-card/80 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#ff6b00]/10 flex items-center justify-center group-hover:bg-[#ff6b00]/20 transition-colors">
                  <Zap className="w-5 h-5 text-[#ff6b00]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">数字货币投资看板</div>
                  <div className="text-[10px] text-muted-foreground">主流币 vs 空气币/永续合约</div>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/crypto-panorama">
            <div className="rounded-xl border border-[rgba(255,51,102,0.15)] bg-card/60 p-4 hover:bg-card/80 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#ff3366]/10 flex items-center justify-center group-hover:bg-[#ff3366]/20 transition-colors">
                  <TrendingUp className="w-5 h-5 text-[#ff3366]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">全景看板</div>
                  <div className="text-[10px] text-muted-foreground">全部币种实时K线</div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Risk Disclaimer */}
        <div className="text-center py-4 border-t border-[rgba(255,68,68,0.06)]">
          <p className="text-xs text-muted-foreground/50">
            模拟投资仅供参考，不构成投资建议 · 数据来源：Yahoo Finance · 每日9:00自动更新
          </p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            A股投资有风险，入市需谨慎 · HUNTER ALPHA v7.16
          </p>
        </div>
      </main>
    </div>
  );
}
