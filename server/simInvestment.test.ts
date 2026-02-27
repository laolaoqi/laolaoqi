import { describe, it, expect } from 'vitest';

// Test the simInvestment module structure and exports
describe('SimInvestment Module', () => {
  it('should export required functions', async () => {
    const mod = await import('./simInvestment');
    expect(typeof mod.runSimRebalance).toBe('function');
    expect(typeof mod.getSimPortfolioData).toBe('function');
    expect(typeof mod.startSimInvestmentScheduler).toBe('function');
    expect(typeof mod.getPnlStats).toBe('function');
  });

  it('getSimPortfolioData should return valid structure', async () => {
    const { getSimPortfolioData } = await import('./simInvestment');
    const data = await getSimPortfolioData();

    expect(data).toBeDefined();
    expect(data.config).toBeDefined();
    expect(data.config.initialCapital).toBe(100_000);
    expect(typeof data.config.isActive).toBe('boolean');
    expect(typeof data.config.startDate).toBe('string');

    expect(data.summary).toBeDefined();
    expect(typeof data.summary.totalValue).toBe('number');
    expect(typeof data.summary.cashBalance).toBe('number');
    expect(typeof data.summary.investedValue).toBe('number');
    expect(typeof data.summary.totalPnl).toBe('number');
    expect(typeof data.summary.totalPnlPercent).toBe('number');
    expect(typeof data.summary.positionCount).toBe('number');

    expect(Array.isArray(data.positions)).toBe(true);
    expect(Array.isArray(data.trades)).toBe(true);
    expect(Array.isArray(data.snapshots)).toBe(true);

    // New: pnlStats should be present
    expect(data.pnlStats).toBeDefined();
    expect(typeof data.pnlStats.todayPnl).toBe('number');
    expect(typeof data.pnlStats.todayPnlPercent).toBe('number');
    expect(typeof data.pnlStats.monthPnl).toBe('number');
    expect(typeof data.pnlStats.monthPnlPercent).toBe('number');
    expect(typeof data.pnlStats.yearPnl).toBe('number');
    expect(typeof data.pnlStats.yearPnlPercent).toBe('number');
    expect(typeof data.pnlStats.totalDays).toBe('number');
    expect(typeof data.pnlStats.profitDays).toBe('number');
    expect(typeof data.pnlStats.lossDays).toBe('number');
    expect(typeof data.pnlStats.winRate).toBe('number');
  });

  it('getPnlStats should return valid structure', async () => {
    const { getPnlStats } = await import('./simInvestment');
    const stats = await getPnlStats();

    expect(stats).toBeDefined();
    expect(typeof stats.todayPnl).toBe('number');
    expect(typeof stats.todayPnlPercent).toBe('number');
    expect(typeof stats.monthPnl).toBe('number');
    expect(typeof stats.monthPnlPercent).toBe('number');
    expect(typeof stats.yearPnl).toBe('number');
    expect(typeof stats.yearPnlPercent).toBe('number');
    expect(typeof stats.totalDays).toBe('number');
    expect(typeof stats.profitDays).toBe('number');
    expect(typeof stats.lossDays).toBe('number');
    expect(typeof stats.winRate).toBe('number');
    // bestDay and worstDay can be null or object
    if (stats.bestDay) {
      expect(typeof stats.bestDay.date).toBe('string');
      expect(typeof stats.bestDay.pnl).toBe('number');
      expect(typeof stats.bestDay.pnlPercent).toBe('number');
    }
    if (stats.worstDay) {
      expect(typeof stats.worstDay.date).toBe('string');
      expect(typeof stats.worstDay.pnl).toBe('number');
      expect(typeof stats.worstDay.pnlPercent).toBe('number');
    }
  });

  it('positions should have correct field types when present', async () => {
    const { getSimPortfolioData } = await import('./simInvestment');
    const data = await getSimPortfolioData();

    if (data.positions.length > 0) {
      const pos = data.positions[0];
      expect(typeof pos.symbol).toBe('string');
      expect(typeof pos.name).toBe('string');
      expect(typeof pos.category).toBe('string');
      expect(typeof pos.entryPrice).toBe('number');
      expect(typeof pos.currentPrice).toBe('number');
      expect(typeof pos.quantity).toBe('number');
      expect(typeof pos.costBasis).toBe('number');
      expect(typeof pos.currentValue).toBe('number');
      expect(typeof pos.pnl).toBe('number');
      expect(typeof pos.pnlPercent).toBe('number');
      expect(typeof pos.weight).toBe('number');
    }
  });

  it('trades should have correct field types when present', async () => {
    const { getSimPortfolioData } = await import('./simInvestment');
    const data = await getSimPortfolioData();

    if (data.trades.length > 0) {
      const trade = data.trades[0];
      expect(typeof trade.symbol).toBe('string');
      expect(typeof trade.action).toBe('string');
      expect(['BUY', 'SELL']).toContain(trade.action);
      expect(typeof trade.price).toBe('number');
      expect(typeof trade.quantity).toBe('number');
      expect(typeof trade.value).toBe('number');
      expect(typeof trade.time).toBe('string');
    }
  });

  it('snapshots should have correct field types when present', async () => {
    const { getSimPortfolioData } = await import('./simInvestment');
    const data = await getSimPortfolioData();

    if (data.snapshots.length > 0) {
      const snap = data.snapshots[0];
      expect(typeof snap.totalValue).toBe('number');
      expect(typeof snap.totalPnl).toBe('number');
      expect(typeof snap.totalPnlPercent).toBe('number');
      expect(typeof snap.snapshotTime).toBe('string');
      expect(typeof snap.createdAt).toBe('string');
    }
  });
});
