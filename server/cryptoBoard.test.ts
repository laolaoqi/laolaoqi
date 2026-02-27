import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the module's exported functions
describe('CryptoBoard — Investment Board Backend', () => {

  describe('Module exports', () => {
    it('should export all required functions', async () => {
      const mod = await import('./cryptoBoard');
      expect(typeof mod.getCryptoBoardData).toBe('function');
      expect(typeof mod.runCryptoBoardJob).toBe('function');
      expect(typeof mod.startCryptoBoardScheduler).toBe('function');
    });
  });

  describe('getCryptoBoardData', () => {
    it('should return null before first run', async () => {
      // Fresh import — cache should be null
      const { getCryptoBoardData } = await import('./cryptoBoard');
      // Note: if a previous test ran the job, cache may exist
      // This test verifies the function is callable and returns correct type
      const data = getCryptoBoardData();
      expect(data === null || typeof data === 'object').toBe(true);
    });
  });

  describe('runCryptoBoardJob', () => {
    it('should fetch data and return CryptoBoardData', async () => {
      const { runCryptoBoardJob } = await import('./cryptoBoard');
      const data = await runCryptoBoardJob();

      // Should return data (may be partial if APIs are slow)
      expect(data).not.toBeNull();
      if (data) {
        expect(data).toHaveProperty('mainstream');
        expect(data).toHaveProperty('meme');
        expect(data).toHaveProperty('btcDominance');
        expect(data).toHaveProperty('totalMarketCap');
        expect(data).toHaveProperty('advice');
        expect(data).toHaveProperty('adviceEn');
        expect(data).toHaveProperty('timestamp');
        expect(Array.isArray(data.mainstream)).toBe(true);
        expect(Array.isArray(data.meme)).toBe(true);
        expect(typeof data.btcDominance).toBe('number');
        expect(typeof data.advice).toBe('string');
        expect(data.timestamp).toBeGreaterThan(0);
      }
    }, 30000); // 30s timeout for API calls

    it('should populate mainstream coins with correct structure', async () => {
      const { runCryptoBoardJob } = await import('./cryptoBoard');
      const data = await runCryptoBoardJob();

      if (data && data.mainstream.length > 0) {
        const coin = data.mainstream[0];
        expect(coin).toHaveProperty('name');
        expect(coin).toHaveProperty('symbol');
        expect(coin).toHaveProperty('price');
        expect(coin).toHaveProperty('change24h');
        expect(typeof coin.name).toBe('string');
        expect(typeof coin.symbol).toBe('string');
        expect(typeof coin.price).toBe('number');
        expect(typeof coin.change24h).toBe('number');
      }
    }, 30000);

    it('should populate meme perps with correct structure', async () => {
      const { runCryptoBoardJob } = await import('./cryptoBoard');
      const data = await runCryptoBoardJob();

      if (data && data.meme.length > 0) {
        const coin = data.meme[0];
        expect(coin).toHaveProperty('name');
        expect(coin).toHaveProperty('symbol');
        expect(coin).toHaveProperty('price');
        expect(coin).toHaveProperty('change24h');
        expect(coin.symbol).toMatch(/USDT$/); // Binance futures symbol format
      }
    }, 30000);

    it('should generate advice based on BTC dominance', async () => {
      const { runCryptoBoardJob } = await import('./cryptoBoard');
      const data = await runCryptoBoardJob();

      if (data) {
        expect(data.advice.length).toBeGreaterThan(10);
        expect(data.adviceEn.length).toBeGreaterThan(10);
        // Advice should mention BTC dominance percentage
        expect(data.advice).toMatch(/\d+\.\d+%/);
      }
    }, 30000);
  });

  describe('getCryptoBoardData after run', () => {
    it('should return cached data after job completes', async () => {
      const { getCryptoBoardData, runCryptoBoardJob } = await import('./cryptoBoard');
      await runCryptoBoardJob();
      const data = getCryptoBoardData();
      expect(data).not.toBeNull();
      if (data) {
        expect(data.timestamp).toBeGreaterThan(0);
      }
    }, 30000);
  });
});
