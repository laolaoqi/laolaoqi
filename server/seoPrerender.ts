/**
 * SEO Prerender Middleware
 * 
 * Detects search engine crawlers (Googlebot, Baiduspider, Bingbot, etc.)
 * and returns a server-rendered HTML snapshot with full meta tags,
 * structured data, and semantic content for better indexing.
 * 
 * For regular users, the request passes through to the SPA.
 */

import { Request, Response, NextFunction } from 'express';

// Known search engine bot User-Agent patterns
const BOT_UA_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,           // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /sogou/i,
  /exabot/i,
  /facebot/i,         // Facebook
  /facebookexternalhit/i,
  /ia_archiver/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /applebot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,        // Huawei
  /bytespider/i,      // ByteDance
  /360spider/i,
];

function isBot(ua: string): boolean {
  return BOT_UA_PATTERNS.some(pattern => pattern.test(ua));
}

// OG image URL
const OG_IMAGE = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663244547938/BrShWaGSPDGvDoGc.png';
const SITE_URL = 'https://www.llq555.com';

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  h1: string;
  content: string;
  jsonLd?: object;
}

function getPageMeta(path: string): PageMeta {
  // Homepage
  if (path === '/' || path === '') {
    return {
      title: '猎手阿尔法 HUNTER ALPHA - AI智能选股平台 | A股·港股·美股·数字货币实时行情与策略分析',
      description: '猎手阿尔法（Hunter Alpha）是AI驱动的智能选股平台，覆盖A股沪深300、港股、美股及数字货币市场。提供多因子策略分析、恐惧贪婪指数、行业热力图、AI核心推荐TOP10、风控建议与模拟投资实盘。',
      canonical: `${SITE_URL}/`,
      h1: '猎手阿尔法 HUNTER ALPHA - AI智能选股平台',
      content: `
        <section>
          <h2>多市场覆盖</h2>
          <p>猎手阿尔法覆盖A股沪深300、港股恒生指数、美股纳斯达克及数字货币市场，为投资者提供全方位的市场洞察。</p>
        </section>
        <section>
          <h2>AI多因子策略分析</h2>
          <p>基于技术面、基本面、资金流向等多维度因子，运用AI算法生成每日核心推荐TOP10标的，涵盖进攻、防御、震荡三大模式。</p>
        </section>
        <section>
          <h2>恐惧贪婪指数</h2>
          <p>实时监测市场情绪，通过恐惧贪婪指数帮助投资者判断市场极端状态，辅助择时决策。</p>
        </section>
        <section>
          <h2>行业板块热力图</h2>
          <p>直观展示各行业板块的涨跌热度，快速定位市场热点与资金流向。</p>
        </section>
        <section>
          <h2>风险控制建议</h2>
          <p>根据市场状态动态生成仓位建议、止损策略和风险预警，帮助投资者控制回撤。</p>
        </section>
        <section>
          <h2>模拟投资实盘</h2>
          <p>提供数字货币模拟投资组合功能，基于AI策略自动调仓，验证投资理念。</p>
        </section>
      `,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "猎手阿尔法 HUNTER ALPHA",
        "url": `${SITE_URL}/`,
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web Browser",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "CNY" },
        "featureList": [
          "A股沪深300实时行情分析", "港股实时行情分析", "美股实时行情分析",
          "数字货币投资看板", "AI多因子策略推荐TOP10", "恐惧贪婪指数",
          "行业板块热力图", "市场情绪分析", "风险控制建议", "模拟投资实盘"
        ]
      }
    };
  }

  // Crypto Investment
  if (path === '/crypto-investment') {
    return {
      title: '数字货币投资看板 - 猎手阿尔法 | 主流币 vs 空气币永续合约',
      description: '猎手阿尔法数字货币投资看板，实时跟踪BTC、ETH等主流币与Meme币永续合约行情，提供AI投资建议与模拟投资实盘。',
      canonical: `${SITE_URL}/crypto-investment`,
      h1: '数字货币投资看板 - 主流币 vs Meme币永续合约',
      content: `
        <section>
          <h2>主流币实时行情</h2>
          <p>跟踪Bitcoin(BTC)、Ethereum(ETH)、BNB、Solana(SOL)等主流数字货币的实时价格、24小时涨跌幅、市值与成交量。</p>
        </section>
        <section>
          <h2>Meme币永续合约</h2>
          <p>监控DOGE、SHIB、PEPE、WIF等热门Meme币的永续合约行情，捕捉短线交易机会。</p>
        </section>
        <section>
          <h2>AI投资建议</h2>
          <p>基于BTC主导率、市场情绪和技术指标，生成数字货币投资策略建议，包含仓位分配和风险评估。</p>
        </section>
        <section>
          <h2>模拟投资组合</h2>
          <p>提供虚拟资金模拟投资功能，验证AI策略的实际表现，无风险体验投资过程。</p>
        </section>
      `,
    };
  }

  // About
  if (path === '/about') {
    return {
      title: '关于我们 - 猎手阿尔法 HUNTER ALPHA | 数据模型说明',
      description: '了解猎手阿尔法的AI多因子选股模型、数据来源、策略算法、风控体系与权限系统设计。',
      canonical: `${SITE_URL}/about`,
      h1: '关于猎手阿尔法 - 数据模型与策略说明',
      content: `
        <section>
          <h2>AI多因子选股模型</h2>
          <p>猎手阿尔法采用多因子量化模型，综合技术面（均线、MACD、RSI）、基本面（PE、PB、ROE）和资金面（主力资金流向、北向资金）等指标进行综合评分。</p>
        </section>
        <section>
          <h2>数据来源</h2>
          <p>市场数据来源于Yahoo Finance、CoinGecko等权威数据提供商，确保数据的及时性和准确性。</p>
        </section>
        <section>
          <h2>策略模式</h2>
          <p>系统支持三大策略模式：进攻模式（高Beta成长股）、防御模式（低波动价值股）和震荡模式（均衡配置），根据市场状态自动切换。</p>
        </section>
        <section>
          <h2>风控体系</h2>
          <p>内置多层风控机制，包括个股集中度限制、行业暴露控制、最大回撤预警和动态止损策略。</p>
        </section>
        <section>
          <h2>免责声明</h2>
          <p>本平台提供的所有数据和建议仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。</p>
        </section>
      `,
    };
  }

  // Stock detail pages
  const stockMatch = path.match(/^\/stock\/(.+)$/);
  if (stockMatch) {
    const symbol = decodeURIComponent(stockMatch[1]);
    return {
      title: `${symbol} - 个股详情与技术分析 | 猎手阿尔法`,
      description: `查看${symbol}的实时行情、K线图、技术指标与基本面数据分析。猎手阿尔法AI智能选股平台。`,
      canonical: `${SITE_URL}/stock/${encodeURIComponent(symbol)}`,
      h1: `${symbol} - 个股详情与技术分析`,
      content: `
        <section>
          <h2>${symbol} 实时行情</h2>
          <p>查看${symbol}的最新价格、涨跌幅、成交量等实时行情数据。</p>
        </section>
        <section>
          <h2>K线图与技术指标</h2>
          <p>${symbol}的日K线图，包含均线、MACD、RSI等技术分析指标。</p>
        </section>
        <section>
          <h2>基本面数据</h2>
          <p>${symbol}的市盈率、市净率、总市值等基本面数据分析。</p>
        </section>
      `,
    };
  }

  // Default 404
  return {
    title: '页面未找到 - 猎手阿尔法 HUNTER ALPHA',
    description: '您访问的页面不存在。请返回猎手阿尔法首页查看AI智能选股平台。',
    canonical: `${SITE_URL}/`,
    h1: '页面未找到',
    content: '<p>您访问的页面不存在。<a href="/">返回首页</a></p>',
  };
}

