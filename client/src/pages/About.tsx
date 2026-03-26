// ===================================================================
// About — 网站介绍 + 数据模型说明 + PDF下载
// v7.4 更新：反映沪深300全覆盖、投资看板、模拟投资、权限系统
// ===================================================================

import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { useApp } from '@/contexts/AppContext';
import { AppProvider } from '@/contexts/AppContext';
import TopBar from '@/components/TopBar';
import HudPanel from '@/components/HudPanel';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Download, Lock, TrendingUp, BarChart3, Brain,
  Shield, Activity, Target, Layers, Database, Cpu, LineChart,
  Zap, AlertTriangle, BookOpen, Bitcoin, Users, Clock, Landmark
} from 'lucide-react';
import { useState } from 'react';
import { useSEO } from '@/hooks/useSEO';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function AboutContent() {
  const { isAuthenticated } = useAuth();
  const { lang } = useApp();
  const [downloading, setDownloading] = useState(false);

  useSEO({
    title: lang === 'zh' ? '关于我们 - 猎手阿尔法 HUNTER ALPHA | 数据模型说明' : 'About - Hunter Alpha | Data Model Guide',
    description: lang === 'zh'
      ? '了解猎手阿尔法的AI多因子选股模型、数据来源、策略算法、风控体系与权限系统设计。'
      : 'Learn about Hunter Alpha\'s AI multi-factor stock selection model, data sources, strategy algorithms, and risk control system.',
    canonical: 'https://www.llq555.vip/about',
    ogTitle: lang === 'zh' ? '关于猎手阿尔法 - 数据模型与策略说明' : 'About Hunter Alpha - Data Model & Strategy Guide',
    ogDescription: lang === 'zh'
      ? 'AI多因子选股模型、数据来源、策略算法与风控体系设计详解'
      : 'AI multi-factor model, data sources, strategy algorithms & risk control system explained',
  });

  const handleDownloadPDF = async () => {
    if (!isAuthenticated) return;
    setDownloading(true);
    try {
      const resp = await fetch('/api/trpc/system.generateModelPDF?input={}', {
        credentials: 'include',
      });
      const json = await resp.json();
      const url = json?.result?.data?.url;
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = 'HunterAlpha-DataModel-Guide-v2.pdf';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        generateClientPDF();
      }
    } catch {
      generateClientPDF();
    } finally {
      setDownloading(false);
    }
  };

  const generateClientPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(getPDFHTML());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background grid-bg">
      <TopBar isLive={true} lastUpdate={new Date()} onRefresh={() => {}} />

      <main className="flex-1 relative z-10">
        <motion.div
          className="max-w-[1100px] mx-auto px-4 lg:px-6 py-6 space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Back button */}
          <motion.div variants={itemVariants}>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/" className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-base font-medium">
                <ArrowLeft size={18} />
                返回首页
              </Link>
              <a href="/crypto-investment" className="text-sm text-[#ff6b00]/80 hover:text-[#ff6b00] transition-colors font-medium">₿ 投资看板</a>
              <span className="text-red-400/30">·</span>
              <a href="/ashare-sim" className="text-sm text-[#ff4444]/80 hover:text-[#ff4444] transition-colors font-medium">🇨🇳 A股模拟投资</a>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div variants={itemVariants}>
            <HudPanel title="关于 HUNTER ALPHA · AI选股指南 v2.0">
              <div className="space-y-4">
                <p className="text-base text-foreground/90 leading-relaxed">
                  <strong className="text-red-400">HUNTER ALPHA（猎手阿尔法）</strong>是一个基于人工智能和量化分析的全球投资筛选与推荐平台。
                  系统覆盖<strong>A股（沪深300全覆盖）、港股（恒生指数82只）、美股（NASDAQ-100）、加密货币</strong>四大市场，通过多维度数据采集、策略引擎评分和AI智能分析，
                  为投资者提供实时的市场洞察和标的推荐。
                </p>
                <p className="text-base text-foreground/80 leading-relaxed">
                  v2.0版本新增<strong>数字货币投资看板</strong>（主流币vs空气币永续合约对比）、<strong>加密货币模拟投资</strong>（$10,000虚拟本金自动调仓）、
                  <strong>A股模拟投资</strong>（¥100万虚拟本金，基于Top10推荐选股，周度盈亏统计）、
                  <strong>管理员权限系统</strong>（投资看板访问控制+时间期限管理）。A股数据源已升级为新浪财经实时API，确保行情数据准确可靠。
                </p>
                <p className="text-sm text-foreground/60 leading-relaxed">
                  所有数据和推荐仅供参考，不构成投资建议。
                </p>
              </div>
            </HudPanel>
          </motion.div>

          {/* Platform Features */}
          <motion.div variants={itemVariants}>
            <HudPanel title="平台核心功能">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: TrendingUp, title: '实时行情监控', desc: '覆盖全球4大市场主要指数和511只候选标的的实时行情数据，A股使用新浪财经API确保准确' },
                  { icon: Brain, title: 'AI智能选股', desc: '基于6维度量化策略引擎，自动筛选评分Top 10推荐标的，每5分钟更新' },
                  { icon: BarChart3, title: '市场热力图', desc: '按行业板块聚合的涨跌热力图，直观展示市场资金流向和板块轮动' },
                  { icon: Activity, title: '恐惧贪婪指数', desc: '综合涨跌比、资金流、市场情绪等多指标的综合情绪指数（0-100）' },
                  { icon: Shield, title: '风险控制面板', desc: '实时止损线、仓位建议、风险预警等风控指标，保护投资安全' },
                  { icon: Target, title: 'AI市场摘要', desc: '基于LLM大语言模型的智能市场分析报告，每15分钟更新' },
                  { icon: Bitcoin, title: '数字货币投资看板', desc: '主流币前10 vs 空气币/永续合约21只，含Logo、7日K线、BTC主导率投资建议' },
                  { icon: LineChart, title: '加密货币模拟投资', desc: '$10,000虚拟本金，每天6:00/22:00自动调仓，展示持仓、收益率和交易记录' },
                  { icon: Landmark, title: 'A股模拟投资', desc: '¥100万虚拟本金，基于Top10推荐选股，每日9:00调仓，周度盈亏统计（周一~周五）' },
                  { icon: Users, title: '管理员权限系统', desc: '用户统计、投资看板访问权限管理、时间期限控制、公告管理' },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-lg border border-[rgba(0,212,255,0.12)] bg-[rgba(0,212,255,0.03)] hover:border-[rgba(0,212,255,0.25)] transition-all">
                    <div className="flex items-center gap-3 mb-2">
                      <item.icon size={22} className="text-red-400 shrink-0" />
                      <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                    </div>
                    <p className="text-sm text-foreground/70 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </HudPanel>
          </motion.div>

          {/* Data Model */}
          <motion.div variants={itemVariants}>
            <HudPanel title="数据模型说明">
              <div className="space-y-6">

                {/* Data Sources */}
                <div>
                  <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-3">
                    <Database size={20} /> 数据来源
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(0,212,255,0.15)]">
                          <th className="text-left py-2 px-3 text-red-400 font-bold">数据类型</th>
                          <th className="text-left py-2 px-3 text-red-400 font-bold">来源</th>
                          <th className="text-left py-2 px-3 text-red-400 font-bold">更新频率</th>
                          <th className="text-left py-2 px-3 text-red-400 font-bold">说明</th>
                        </tr>
                      </thead>
                      <tbody className="text-foreground/80">
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">A股实时行情</td>
                          <td className="py-2.5 px-3">新浪财经实时API</td>
                          <td className="py-2.5 px-3">30秒</td>
                          <td className="py-2.5 px-3">上证/深证/创业板指数 + 沪深300个股实时价格、涨跌幅、成交量</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">港股/美股行情</td>
                          <td className="py-2.5 px-3">Yahoo Finance v8 Chart API</td>
                          <td className="py-2.5 px-3">30秒</td>
                          <td className="py-2.5 px-3">恒生指数82只成分股 + NASDAQ-100个股价格、涨跌幅、成交量</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">技术指标</td>
                          <td className="py-2.5 px-3">自研计算引擎</td>
                          <td className="py-2.5 px-3">5分钟</td>
                          <td className="py-2.5 px-3">MA5/MA20均线、RSI14、MACD、布林带</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">基本面数据</td>
                          <td className="py-2.5 px-3">预设+API补充</td>
                          <td className="py-2.5 px-3">定期更新</td>
                          <td className="py-2.5 px-3">PE/PB/股息率/市值等财务指标（沪深300含完整估值数据）</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">资金流向</td>
                          <td className="py-2.5 px-3">成交量分析推算</td>
                          <td className="py-2.5 px-3">5分钟</td>
                          <td className="py-2.5 px-3">基于近期vs历史成交量变化推算资金流入/流出</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">加密货币行情</td>
                          <td className="py-2.5 px-3">CoinGecko API</td>
                          <td className="py-2.5 px-3">5分钟</td>
                          <td className="py-2.5 px-3">主流币+空气币价格、市值、24h涨跌、7日K线、Logo</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">BTC主导率</td>
                          <td className="py-2.5 px-3">CoinGecko Global API</td>
                          <td className="py-2.5 px-3">5分钟</td>
                          <td className="py-2.5 px-3">BTC市值占比，用于生成投资建议（防御/过渡/山寨季/空气季）</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">AI分析</td>
                          <td className="py-2.5 px-3">LLM大语言模型</td>
                          <td className="py-2.5 px-3">15分钟</td>
                          <td className="py-2.5 px-3">基于市场数据生成智能分析摘要</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Strategy Engine */}
                <div>
                  <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-3">
                    <Cpu size={20} /> 策略引擎架构
                  </h3>
                  <p className="text-base text-foreground/80 leading-relaxed mb-4">
                    策略引擎是平台的核心模块，负责从候选股票池中筛选出综合评分最高的Top 10推荐标的。
                    引擎每5分钟自动运行一次，覆盖<strong>A股(300只沪深300成分股，新浪API)</strong>、<strong>港股(82只恒生指数成分股)</strong>、<strong>美股(99只NASDAQ-100)</strong>、<strong>加密货币(30只)</strong>共<strong>511只</strong>候选标的。
                    A股Top10推荐基于前一日收盘行情评分，每日开盘前更新。
                  </p>
                  <div className="bg-[rgba(0,212,255,0.03)] border border-[rgba(0,212,255,0.1)] rounded-lg p-4">
                    <h4 className="text-base font-bold text-foreground mb-3">运行流程</h4>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0 text-sm">
                      {[
                        { step: '1', label: '数据采集', desc: '新浪/Yahoo/CoinGecko' },
                        { step: '2', label: '指标计算', desc: 'MA/RSI/资金流' },
                        { step: '3', label: '多维评分', desc: '6维度加权' },
                        { step: '4', label: '排序筛选', desc: 'Top 10' },
                        { step: '5', label: '理由生成', desc: '模板化输出' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="flex items-center gap-2 px-3 py-2 rounded bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.15)]">
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 text-xs font-bold">{item.step}</span>
                            <div>
                              <div className="font-bold text-foreground">{item.label}</div>
                              <div className="text-foreground/50 text-xs">{item.desc}</div>
                            </div>
                          </div>
                          {i < 4 && <span className="hidden sm:block text-red-400/40 mx-1">→</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scoring Model */}
                <div>
                  <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-3">
                    <LineChart size={20} /> 评分模型详解
                  </h3>
                  <p className="text-base text-foreground/80 leading-relaxed mb-4">
                    每只候选股票通过6个维度进行综合评分，基础分50分，最终得分范围10~99分。各维度权重和评分规则如下：
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(0,212,255,0.15)]">
                          <th className="text-left py-2 px-3 text-red-400 font-bold">维度</th>
                          <th className="text-center py-2 px-3 text-red-400 font-bold">权重</th>
                          <th className="text-left py-2 px-3 text-red-400 font-bold">评分规则</th>
                          <th className="text-left py-2 px-3 text-red-400 font-bold">分值范围</th>
                        </tr>
                      </thead>
                      <tbody className="text-foreground/80">
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">估值评分 (PE/PB)</td>
                          <td className="py-2.5 px-3 text-center font-bold text-red-400">30%</td>
                          <td className="py-2.5 px-3">PE&lt;10: +15, PE&lt;15: +12, PE&lt;20: +8; PB&lt;1: +8, PB&lt;2: +5</td>
                          <td className="py-2.5 px-3">-8 ~ +23</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">股息率评分</td>
                          <td className="py-2.5 px-3 text-center font-bold text-red-400">15%</td>
                          <td className="py-2.5 px-3">≥5%: +10, ≥4%: +8, ≥3%: +6, ≥2%: +4, ≥1%: +2</td>
                          <td className="py-2.5 px-3">0 ~ +10</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">资金流向评分</td>
                          <td className="py-2.5 px-3 text-center font-bold text-red-400">15%</td>
                          <td className="py-2.5 px-3">净流入&gt;5亿: +8, &gt;2亿: +5; 净流出&gt;5亿: -5</td>
                          <td className="py-2.5 px-3">-5 ~ +8</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">技术面评分 (MA+RSI)</td>
                          <td className="py-2.5 px-3 text-center font-bold text-red-400">20%</td>
                          <td className="py-2.5 px-3">价格&gt;MA20: +5; RSI 30~70: +4, RSI&lt;30(超卖): +6</td>
                          <td className="py-2.5 px-3">-7 ~ +11</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">动量评分</td>
                          <td className="py-2.5 px-3 text-center font-bold text-red-400">10%</td>
                          <td className="py-2.5 px-3">涨幅&gt;3%: +5, &gt;1%: +3; 跌幅&gt;3%: -3</td>
                          <td className="py-2.5 px-3">-3 ~ +5</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">52周位置评分</td>
                          <td className="py-2.5 px-3 text-center font-bold text-red-400">10%</td>
                          <td className="py-2.5 px-3">接近52周低点(&lt;30%): +5; 接近高点(&gt;90%): -2</td>
                          <td className="py-2.5 px-3">-2 ~ +5</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Crypto Investment Board */}
                <div>
                  <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-3">
                    <Bitcoin size={20} /> 数字货币投资看板
                  </h3>
                  <p className="text-base text-foreground/80 leading-relaxed mb-4">
                    独立的数字货币投资看板，对比主流币蓝筹和空气币永续合约，基于BTC主导率自动生成投资建议。
                    数据每5分钟从CoinGecko自动更新，零AI token消耗。舆情摘要以加密货币市场信息为主。
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(0,212,255,0.15)]">
                          <th className="text-left py-2 px-3 text-red-400 font-bold">板块</th>
                          <th className="text-left py-2 px-3 text-red-400 font-bold">币种</th>
                          <th className="text-left py-2 px-3 text-red-400 font-bold">数据</th>
                        </tr>
                      </thead>
                      <tbody className="text-foreground/80">
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">主流币前10</td>
                          <td className="py-2.5 px-3">BTC, ETH, BNB, SOL, XRP, ADA, AVAX, TRX, DOGE, LINK</td>
                          <td className="py-2.5 px-3">价格、24h涨跌、市值、成交额、Logo、7日K线</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">空气币永续合约</td>
                          <td className="py-2.5 px-3">TRUMP, WLD, HYPE, ASTER, MYX, COAI, DOGE, CLO, PUMP, SUN, AIA, XAU, XAG, WLFI, BANK</td>
                          <td className="py-2.5 px-3">价格、24h涨跌、成交额、Logo、7日K线</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">Binance Alpha</td>
                          <td className="py-2.5 px-3">XLAB, RWA, MM, U, PINGPONG</td>
                          <td className="py-2.5 px-3">Binance Alpha新上线代币</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2.5 px-3 font-medium">TRON链</td>
                          <td className="py-2.5 px-3">波场人生 (TRONLIFE)</td>
                          <td className="py-2.5 px-3">TRON链上代币（占位符）</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 bg-[rgba(255,215,0,0.04)] border border-[rgba(255,215,0,0.15)] rounded-lg p-4">
                    <h4 className="text-base font-bold text-[#ffd700] mb-2">BTC主导率投资建议模型</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-[rgba(255,215,0,0.15)]">
                            <th className="text-left py-2 px-3 text-[#ffd700] font-bold">BTC主导率</th>
                            <th className="text-left py-2 px-3 text-[#ffd700] font-bold">阶段</th>
                            <th className="text-left py-2 px-3 text-[#ffd700] font-bold">建议</th>
                          </tr>
                        </thead>
                        <tbody className="text-foreground/80">
                          <tr className="border-b border-[rgba(255,215,0,0.06)]">
                            <td className="py-2 px-3 font-mono">&gt; 60%</td>
                            <td className="py-2 px-3 font-bold text-[#00d4ff]">防御期</td>
                            <td className="py-2 px-3">BTC/ETH为主，远离空气币</td>
                          </tr>
                          <tr className="border-b border-[rgba(255,215,0,0.06)]">
                            <td className="py-2 px-3 font-mono">50% ~ 60%</td>
                            <td className="py-2 px-3 font-bold text-[#ffd700]">过渡期</td>
                            <td className="py-2 px-3">主流持仓为主 + 小仓位试水空气永续</td>
                          </tr>
                          <tr className="border-b border-[rgba(255,215,0,0.06)]">
                            <td className="py-2 px-3 font-mono">40% ~ 50%</td>
                            <td className="py-2 px-3 font-bold text-[#ff6b00]">山寨季</td>
                            <td className="py-2 px-3">加大山寨币仓位，空气永续可适当加仓</td>
                          </tr>
                          <tr className="border-b border-[rgba(255,215,0,0.06)]">
                            <td className="py-2 px-3 font-mono">&lt; 40%</td>
                            <td className="py-2 px-3 font-bold text-[#ff3366]">空气季</td>
                            <td className="py-2 px-3">空气币全面爆发，但需警惕见顶风险</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Simulated Investment Systems */}
                <div>
                  <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-3">
                    <Clock size={20} /> 模拟投资系统
                  </h3>
                  <p className="text-base text-foreground/80 leading-relaxed mb-4">
                    平台提供两套独立的模拟投资系统，分别覆盖加密货币和A股市场，均基于平台策略模型自动调仓。
                  </p>

                  <h4 className="text-base font-bold text-[#ffd700] mb-3">加密货币模拟投资</h4>
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(0,212,255,0.15)]">
                          <th className="text-left py-2 px-3 text-red-400 font-bold">参数</th>
                          <th className="text-left py-2 px-3 text-red-400 font-bold">设置</th>
                        </tr>
                      </thead>
                      <tbody className="text-foreground/80">
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2 px-3 font-medium">初始本金</td>
                          <td className="py-2 px-3">$10,000 USD</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2 px-3 font-medium">调仓频率</td>
                          <td className="py-2 px-3">每天2次（北京时间 06:00 / 22:00）</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2 px-3 font-medium">仓位策略</td>
                          <td className="py-2 px-3">根据BTC主导率4档策略自动分配（防御/过渡/山寨季/空气季）</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2 px-3 font-medium">选币逻辑</td>
                          <td className="py-2 px-3">托24h涨幅+成交额综合排序，选前3只</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h4 className="text-base font-bold text-red-400 mb-3">🇨🇳 A股模拟投资</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(0,212,255,0.15)]">
                          <th className="text-left py-2 px-3 text-red-400 font-bold">参数</th>
                          <th className="text-left py-2 px-3 text-red-400 font-bold">设置</th>
                        </tr>
                      </thead>
                      <tbody className="text-foreground/80">
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2 px-3 font-medium">初始本金</td>
                          <td className="py-2 px-3">¥1,000,000 人民币</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2 px-3 font-medium">调仓频率</td>
                          <td className="py-2 px-3">每天上午9:00（北京时间）自动调仓</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2 px-3 font-medium">选股逻辑</td>
                          <td className="py-2 px-3">严格从核心推荐Top10中选股，体现模型选股准确性和推荐有效性</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2 px-3 font-medium">盈亏统计</td>
                          <td className="py-2 px-3">周度统计：周一9:00起点 → 周五15:00结束，下周一重新计算</td>
                        </tr>
                        <tr className="border-b border-[rgba(0,212,255,0.06)]">
                          <td className="py-2 px-3 font-medium">展示内容</td>
                          <td className="py-2 px-3">总资产、盈亏率、周度盈亏、持仓明细、交易记录、资产曲线</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signal System */}
                <div>
                  <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-3">
                    <Zap size={20} /> 信号系统
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { signal: '买入', color: '#00e676', condition: '评分≥80 且 涨幅>0', desc: '综合评分极高，趋势向好' },
                      { signal: '加仓', color: '#00d4ff', condition: '评分≥65 且 跌幅<1%', desc: '评分较高，适合逐步建仓' },
                      { signal: '持有', color: '#f0b429', condition: '评分≥45', desc: '评分中等，维持现有仓位' },
                      { signal: '减仓', color: '#ff3b3b', condition: '评分<45', desc: '评分偏低，建议降低仓位' },
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-lg border" style={{ borderColor: `${item.color}33`, backgroundColor: `${item.color}08` }}>
                        <div className="text-base font-bold mb-1" style={{ color: item.color }}>{item.signal}</div>
                        <div className="text-xs text-foreground/60 mb-1">{item.condition}</div>
                        <div className="text-sm text-foreground/70">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-3">
                    <Layers size={20} /> 策略标签体系
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(0,212,255,0.15)]">
                          <th className="text-left py-2 px-3 text-red-400 font-bold">标签</th>
                          <th className="text-left py-2 px-3 text-red-400 font-bold">触发条件</th>
                          <th className="text-left py-2 px-3 text-red-400 font-bold">含义</th>
                        </tr>
                      </thead>
                      <tbody className="text-foreground/80">
                        {[
                          { tag: '低估值', condition: 'PE < 15', meaning: '市盈率低于市场平均，可能被低估' },
                          { tag: '破净', condition: 'PB < 1.5', meaning: '股价低于或接近每股净资产' },
                          { tag: '高股息', condition: '股息率 ≥ 4%', meaning: '分红收益率高于市场平均' },
                          { tag: '稳定分红', condition: '股息率 ≥ 2%', meaning: '有稳定的分红记录' },
                          { tag: '主力流入', condition: '资金净流入 > 3亿', meaning: '近期有大量资金流入' },
                          { tag: '主力流出', condition: '资金净流出 > 3亿', meaning: '近期有大量资金流出' },
                          { tag: '超卖反弹', condition: 'RSI < 30', meaning: '技术指标显示超卖，可能反弹' },
                          { tag: '强势', condition: 'RSI > 70', meaning: '技术指标显示强势运行' },
                          { tag: '多头排列', condition: '价格>MA20 且 MA5>MA20', meaning: '均线呈多头排列，趋势向上' },
                          { tag: '放量上涨', condition: '涨幅 > 3%', meaning: '当日涨幅较大，伴随放量' },
                          { tag: '创新高', condition: '价格 ≥ 52周高点×95%', meaning: '接近或突破52周新高' },
                          { tag: '底部区域', condition: '价格 ≤ 52周低点×110%', meaning: '接近52周低点，可能在底部' },
                        ].map((item, i) => (
                          <tr key={i} className="border-b border-[rgba(0,212,255,0.06)]">
                            <td className="py-2 px-3 font-bold text-[#00d4ff]">{item.tag}</td>
                            <td className="py-2 px-3 font-mono text-foreground/60">{item.condition}</td>
                            <td className="py-2 px-3">{item.meaning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Market Coverage */}
                <div>
                  <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-3">
                    <Target size={20} /> 市场覆盖范围
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { market: '🇨🇳 A股', count: '300只', examples: '沪深300全覆盖：招商银行、贵州茅台、宁德时代、比亚迪等（新浪API）', sectors: '银行、白酒、新能源、医药、科技、消费' },
                      { market: '🇭🇰 港股', count: '82只', examples: '恒生指数成分股：腾讯、阿里、美团、小米、平安等', sectors: '互联网、金融、消费、医药、地产' },
                      { market: '🇺🇸 美股', count: '99只', examples: 'NASDAQ-100：Apple、Microsoft、NVIDIA、Tesla等', sectors: '科技、半导体、支付、医药、消费' },
                      { market: '₿ 加密', count: '30+21只', examples: '策略引擎30只 + 投资看板21只空气币/永续合约', sectors: '主流币、DeFi、Layer2、永续合约、Binance Alpha' },
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-lg border border-[rgba(0,212,255,0.12)] bg-[rgba(0,212,255,0.03)]">
                        <div className="text-base font-bold text-foreground mb-1">{item.market}</div>
                        <div className="text-sm text-red-400 font-bold mb-1">{item.count}候选标的</div>
                        <div className="text-xs text-foreground/60 mb-1">{item.examples}</div>
                        <div className="text-xs text-foreground/40">覆盖: {item.sectors}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin & Permission */}
                <div>
                  <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-3">
                    <Users size={20} /> 管理员权限系统
                  </h3>
                  <p className="text-base text-foreground/80 leading-relaxed mb-4">
                    管理员后台提供完整的用户管理和权限控制功能，支持对投资看板的访问权限进行精细化管理。
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { title: '用户统计概览', desc: '总用户数、管理员数、已授权/已过期/未授权用户统计' },
                      { title: '投资看板权限管理', desc: '单用户/批量开通或关闭投资看板访问权限，设置到期时间' },
                      { title: '时间期限控制', desc: '支持7天/30天/90天/1年/永久等多种期限选项' },
                      { title: '用户角色管理', desc: '管理员/普通用户角色切换，管理员自动拥有所有权限' },
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-lg border border-[rgba(0,212,255,0.12)] bg-[rgba(0,212,255,0.03)]">
                        <div className="text-sm font-bold text-foreground mb-1">{item.title}</div>
                        <div className="text-xs text-foreground/60">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Warning */}
                <div>
                  <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-3">
                    <AlertTriangle size={20} /> 风险提示
                  </h3>
                  <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                    <ul className="space-y-2 text-base text-foreground/80">
                      <li>• 本平台所有数据、分析和推荐<strong>仅供参考</strong>，不构成任何投资建议</li>
                      <li>• 策略引擎基于历史数据和技术指标，<strong>无法预测未来市场走势</strong></li>
                      <li>• 模拟投资系统仅为展示用途，不代表真实投资收益</li>
                      <li>• 永续合约风险极高，请严格控制仓位和止损</li>
                      <li>• 投资有风险，入市需谨慎，请根据自身风险承受能力做出投资决策</li>
                      <li>• 数据来源于第三方API（Yahoo Finance、CoinGecko），可能存在延迟或误差</li>
                      <li>• 过往业绩不代表未来表现，任何投资都可能导致本金损失</li>
                    </ul>
                  </div>
                </div>
              </div>
            </HudPanel>
          </motion.div>

          {/* PDF Download */}
          <motion.div variants={itemVariants}>
            <HudPanel title="下载数据模型说明文档">
              <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
                <BookOpen size={48} className="text-red-400 shrink-0" />
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-bold text-foreground mb-1">HUNTER ALPHA 数据模型说明 v2.0 (PDF)</h3>
                  <p className="text-sm text-foreground/60">
                    包含完整的平台介绍、数据来源、策略引擎架构、评分模型、投资看板、模拟投资系统和权限系统说明
                  </p>
                </div>
                {isAuthenticated ? (
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-base hover:bg-red-500/30 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Download size={18} />
                    {downloading ? '生成中...' : '下载 PDF'}
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <Lock size={18} className="text-red-500" />
                    <span className="text-sm text-red-500">注册用户可下载</span>
                    <a
                      href={getLoginUrl()}
                      className="px-4 py-2 text-sm font-medium bg-red-500/20 border border-red-500/30 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                    >
                      登录
                    </a>
                  </div>
                )}
              </div>
            </HudPanel>
          </motion.div>

          {/* Footer */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between py-3 border-t border-[rgba(0,212,255,0.08)]">
              <span className="text-xs text-red-400/60 font-mono">HUNTER ALPHA v2.0 — AI选股指南</span>
              <span className="text-xs text-red-400/60">数据仅供参考，不构成投资建议</span>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

// PDF HTML content generator (v2.0)
function getPDFHTML(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>HUNTER ALPHA 数据模型说明 v3.0</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; color: #333; line-height: 1.8; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 28px; color: #c0392b; text-align: center; margin-bottom: 8px; }
    h2 { font-size: 20px; color: #c0392b; margin-top: 30px; margin-bottom: 12px; border-bottom: 2px solid #e74c3c; padding-bottom: 6px; }
    h3 { font-size: 16px; color: #333; margin-top: 16px; margin-bottom: 8px; }
    p { margin-bottom: 12px; font-size: 14px; }
    .subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th { background: #f8f8f8; color: #c0392b; text-align: left; padding: 8px 10px; border: 1px solid #ddd; font-weight: bold; }
    td { padding: 8px 10px; border: 1px solid #ddd; }
    tr:nth-child(even) { background: #fafafa; }
    .warning { background: #fff5f5; border: 1px solid #e74c3c; border-radius: 6px; padding: 16px; margin-top: 20px; }
    .warning p { color: #c0392b; margin-bottom: 6px; }
    .flow-step { display: inline-block; background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; padding: 4px 12px; margin: 4px; font-size: 13px; }
    .flow-arrow { color: #c0392b; margin: 0 4px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>HUNTER ALPHA 数据模型说明</h1>
  <p class="subtitle">猎手阿尔法 · AI选股指南 — 技术文档 v3.0</p>

  <h2>一、平台简介</h2>
  <p>HUNTER ALPHA（猎手阿尔法）是一个基于人工智能和量化分析的全球投资筛选与推荐平台。系统覆盖A股（沪深300全覆盖，新浪财经API）、港股（82只恒生指数成分股）、美股（99只NASDAQ-100）、加密货币四大市场，共511只候选标的。</p>
  <p>v3.0版本新增：A股数据切换至新浪财经API（实时准确）、A股模拟投资系统（¥100万本金，从核心推荐Top10选股，周度盈亏统计）、加密货币数据刷新频率提升至5分钟、热力图增强（默认8板块+展开按钮+个股详情）、舆情摘要分市场定制。</p>

  <h2>二、数据来源</h2>
  <table>
    <tr><th>数据类型</th><th>来源</th><th>更新频率</th><th>说明</th></tr>
    <tr><td>A股实时行情</td><td>新浪财经 API (hq.sinajs.cn)</td><td>30秒</td><td>沪深300指数+个股价格、涨跌幅、成交量</td></tr>
    <tr><td>港股/美股行情</td><td>Yahoo Finance v8 Chart API</td><td>30秒</td><td>恒生指数82只 + NASDAQ-100 99只</td></tr>
    <tr><td>技术指标</td><td>自研计算引擎</td><td>5分钟</td><td>MA5/MA20、RSI14、MACD</td></tr>
    <tr><td>基本面数据</td><td>预设+API补充</td><td>定期更新</td><td>PE/PB/股息率/市值</td></tr>
    <tr><td>资金流向</td><td>成交量分析推算</td><td>5分钟</td><td>基于量价关系推算</td></tr>
    <tr><td>加密货币行情</td><td>CoinGecko API</td><td>5分钟</td><td>主流币+空气币价格、市值、K线</td></tr>
    <tr><td>BTC主导率</td><td>CoinGecko Global API</td><td>5分钟</td><td>用于生成投资建议</td></tr>
    <tr><td>AI分析</td><td>LLM大语言模型</td><td>15分钟</td><td>智能市场分析摘要</td></tr>
  </table>

  <h2>三、策略引擎架构</h2>
  <p>策略引擎每5分钟自动运行，覆盖A股(300只沪深300，新浪API)、港股(82只恒生指数)、美股(99只NASDAQ-100)、加密货币(30只)共511只候选标的。A股Top10推荐基于前一日收盘行情评分，当日开盘前发布。</p>
  <p>
    <span class="flow-step">1.数据采集</span><span class="flow-arrow">→</span>
    <span class="flow-step">2.指标计算</span><span class="flow-arrow">→</span>
    <span class="flow-step">3.多维评分</span><span class="flow-arrow">→</span>
    <span class="flow-step">4.排序筛选</span><span class="flow-arrow">→</span>
    <span class="flow-step">5.理由生成</span>
  </p>

  <h2>四、评分模型详解</h2>
  <p>每只候选股票通过6个维度进行综合评分，基础分50分，最终得分范围10~99分。</p>
  <table>
    <tr><th>维度</th><th>权重</th><th>评分规则</th><th>分值范围</th></tr>
    <tr><td>估值评分(PE/PB)</td><td>30%</td><td>PE&lt;10:+15, PE&lt;15:+12, PE&lt;20:+8; PB&lt;1:+8</td><td>-8~+23</td></tr>
    <tr><td>股息率评分</td><td>15%</td><td>≥5%:+10, ≥4%:+8, ≥3%:+6, ≥2%:+4</td><td>0~+10</td></tr>
    <tr><td>资金流向评分</td><td>15%</td><td>净流入&gt;5亿:+8, &gt;2亿:+5; 净流出&gt;5亿:-5</td><td>-5~+8</td></tr>
    <tr><td>技术面评分</td><td>20%</td><td>价格&gt;MA20:+5; RSI超卖:+6, 正常:+4</td><td>-7~+11</td></tr>
    <tr><td>动量评分</td><td>10%</td><td>涨幅&gt;3%:+5, &gt;1%:+3; 跌幅&gt;3%:-3</td><td>-3~+5</td></tr>
    <tr><td>52周位置评分</td><td>10%</td><td>接近低点(&lt;30%):+5; 接近高点(&gt;90%):-2</td><td>-2~+5</td></tr>
  </table>

  <h2>五、数字货币投资看板</h2>
  <p>独立的数字货币投资看板，对比主流币蓝筹和空气币永续合约，基于BTC主导率自动生成投资建议。</p>
  <table>
    <tr><th>BTC主导率</th><th>阶段</th><th>建议</th></tr>
    <tr><td>&gt;60%</td><td>防御期</td><td>BTC/ETH为主，远离空气币</td></tr>
    <tr><td>50%~60%</td><td>过渡期</td><td>主流持仓为主 + 小仓位试水空气永续</td></tr>
    <tr><td>40%~50%</td><td>山寨季</td><td>加大山寨币仓位，空气永续可适当加仓</td></tr>
    <tr><td>&lt;40%</td><td>空气季</td><td>空气币全面爆发，但需警惕见顶风险</td></tr>
  </table>

  <h2>六、模拟投资系统</h2>
  <p>平台提供两套独立的模拟投资系统，分别覆盖加密货币和A股市场，均基于平台策略模型自动调仓。</p>
  <h3>加密货币模拟投资</h3>
  <table>
    <tr><th>参数</th><th>设置</th></tr>
    <tr><td>初始本金</td><td>$10,000 USD</td></tr>
    <tr><td>调仓频率</td><td>每天2次（06:00 / 22:00 北京时间）</td></tr>
    <tr><td>仓位策略</td><td>根据BTC主导率4档策略自动分配</td></tr>
    <tr><td>选币逻辑</td><td>托24h涨幅+成交额综合排序，选前3只</td></tr>
  </table>
  <h3>🇨🇳 A股模拟投资</h3>
  <table>
    <tr><th>参数</th><th>设置</th></tr>
    <tr><td>初始本金</td><td>¥1,000,000 人民币</td></tr>
    <tr><td>调仓频率</td><td>每天上午9:00（北京时间）自动调仓</td></tr>
    <tr><td>选股逻辑</td><td>严格从核心推荐Top10中选股，体现模型选股准确性</td></tr>
    <tr><td>盈亏统计</td><td>周度统计：周一9:00起点 → 周五15:00结束，下周一重新计算</td></tr>
    <tr><td>展示内容</td><td>总资产、盈亏率、周度盈亏、持仓明细、交易记录、资产曲线</td></tr>
  </table>

  <h2>七、信号系统</h2>
  <table>
    <tr><th>信号</th><th>条件</th><th>含义</th></tr>
    <tr><td style="color:#00a854;font-weight:bold">买入</td><td>评分≥80 且 涨幅&gt;0</td><td>综合评分极高，趋势向好</td></tr>
    <tr><td style="color:#0088cc;font-weight:bold">加仓</td><td>评分≥65 且 跌幅&lt;1%</td><td>评分较高，适合逐步建仓</td></tr>
    <tr><td style="color:#d4a017;font-weight:bold">持有</td><td>评分≥45</td><td>评分中等，维持现有仓位</td></tr>
    <tr><td style="color:#cc0000;font-weight:bold">减仓</td><td>评分&lt;45</td><td>评分偏低，建议降低仓位</td></tr>
  </table>

  <h2>八、市场覆盖范围</h2>
  <table>
    <tr><th>市场</th><th>候选数</th><th>数据来源</th><th>代表标的</th><th>覆盖行业</th></tr>
    <tr><td>🇨🇳 A股</td><td>300只</td><td>新浪财经 API</td><td>沪深300全覆盖：招商银行、贵州茅台、宁德时代等</td><td>银行、白酒、新能源、医药、科技</td></tr>
    <tr><td>🇭🇰 港股</td><td>82只</td><td>Yahoo Finance</td><td>恒生指数成分股：腾讯、阿里、美团、小米等</td><td>互联网、金融、消费、医药</td></tr>
    <tr><td>🇺🇸 美股</td><td>99只</td><td>Yahoo Finance</td><td>NASDAQ-100：Apple、Microsoft、NVIDIA、Tesla等</td><td>科技、半导体、支付、医药</td></tr>
    <tr><td>₿ 加密</td><td>30+21只</td><td>CoinGecko</td><td>BTC、ETH、BNB + TRUMP、WLD、WLFI、AIA、XAU等</td><td>主流币、DeFi、永续合约、Binance Alpha</td></tr>
  </table>

  <h2>九、风险提示</h2>
  <div class="warning">
    <p>• 本平台所有数据、分析和推荐仅供参考，不构成任何投资建议</p>
    <p>• 策略引擎基于历史数据和技术指标，无法预测未来市场走势</p>
    <p>• 模拟投资系统仅为展示用途，不代表真实投资收益</p>
    <p>• 永续合约风险极高，请严格控制仓位和止损</p>
    <p>• 投资有风险，入市需谨慎，请根据自身风险承受能力做出投资决策</p>
    <p>• 数据来源于第三方API，可能存在延迟或误差，请以交易所官方数据为准</p>
    <p>• 过往业绩不代表未来表现，任何投资都可能导致本金损失</p>
  </div>

  <div class="footer">
    <p>HUNTER ALPHA v3.0 — AI选股指南 · 数据模型说明文档</p>
    <p>生成时间: ${new Date().toLocaleDateString('zh-CN')} | 数据仅供参考，不构成投资建议</p>
  </div>
</body>
</html>`;
}

export default function About() {
  return (
    <AppProvider>
      <AboutContent />
    </AppProvider>
  );
}
