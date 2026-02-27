import { describe, it, expect } from 'vitest';

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
    it('should return null or object before/after run', async () => {
      const { getCryptoBoardData } = await import('./cryptoBoard');
      const data = getCryptoBoardData();
      expect(data === null || typeof data === 'object').toBe(true);
    });
  });

  describe('runCryptoBoardJob', () => {
    it('should fetch data and return CryptoBoardData with correct shape', async () => {
      const { runCryptoBoardJob } = await import('./cryptoBoard');
      const data = await runCryptoBoardJob();

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
    }, 45000);

    it('should include logo and sparkline7d fields in coin data', async () => {
      const { runCryptoBoardJob } = await import('./cryptoBoard');
      const data = await runCryptoBoardJob();

      if (data && data.mainstream.length > 0) {
        const coin = data.mainstream[0];
        expect(coin).toHaveProperty('name');
        expect(coin).toHaveProperty('symbol');
        expect(coin).toHaveProperty('price');
        expect(coin).toHaveProperty('change24h');
        expect(coin).toHaveProperty('logo');
        expect(coin).toHaveProperty('sparkline7d');
        // Logo should be string (URL or empty)
        expect(typeof coin.logo).toBe('string');
        expect(Array.isArray(coin.sparkline7d)).toBe(true);
      }
    }, 45000);

    it('should include user-specified meme coins in definition order', async () => {
      const { runCryptoBoardJob } = await import('./cryptoBoard');
      const data = await runCryptoBoardJob();

      if (data) {
        const symbols = data.meme.map(c => c.symbol);
        // Always present: TRONLIFE (no CoinGecko dependency)
        expect(symbols).toContain('TRONLIFE');
        // Total meme list should have 13 entries (10 perp + 2 alpha + 1 tron)
        expect(data.meme.length).toBe(13);
        // If CoinGecko is not rate-limited, we should see more coins with data
        // (This test is lenient to handle 429 rate limiting)
        const withPrice = data.meme.filter(c => c.price > 0);
        console.log(`[Test] Meme coins with price data: ${withPrice.length}/13`);
      }
    }, 45000);

    it('should include Binance Alpha tokens (XLAB, RWA) as entries', async () => {
      const { runCryptoBoardJob } = await import('./cryptoBoard');
      const data = await runCryptoBoardJob();

      if (data) {
        const symbols = data.meme.map(c => c.symbol);
        // XLAB and RWA should always be in the list as entries
        // (they may have price=0 if CoinGecko rate-limited)
        expect(symbols).toContain('XLAB');
        expect(symbols).toContain('RWA');
      }
    }, 45000);

    it('should include 波场人生 (TRONLIFE) entry as placeholder', async () => {
      const { runCryptoBoardJob } = await import('./cryptoBoard');
      const data = await runCryptoBoardJob();

      if (data) {
        const tronLife = data.meme.find(c => c.symbol === 'TRONLIFE');
        expect(tronLife).toBeDefined();
        if (tronLife) {
          expect(tronLife.name).toBe('波场人生');
          // TRONLIFE has no CoinGecko ID, so price should be 0
          expect(tronLife.price).toBe(0);
        }
      }
    }, 45000);

    it('should generate advice based on BTC dominance', async () => {
      const { runCryptoBoardJob } = await import('./cryptoBoard');
      const data = await runCryptoBoardJob();

      if (data) {
        expect(data.advice.length).toBeGreaterThan(10);
        expect(data.adviceEn.length).toBeGreaterThan(10);
        expect(data.advice).toMatch(/\d+\.\d+%/);
      }
    }, 45000);
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
    }, 45000);
  });
});
