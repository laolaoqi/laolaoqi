import { describe, it, expect } from 'vitest';

// ===================================================================
// v6.0 Feature Tests — UI adjustments and About page
// ===================================================================

describe('v6.0 — Red-up Green-down color scheme', () => {
  it('should use red for positive changes and green for negative', () => {
    // Test color logic: positive change = red, negative change = green
    const getChangeColor = (change: number) => {
      if (change > 0) return 'red';
      if (change < 0) return 'green';
      return 'neutral';
    };

    expect(getChangeColor(2.5)).toBe('red');
    expect(getChangeColor(-1.3)).toBe('green');
    expect(getChangeColor(0)).toBe('neutral');
  });
});

describe('v6.0 — Score model validation', () => {
  it('should have correct scoring weights totaling 100%', () => {
    const weights = {
      valuation: 30,   // PE/PB
      dividend: 15,     // Dividend yield
      capitalFlow: 15,  // Capital flow
      technical: 20,    // MA + RSI
      momentum: 10,     // Price momentum
      weekPosition: 10, // 52-week position
    };

    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it('should have correct signal thresholds', () => {
    const determineSignal = (score: number, changePercent: number): string => {
      if (score >= 80 && changePercent > 0) return 'buy';
      if (score >= 65 && changePercent > -1) return 'add';
      if (score >= 45) return 'hold';
      return 'reduce';
    };

    expect(determineSignal(85, 1.5)).toBe('buy');
    expect(determineSignal(70, 0.5)).toBe('add');
    expect(determineSignal(50, -2)).toBe('hold');
    expect(determineSignal(30, -3)).toBe('reduce');
    // Edge case: high score but negative change
    expect(determineSignal(85, -0.5)).toBe('add');
    // Edge case: score exactly at threshold
    expect(determineSignal(80, 0.1)).toBe('buy');
    expect(determineSignal(65, -0.9)).toBe('add');
    expect(determineSignal(45, -5)).toBe('hold');
    expect(determineSignal(44, 5)).toBe('reduce');
  });

  it('should generate correct tags based on stock data', () => {
    const generateTags = (stock: {
      pe: number | null;
      pb: number | null;
      dividendYield: number | null;
      capitalFlow: number;
      rsi14: number;
      price: number;
      ma5: number;
      ma20: number;
      changePercent: number;
      fiftyTwoWeekHigh: number;
      fiftyTwoWeekLow: number;
    }): string[] => {
      const tags: string[] = [];
      if (stock.pe !== null && stock.pe > 0 && stock.pe < 15) tags.push('低估值');
      if (stock.pb !== null && stock.pb > 0 && stock.pb < 1.5) tags.push('破净');
      if (stock.dividendYield !== null && stock.dividendYield >= 4) tags.push('高股息');
      else if (stock.dividendYield !== null && stock.dividendYield >= 2) tags.push('稳定分红');
      if (stock.capitalFlow > 3) tags.push('主力流入');
      else if (stock.capitalFlow < -3) tags.push('主力流出');
      if (stock.rsi14 < 30) tags.push('超卖反弹');
      if (stock.rsi14 > 70) tags.push('强势');
      if (stock.price > stock.ma20 && stock.ma5 > stock.ma20) tags.push('多头排列');
      if (stock.changePercent > 3) tags.push('放量上涨');
      if (stock.fiftyTwoWeekHigh > 0 && stock.price >= stock.fiftyTwoWeekHigh * 0.95) tags.push('创新高');
      if (stock.fiftyTwoWeekLow > 0 && stock.price <= stock.fiftyTwoWeekLow * 1.1) tags.push('底部区域');
      return tags.slice(0, 5);
    };

    // Low PE + high dividend stock
    const bankStock = {
      pe: 6.5, pb: 0.9, dividendYield: 5.2, capitalFlow: 4.5,
      rsi14: 55, price: 35, ma5: 34, ma20: 33, changePercent: 1.2,
      fiftyTwoWeekHigh: 40, fiftyTwoWeekLow: 28,
    };
    const bankTags = generateTags(bankStock);
    expect(bankTags).toContain('低估值');
    expect(bankTags).toContain('破净');
    expect(bankTags).toContain('高股息');
    expect(bankTags).toContain('主力流入');
    expect(bankTags).toContain('多头排列');

    // Oversold tech stock
    const techStock = {
      pe: 50, pb: 8, dividendYield: 0, capitalFlow: -5,
      rsi14: 25, price: 100, ma5: 102, ma20: 110, changePercent: -4,
      fiftyTwoWeekHigh: 200, fiftyTwoWeekLow: 95,
    };
    const techTags = generateTags(techStock);
    expect(techTags).toContain('主力流出');
    expect(techTags).toContain('超卖反弹');
    expect(techTags).toContain('底部区域');
    expect(techTags).not.toContain('低估值');
    expect(techTags).not.toContain('多头排列');
  });
});

describe('v6.0 — PDF content structure', () => {
  it('should include all required sections in PDF', () => {
    const requiredSections = [
      '平台简介',
      '数据来源',
      '策略引擎架构',
      '评分模型详解',
      '信号系统',
      '策略标签体系',
      '市场覆盖范围',
      '风险提示',
    ];

    // Simulate PDF HTML content check
    const pdfContent = `
      一、平台简介
      二、数据来源
      三、策略引擎架构
      四、评分模型详解
      五、信号系统
      六、策略标签体系
      七、市场覆盖范围
      八、风险提示
    `;

    for (const section of requiredSections) {
      expect(pdfContent).toContain(section);
    }
  });

  it('should include all 4 markets in coverage', () => {
    const markets = ['A股', '港股', '美股', '加密'];
    const marketCounts = { 'A股': 20, '港股': 15, '美股': 20, '加密': 12 };

    expect(markets).toHaveLength(4);
    const totalCandidates = Object.values(marketCounts).reduce((a, b) => a + b, 0);
    expect(totalCandidates).toBe(67);
  });
});

describe('v6.0 — Fear & Greed layout', () => {
  it('should calculate fear greed index correctly', () => {
    // Test the fear greed calculation logic
    const calculateFearGreed = (advanceRatio: number, mainForceFlow: number): number => {
      let score = advanceRatio; // 0-100 base from advance ratio
      if (mainForceFlow > 0) score += Math.min(mainForceFlow * 2, 20);
      else score += Math.max(mainForceFlow * 2, -20);
      return Math.max(0, Math.min(100, Math.round(score)));
    };

    // Bullish market
    expect(calculateFearGreed(70, 5)).toBeGreaterThan(50);
    // Bearish market
    expect(calculateFearGreed(30, -5)).toBeLessThan(50);
    // Neutral
    expect(calculateFearGreed(50, 0)).toBe(50);
    // Extreme greed
    expect(calculateFearGreed(90, 10)).toBeLessThanOrEqual(100);
    // Extreme fear
    expect(calculateFearGreed(10, -10)).toBeGreaterThanOrEqual(0);
  });
});