function renderPrerenderedHTML(meta: PageMeta): string {
  const jsonLdScript = meta.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5">
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description}">
  <meta name="keywords" content="AI选股,智能选股,股票推荐,A股分析,港股分析,美股分析,数字货币,实时行情,策略分析,风控建议,猎手阿尔法,Hunter Alpha">
  <meta name="author" content="猎手阿尔法 Hunter Alpha">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="${meta.canonical}">

  <!-- Hreflang -->
  <link rel="alternate" hreflang="zh-CN" href="${meta.canonical}">
  <link rel="alternate" hreflang="en" href="${meta.canonical}">
  <link rel="alternate" hreflang="x-default" href="${meta.canonical}">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${meta.canonical}">
  <meta property="og:title" content="${meta.title}">
  <meta property="og:description" content="${meta.description}">
  <meta property="og:image" content="${OG_IMAGE}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="猎手阿尔法 HUNTER ALPHA">
  <meta property="og:locale" content="zh_CN">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${meta.title}">
  <meta name="twitter:description" content="${meta.description}">
  <meta name="twitter:image" content="${OG_IMAGE}">

  <!-- Favicon -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#0a0e17">

  ${jsonLdScript}
</head>
<body>
  <header>
    <nav aria-label="主导航">
      <a href="/" title="猎手阿尔法首页">HUNTER ALPHA 猎手阿尔法</a>
      <ul>
        <li><a href="/">A股</a></li>
        <li><a href="/">港股</a></li>
        <li><a href="/">美股</a></li>
        <li><a href="/crypto-investment">数字货币投资看板</a></li>
        <li><a href="/about">关于我们</a></li>
      </ul>
    </nav>
  </header>
  <main>
    <article>
      <h1>${meta.h1}</h1>
      ${meta.content}
    </article>
  </main>
  <footer>
    <p>猎手阿尔法 HUNTER ALPHA &copy; ${new Date().getFullYear()} — AI驱动的智能选股平台</p>
    <p>数据仅供参考，不构成投资建议。投资有风险，入市需谨慎。</p>
    <nav aria-label="页脚导航">
      <a href="/">首页</a> |
      <a href="/crypto-investment">数字货币投资看板</a> |
      <a href="/about">关于我们</a>
    </nav>
  </footer>
</body>
</html>`;
}

/**
 * Express middleware: intercepts requests from search engine bots
 * and returns a pre-rendered HTML snapshot for better SEO indexing.
 */
export function seoPrerender(req: Request, res: Response, next: NextFunction): void {
  const ua = req.headers['user-agent'] || '';

  // Only intercept for bots
  if (!isBot(ua)) {
    return next();
  }

  // Only intercept HTML page requests (not API, assets, etc.)
  const path = req.path;
  if (
    path.startsWith('/api/') ||
    path.startsWith('/src/') ||
    path.startsWith('/node_modules/') ||
    path.startsWith('/@') ||
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json|xml|txt|webmanifest)$/i.test(path)
  ) {
    return next();
  }

  // Generate and return pre-rendered HTML
  const meta = getPageMeta(path);
  const html = renderPrerenderedHTML(meta);

  res.status(200)
    .set({
      'Content-Type': 'text/html; charset=utf-8',
      'X-Prerendered': 'true',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    })
    .send(html);
}
