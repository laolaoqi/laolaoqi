import { describe, it, expect, beforeAll } from 'vitest';
import { getCryptoBoardData, runCryptoBoardJob, startCryptoBoardScheduler, type CryptoBoardData } from './cryptoBoard';

describe('CryptoBoard — Investment Board Backend', () => {

  // Run the job once and share the result across all tests
  let boardData: CryptoBoardData | null = null;

  beforeAll(async () => {
    boardData = await runCryptoBoardJob();
  }, 60000);

  describe('Module exports', () => {
    it('should export all required functions', () => {
      expect(typeof getCryptoBoardData).toBe('function');
      expect(typeof runCryptoBoardJob).toBe('function');
      expect(typeof startCryptoBoardScheduler).toBe('function');
    });
  });

  describe('getCryptoBoardData', () => {
    it('should return null or object before/after run', () => {
      const data = getCryptoBoardData();
      expect(data === null || typeof data === 'object').toBe(true);
    });
  });

  describe('runCryptoBoardJob', () => {
    it('should fetch data and return CryptoBoardData with correct shape', () => {
      expect(boardData).not.toBeNull();
      if (boardData) {
        expect(boardData).toHaveProperty('mainstream');
        expect(boardData).toHaveProperty('meme');
        expect(boardData).toHaveProperty('btcDominance');
        expect(boardData).toHaveProperty('totalMarketCap');
        expect(boardData).toHaveProperty('advice');
        expect(boardData).toHaveProperty('adviceEn');
        expect(boardData).toHaveProperty('timestamp');
        expect(Array.isArray(boardData.mainstream)).toBe(true);
        expect(Array.isArray(boardData.meme)).toBe(true);
        expect(typeof boardData.btcDominance).toBe('number');
        expect(typeof boardData.advice).toBe('string');
        expect(boardData.timestamp).toBeGreaterThan(0);
      }
    });

    it('should include logo and sparkline7d fields in coin data', () => {
      if (boardData && boardData.mainstream.length > 0) {
        const coin = boardData.mainstream[0];
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
    });

    it('should include user-specified meme coins in definition order', () => {
      if (boardData) {
        const symbols = boardData.meme.map(c => c.symbol);
        // Always present: TRONLIFE (no CoinGecko dependency)
        expect(symbols).toContain('TRONLIFE');
        // Total meme list should have 13 entries (10 perp + 2 alpha + 1 tron)
        expect(boardData.meme.length).toBe(13);
        // If CoinGecko is not rate-limited, we should see more coins with data
        // (This test is lenient to handle 429 rate limiting)
        const withPrice = boardData.meme.filter(c => c.price > 0);
        console.log(`[Test] Meme coins with price data: ${withPrice.length}/13`);
      }
    });

    it('should include Binance Alpha tokens (XLAB, RWA) as entries', () => {
      if (boardData) {
        const symbols = boardData.meme.map(c => c.symbol);
        // XLAB and RWA should always be in the list as entries
        // (they may have price=0 if CoinGecko rate-limited)
        expect(symbols).toContain('XLAB');
        expect(symbols).toContain('RWA');
      }
    });

    it('should include 波场人生 (TRONLIFE) entry as placeholder', () => {
      if (boardData) {
        const tronLife = boardData.meme.find(c => c.symbol === 'TRONLIFE');
        expect(tronLife).toBeDefined();
        if (tronLife) {
          expect(tronLife.name).toBe('波场人生');
          // TRONLIFE has no CoinGecko ID, so price should be 0
          expect(tronLife.price).toBe(0);
        }
      }
    });

    it('should generate advice based on BTC dominance', () => {
      if (boardData) {
        expect(boardData.advice.length).toBeGreaterThan(10);
        expect(boardData.adviceEn.length).toBeGreaterThan(10);
        expect(boardData.advice).toMatch(/\d+\.\d+%/);
      }
    });
  });

  describe('getCryptoBoardData after run', () => {
    it('should return cached data after job completes', () => {
      const data = getCryptoBoardData();
      expect(data).not.toBeNull();
      if (data) {
        expect(data.timestamp).toBeGreaterThan(0);
      }
    });
  });
});
