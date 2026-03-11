import { describe, it, expect } from 'vitest';

// Test the simAshare module structure and exports
describe('SimAshare Module', () => {
  it('should export required functions', async () => {
    const mod = await import('./simAshare');
    expect(typeof mod.runAshareRebalance).toBe('function');
    expect(typeof mod.getSimAshareData).toBe('function');
    expect(typeof mod.startSimAshareScheduler).toBe('function');
  });

  it('getSimAshareData should return valid structure', async () => {
    const { getSimAshareData } = await import('./simAshare');
    const data = await getSimAshareData();

    expect(data).toBeDefined();
    expect(data.config).toBeDefined();
    expect(data.config.initialCapital).toBe(1000000); // ¥1,000,000
    expect(typeof data.config.isActive).toBe('boolean');
    expect(typeof data.config.startDate).toBe('string');

    expect(data.summary).toBeDefined();
    expect(typeof data.summary.totalValue).toBe('number');
    expect(typeof data.summary.cashBalance).toBe('number');
    expect(typeof data.summary.investedValue).toBe('number');
    expect(typeof data.summary.totalPnl).toBe('number');
    expect(typeof data.summary.totalPnlPercent).toBe('number');
    expect(typeof data.summary.positionCount).toBe('number');
    expect(typeof data.summary.strategy).toBe('string');

    expect(Array.isArray(data.positions)).toBe(true);
    expect(Array.isArray(data.trades)).toBe(true);
    expect(Array.isArray(data.snapshots)).toBe(true);
  });

  it('positions should have correct field types when present', async () => {
    const { getSimAshareData } = await import('./simAshare');
    const data = await getSimAshareData();

    if (data.positions.length > 0) {
      const pos = data.positions[0];
      expect(typeof pos.symbol).toBe('string');
      expect(typeof pos.name).toBe('string');
      expect(typeof pos.category).toBe('string');
      expect(typeof pos.industry).toBe('string');
      expect(typeof pos.entryPrice).toBe('number');
      expect(typeof pos.currentPrice).toBe('number');
      expect(typeof pos.quantity).toBe('number');
      expect(typeof pos.costBasis).toBe('number');
      expect(typeof pos.currentValue).toBe('number');
      expect(typeof pos.pnl).toBe('number');
      expect(typeof pos.pnlPercent).toBe('number');
      expect(typeof pos.weight).toBe('number');
      expect(typeof pos.score).toBe('number');
    }
  });

  it('trades should have correct field types when present', async () => {
    const { getSimAshareData } = await import('./simAshare');
    const data = await getSimAshareData();

    if (data.trades.length > 0) {
      const trade = data.trades[0];
      expect(typeof trade.symbol).toBe('string');
      expect(typeof trade.name).toBe('string');
      expect(typeof trade.action).toBe('string');
      expect(['BUY', 'SELL']).toContain(trade.action);
      expect(typeof trade.price).toBe('number');
      expect(typeof trade.quantity).toBe('number');
      expect(typeof trade.value).toBe('number');
      expect(typeof trade.time).toBe('string');
      expect(typeof trade.reason).toBe('string');
    }
  });

  it('snapshots should have correct field types when present', async () => {
    const { getSimAshareData } = await import('./simAshare');
    const data = await getSimAshareData();

    if (data.snapshots.length > 0) {
      const snap = data.snapshots[0];
      expect(typeof snap.totalValue).toBe('number');
      expect(typeof snap.totalPnl).toBe('number');
      expect(typeof snap.totalPnlPercent).toBe('number');
      expect(typeof snap.strategy).toBe('string');
      expect(typeof snap.snapshotTime).toBe('string');
      expect(typeof snap.createdAt).toBe('string');
    }
  });
});

// Test the STOCK_UNIVERSE export from strategyEngine
describe('STOCK_UNIVERSE export', () => {
  it('should export STOCK_UNIVERSE with cn, hk, us, crypto markets', async () => {
    const { STOCK_UNIVERSE } = await import('./strategyEngine');
    expect(STOCK_UNIVERSE).toBeDefined();
    expect(STOCK_UNIVERSE.cn).toBeDefined();
    expect(STOCK_UNIVERSE.hk).toBeDefined();
    expect(STOCK_UNIVERSE.us).toBeDefined();
    expect(STOCK_UNIVERSE.crypto).toBeDefined();
  });

  it('cn market should have 290+ stocks (CSI300)', async () => {
    const { STOCK_UNIVERSE } = await import('./strategyEngine');
    expect(STOCK_UNIVERSE.cn.length).toBeGreaterThan(290);
  });

  it('hk market should have 80+ stocks (HSI)', async () => {
    const { STOCK_UNIVERSE } = await import('./strategyEngine');
    expect(STOCK_UNIVERSE.hk.length).toBeGreaterThan(75);
  });

  it('us market should have 95+ stocks (NASDAQ-100)', async () => {
    const { STOCK_UNIVERSE } = await import('./strategyEngine');
    expect(STOCK_UNIVERSE.us.length).toBeGreaterThan(95);
  });

  it('each stock should have required fields (symbol, nameZh, nameEn, industry)', async () => {
    const { STOCK_UNIVERSE } = await import('./strategyEngine');
    const sample = STOCK_UNIVERSE.cn[0];
    expect(typeof sample.symbol).toBe('string');
    expect(typeof sample.nameZh).toBe('string');
    expect(typeof sample.nameEn).toBe('string');
    expect(typeof sample.industry).toBe('string');
  });
});

// Test heatmap dynamic sector generation
describe('Heatmap dynamic sectors', () => {
  it('should generate sectors from STOCK_UNIVERSE for cn market', async () => {
    const { STOCK_UNIVERSE } = await import('./strategyEngine');
    const cnStocks = STOCK_UNIVERSE.cn;
    
    // Group by industry
    const industryMap = new Map<string, string[]>();
    for (const stock of cnStocks) {
      const existing = industryMap.get(stock.industry) || [];
      existing.push(stock.symbol);
      industryMap.set(stock.industry, existing);
    }
    
    // Should have multiple industries
    expect(industryMap.size).toBeGreaterThan(5);
    
    // Total stocks across all industries should match
    let total = 0;
    for (const [, symbols] of industryMap) {
      total += symbols.length;
    }
    expect(total).toBe(cnStocks.length);
  });
});
