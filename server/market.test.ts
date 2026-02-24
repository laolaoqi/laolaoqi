import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock fetch for Yahoo Finance API
const mockYahooResponse = {
  chart: {
    result: [
      {
        meta: {
          symbol: "000001.SS",
          regularMarketPrice: 4117.41,
          chartPreviousClose: 4082.07,
          regularMarketDayHigh: 4131.55,
          regularMarketDayLow: 4105.94,
          regularMarketVolume: 3200000000,
          shortName: "SSE Composite Index",
        },
        timestamp: [1700000000, 1700000300, 1700000600],
        indicators: {
          quote: [
            {
              close: [4110.5, 4115.2, 4117.41],
              high: [4112.0, 4116.5, 4118.0],
              low: [4108.0, 4113.0, 4115.5],
              open: [4109.0, 4114.0, 4116.0],
              volume: [1000000, 1200000, 1100000],
            },
          ],
        },
      },
    ],
  },
};

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("market.indices", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns index data when Yahoo Finance API responds", async () => {
    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.market.indices();

    expect(result).toHaveProperty("isLive");
    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);

    // Should have called fetch for each index symbol
    expect(mockFetch).toHaveBeenCalled();

    // If data was returned, verify structure
    if (result.data.length > 0) {
      const first = result.data[0] as any;
      expect(first).toHaveProperty("symbol");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("price");
      expect(first).toHaveProperty("change");
      expect(first).toHaveProperty("changePercent");
      expect(first).toHaveProperty("chartData");
      expect(typeof first.price).toBe("number");
    }

    vi.unstubAllGlobals();
  });

  it("handles API failures gracefully", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw even when all fetches fail
    const result = await caller.market.indices();

    expect(result).toHaveProperty("isLive");
    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);

    vi.unstubAllGlobals();
  });
});

describe("market.recommendations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns stock recommendations when API responds", async () => {
    const stockResponse = {
      chart: {
        result: [
          {
            meta: {
              symbol: "600036.SS",
              regularMarketPrice: 38.52,
              chartPreviousClose: 37.82,
              regularMarketDayHigh: 38.90,
              regularMarketDayLow: 37.50,
              regularMarketVolume: 50000000,
            },
            timestamp: [1700000000],
            indicators: { quote: [{ close: [38.52], high: [38.90], low: [37.50], open: [37.82], volume: [50000000] }] },
          },
        ],
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(stockResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.market.recommendations();

    expect(result).toHaveProperty("isLive");
    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);

    if (result.data.length > 0) {
      const first = result.data[0] as any;
      expect(first).toHaveProperty("rank");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("code");
      expect(first).toHaveProperty("industry");
      expect(first).toHaveProperty("price");
      expect(first).toHaveProperty("score");
      expect(first).toHaveProperty("signal");
      expect(first).toHaveProperty("reason");
      expect(typeof first.price).toBe("number");
      expect(first.rank).toBe(1);
    }

    vi.unstubAllGlobals();
  });
});

describe("market.stockDetail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns stock detail for a given symbol", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.market.stockDetail({ symbol: "000001.SS" });

    expect(result).not.toBeNull();
    if (result) {
      expect(result).toHaveProperty("meta");
      expect(result.meta).toHaveProperty("regularMarketPrice");
    }

    vi.unstubAllGlobals();
  });

  it("returns null when API returns no data", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ chart: { result: [] } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.market.stockDetail({ symbol: "INVALID" });

    expect(result).toBeNull();

    vi.unstubAllGlobals();
  });
});
