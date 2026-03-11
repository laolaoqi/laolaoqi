// ===================================================================
// Home — 猎手阿尔法主仪表盘页面 v3
// 单市场独立展示 + 热力图 + AI摘要
// ===================================================================

import { useMarketData } from '@/hooks/useMarketData';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { t } from '@/lib/i18n';
import { getLoginUrl, getRegisterUrl } from '@/const';
import TopBar from '@/components/TopBar';
import ModeScores from '@/components/ModeScores';
import MarketOverview from '@/components/MarketOverview';
import WeightAllocationPanel from '@/components/WeightAllocation';
import MarketSentimentPanel from '@/components/MarketSentiment';
import NewsDigestPanel from '@/components/NewsDigest';
import TopRecommendations from '@/components/TopRecommendations';
import RiskControlPanel from '@/components/RiskControl';
import FearGreedGauge from '@/components/FearGreedGauge';
import HeatMap from '@/components/HeatMap';
import AISummary from '@/components/AISummary';
import AnnouncementBoard from '@/components/AnnouncementBoard';

import { motion } from 'framer-motion';
import { UserPlus, LogIn, Sparkles } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

const HERO_BG = 'https://private-us-east-1.manuscdn.com/sessionFile/5mBhgnjK6Lia4j3MfXGMvH/sandbox/NOT8bhL1LfjHxBx0AyI0wR-img-1_1771952361000_na1fn_aGVyby1iZw.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvNW1CaGduaks2TGlhNGozTWZYR012SC9zYW5kYm94L05PVDhiaEwxTGZqSHhCeDBBeUkwd1ItaW1nLTFfMTc3MTk1MjM2MTAwMF9uYTFmbl9hR1Z5YnkxaVp3LmpwZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=qoHWe24bvuKdu1D0CP0~Vo-ld~CZQXa3jXk0IiQJFKBFgJ-ki-pQeVDSG9egdIdB4QgdYPwar8lPX0qmOLzFFmRAqIpaAaqAoJwDTRdxpUyjlKzR3de6JM0UuobYAVFRxh66RsF6-u7X80gdnKSZ~SOM3yMuFqeW9nsFDTJusALH6v9YyPpYKX2aGo3K~gyjrm9Ld5dhbrhEsdrikS78hPazjngkmrHg5ZVwlZgPHq06syWOlC7aqVfzdroxBLDmXF9SJAFkJNJiIQs120ykZ5lIM7FAM-~4LPBzQHBv7jH8zPfHy1OqnMPYZt2198dhB-TRX-QFN3UuhU9ejSxTaA__';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function Dashboard() {
  const { lang, market } = useApp();
  const { isAuthenticated } = useAuth();

  // SEO: Dynamic meta tags per market
  const marketLabel = market === 'cn' ? 'A股' : market === 'hk' ? '港股' : market === 'us' ? '美股' : '加密货币';
  const marketLabelEn = market === 'cn' ? 'A-Share' : market === 'hk' ? 'HK Stock' : market === 'us' ? 'US Stock' : 'Crypto';
  useSEO({
    title: `猎手阿尔法 HUNTER ALPHA - AI智能选股 | ${marketLabel}实时行情与策略`,
    description: `猎手阿尔法（Hunter Alpha）AI驱动的${marketLabel}智能选股平台，提供多因子策略分析、恐惧贪婪指数、行业热力图、AI核心推荐TOP10与风控建议。`,
    canonical: 'https://www.llq555.vip/',
    ogTitle: `猎手阿尔法 - ${marketLabel}AI智能选股平台`,
    ogDescription: `AI驱动的${marketLabel}多因子策略分析、行业热力图、TOP10推荐与风控建议 | ${marketLabelEn} Real-time Analysis`,
  });
  const {
    indices, recommendations, modeScores, weights,
    sentiment, newsDigest, riskControl, loading, lastUpdate, isLive, refresh,
  } = useMarketData(30000);

  const fearGreed = (() => {
    const avgChange = indices.length > 0 ? indices.reduce((s, i) => s + i.changePercent, 0) / indices.length : 0;
    const riseRatio = sentiment.riseCount / (sentiment.riseCount + sentiment.flatCount + sentiment.fallCount || 1);
    return Math.round(Math.min(100, Math.max(0, 50 + avgChange * 15)) * 0.4 + riseRatio * 100 * 0.3 + 50 * 0.3);
  })();

  return (
    <div className="min-h-screen flex flex-col bg-background grid-bg">
      {/* Background image overlay */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{ backgroundImage: `url(${HERO_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />

      {/* Top navigation */}
      <TopBar isLive={isLive} lastUpdate={lastUpdate} onRefresh={refresh} />


      {/* SEO: H1 title - visually styled as welcome banner on PC */}
      <div className="hidden lg:block max-w-[1600px] mx-auto px-3 lg:px-5 pt-3">
        <div className="flex items-center justify-center gap-3 py-2 px-4 rounded border border-red-500/20 bg-red-500/5">
          <h1 className="text-red-500 text-lg font-bold tracking-wider m-0" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            AI选股指南
          </h1>
          <span className="text-red-400/80 text-sm">|</span>
          <span className="text-red-400 text-sm font-medium">
            {t('brand.subtitle', lang)} · {t('market.' + market, lang)}
          </span>
        </div>
      </div>
      {/* SEO: H1 for mobile (sr-only so it doesn't break layout) */}
      <h1 className="sr-only lg:hidden">猎手阿尔法 - AI智能选股平台</h1>

      {/* Guest Registration/Login Banner — only shown to unauthenticated users */}
      {!isAuthenticated && (
        <motion.div
          className="max-w-[1600px] mx-auto px-3 lg:px-5 pt-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="relative overflow-hidden rounded-lg border border-[#00d4ff]/25 bg-gradient-to-r from-[#00d4ff]/8 via-[rgba(0,102,255,0.06)] to-[#00d4ff]/8">
            {/* Glow lines */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff]/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#0066ff]/30 to-transparent" />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 lg:px-6 lg:py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d4ff]/20 to-[#0066ff]/20 flex items-center justify-center shrink-0">
                  <Sparkles size={20} className="text-[#00d4ff]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {lang === 'zh' ? '欢迎来到猎手阿尔法！注册账号解锁全部功能' : 'Welcome! Register to unlock all features'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lang === 'zh' ? '注册后可查看AI核心推荐TOP10、投资看板、下载PDF报告等专属功能' : 'Access AI TOP10 picks, Crypto Board, PDF reports and more'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getRegisterUrl()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#0066ff] text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-[0_0_16px_rgba(0,212,255,0.25)]"
                >
                  <UserPlus size={14} />
                  {lang === 'zh' ? '免费注册' : 'Sign Up Free'}
                </a>
                <a
                  href={getLoginUrl()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#00d4ff]/30 text-[#00d4ff] text-sm font-medium hover:bg-[#00d4ff]/10 transition-colors"
                >
                  <LogIn size={14} />
                  {lang === 'zh' ? '登录' : 'Login'}
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Crypto Investment Board Entry Banner */}
      <motion.div
        className="max-w-[1600px] mx-auto px-3 lg:px-5 pt-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <a
          href="/crypto-investment"
          className="group block relative overflow-hidden rounded-lg border border-[#f7931a]/30 bg-gradient-to-r from-[#f7931a]/10 via-[#00d4ff]/10 to-[#f7931a]/10 hover:from-[#f7931a]/20 hover:via-[#00d4ff]/20 hover:to-[#f7931a]/20 transition-all duration-500"
        >
          {/* Animated scan line */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#f7931a] to-transparent animate-pulse" />
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent animate-pulse" />
          </div>

          <div className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4">
            <div className="flex items-center gap-3 lg:gap-4">
              {/* Bitcoin icon */}
              <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-[#f7931a]/20 flex items-center justify-center">
                <span className="text-xl lg:text-2xl">₿</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[#f7931a] font-bold text-sm lg:text-base" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    CRYPTO BOARD
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#00d4ff]/20 text-[#00d4ff] rounded">
                    LIVE
                  </span>
                </div>
                <p className="text-muted-foreground text-xs lg:text-sm mt-0.5">
                  {lang === 'zh' ? '数字货币投资看板 — 主流币 vs 空气币永续合约 + 模拟投资实盘' : 'Crypto Investment Board — Mainstream vs Meme Perps + Sim Portfolio'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[#f7931a] group-hover:translate-x-1 transition-transform">
              <span className="hidden sm:inline text-sm font-medium">{lang === 'zh' ? '进入看板' : 'Enter'}</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </a>
      </motion.div>

      {/* Main content */}
      <main className="flex-1 relative z-10">
        <motion.div
          className="max-w-[1600px] mx-auto px-3 lg:px-5 py-4 space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={market} // Re-animate when market changes
        >
          {/* SEO: H2 for market overview section */}
          <h2 className="sr-only">{lang === 'zh' ? '实时市场行情与模式评分' : 'Real-time Market Data & Mode Scores'}</h2>

          {/* Row 1: Mode Scores | Market Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
            <motion.div variants={itemVariants}>
              <ModeScores scores={modeScores} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <MarketOverview indices={indices} loading={loading} />
            </motion.div>
          </div>

          {/* Row 1.5: Fear & Greed + Announcements — PC端并列 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div variants={itemVariants}>
              <FearGreedGauge value={fearGreed} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <AnnouncementBoard />
            </motion.div>
          </div>

          {/* Row 2: Heat Map (current market sectors) */}
          <motion.div variants={itemVariants}>
            <HeatMap />
          </motion.div>

          {/* Row 3: Weight Allocation + Market Sentiment + AI Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <motion.div variants={itemVariants}>
              <WeightAllocationPanel weights={weights} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <MarketSentimentPanel sentiment={sentiment} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <AISummary />
            </motion.div>
          </div>

          {/* Row 4: News Digest */}
          <motion.div variants={itemVariants}>
            <NewsDigestPanel digest={newsDigest} />
          </motion.div>

          {/* SEO: H2 for recommendations section */}
          <h2 className="sr-only">{lang === 'zh' ? 'AI策略推荐TOP10核心标的' : 'AI Strategy TOP10 Recommendations'}</h2>

          {/* Row 5: Top Recommendations (current market only) */}
          <motion.div variants={itemVariants}>
            <TopRecommendations recommendations={recommendations} />
          </motion.div>

          {/* Row 6: Risk Control */}
          <motion.div variants={itemVariants}>
            <RiskControlPanel riskControl={riskControl} />
          </motion.div>

          {/* Footer */}
          <motion.div variants={itemVariants}>
            <div className="flex flex-col gap-2 py-3 border-t border-[rgba(0,212,255,0.08)]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-1 h-1 rounded-full bg-[#00d4ff] opacity-40" />
                  <span className="text-sm text-red-400/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {t('brand.version', lang)}
                  </span>
                  <a href="/crypto-investment" className="text-sm text-[#ff6b00]/80 hover:text-[#ff6b00] transition-colors font-medium">
                    {lang === 'zh' ? '₿ 投资看板' : '₿ Crypto Board'}
                  </a>
                  <span className="text-red-400/30">·</span>
                  <a href="/crypto-panorama" className="text-sm text-[#ff3366]/80 hover:text-[#ff3366] transition-colors font-medium">
                    {lang === 'zh' ? '⚡ 全景看板' : '⚡ Panorama'}
                  </a>
                  <span className="text-red-400/30">·</span>
                  <a href="/about" className="text-sm text-[#00d4ff]/70 hover:text-[#00d4ff] transition-colors font-medium">
                    {lang === 'zh' ? '网站介绍 & 数据模型说明' : 'About & Data Model'}
                  </a>
                </div>
                <span className="text-sm text-red-400/60">
                  {t('footer.disclaimer', lang)}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-1 h-1 rounded-full bg-[#00d4ff] opacity-40" />
                <span className="text-xs text-muted-foreground/60">
                  {lang === 'zh' ? '联系方式：' : 'Contact: '}
                </span>
                <a
                  href="mailto:laolaoqi@126.com"
                  className="text-xs text-[#00d4ff]/70 hover:text-[#00d4ff] transition-colors"
                >
                  laolaoqi@126.com
                </a>
                <span className="text-muted-foreground/30">·</span>
                <a
                  href="https://t.me/LAOLAOQI888"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/tg inline-flex items-center gap-1.5 text-xs text-[#29a9eb]/70 hover:text-[#29a9eb] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Telegram @LAOLAOQI888
                </a>
              </div>
              {/* Telegram QR Code - hover to enlarge */}
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1 h-1 rounded-full bg-[#00d4ff] opacity-40" />
                <span className="text-xs text-muted-foreground/60">
                  {lang === 'zh' ? 'Telegram 扫码联系：' : 'Scan to contact on Telegram:'}
                </span>
                <a
                  href="https://t.me/LAOLAOQI888"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/qr relative"
                >
                  <img
                    src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663244547938/MfgeyLGjSRfZkOAd.jpeg"
                    alt="Telegram @LAOLAOQI888 QR Code"
                    className="w-16 h-16 rounded-md border border-[#29a9eb]/20 hover:border-[#29a9eb]/50 transition-all cursor-pointer"
                  />
                  {/* Enlarged QR on hover */}
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover/qr:block z-50">
                    <div className="bg-[#0a1628] border border-[#29a9eb]/30 rounded-lg p-2 shadow-xl shadow-black/50">
                      <img
                        src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663244547938/MfgeyLGjSRfZkOAd.jpeg"
                        alt="Telegram @LAOLAOQI888 QR Code"
                        className="w-48 h-48 rounded-md"
                      />
                      <p className="text-center text-xs text-[#29a9eb] mt-1.5 font-medium">@LAOLAOQI888</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  );
}
