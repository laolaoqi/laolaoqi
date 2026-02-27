// ===================================================================
// Home — 猎手阿尔法主仪表盘页面 v3
// 单市场独立展示 + 热力图 + AI摘要
// ===================================================================

import { useMarketData } from '@/hooks/useMarketData';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { t } from '@/lib/i18n';
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
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { motion } from 'framer-motion';

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

      {/* Theme Switcher - top left corner */}
      <ThemeSwitcher />

      {/* Welcome Banner - PC only */}
      <div className="hidden lg:block max-w-[1600px] mx-auto px-3 lg:px-5 pt-3">
        <div className="flex items-center justify-center gap-3 py-2 px-4 rounded border border-red-500/20 bg-red-500/5">
          <span className="text-red-500 text-lg font-bold tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            AI选股指南
          </span>
          <span className="text-red-400/80 text-sm">|</span>
          <span className="text-red-400 text-sm font-medium">
            {t('brand.subtitle', lang)} · {t('market.' + market, lang)}
          </span>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 relative z-10">
        <motion.div
          className="max-w-[1600px] mx-auto px-3 lg:px-5 py-4 space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={market} // Re-animate when market changes
        >
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
            <div className="flex items-center justify-between py-3 border-t border-[rgba(0,212,255,0.08)]">
              <div className="flex items-center gap-3">
                <div className="w-1 h-1 rounded-full bg-[#00d4ff] opacity-40" />
                <span className="text-sm text-red-400/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {t('brand.version', lang)}
                </span>
                <a href="/crypto-investment" className="text-sm text-[#ff6b00]/80 hover:text-[#ff6b00] transition-colors font-medium">
                  {lang === 'zh' ? '₿ 投资看板' : '₿ Crypto Board'}
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
