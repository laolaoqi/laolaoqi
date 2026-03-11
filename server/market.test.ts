import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock Yahoo Finance response
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

function createPublicContext(ip?: string): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: ip ? { "x-forwarded-for": ip } : {},
      socket: { remoteAddress: ip || "127.0.0.1" },
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

describe("market.indices — single market isolation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns A-share indices for cn market", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.indices({ market: "cn" });

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("isLive");
    expect(Array.isArray(result.data)).toBe(true);
    // All items should be cn market
    result.data.forEach((idx: any) => {
      expect(idx.market).toBe("cn");
    });

    vi.unstubAllGlobals();
  });

  it("returns HK indices for hk market", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.indices({ market: "hk" });

    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);
    result.data.forEach((idx: any) => {
      expect(idx.market).toBe("hk");
    });

    vi.unstubAllGlobals();
  });

  it("returns US indices for us market", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.indices({ market: "us" });

    expect(result).toHaveProperty("data");
    result.data.forEach((idx: any) => {
      expect(idx.market).toBe("us");
    });

    vi.unstubAllGlobals();
  });

  it("returns crypto indices for crypto market", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.indices({ market: "crypto" });

    expect(result).toHaveProperty("data");
    result.data.forEach((idx: any) => {
      expect(idx.market).toBe("crypto");
    });

    vi.unstubAllGlobals();
  });

  it("handles API failures gracefully with fallback data", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.indices({ market: "cn" });

    expect(result).toHaveProperty("isLive");
    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);

    vi.unstubAllGlobals();
  });
});

describe("market.recommendations — per-market isolation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns cn market recommendations with correct structure", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () =>
        Promise.resolve({
          chart: {
            result: [
              {
                meta: {
                  symbol: "600036.SS",
                  regularMarketPrice: 38.52,
                  chartPreviousClose: 37.82,
                  regularMarketDayHigh: 38.9,
                  regularMarketDayLow: 37.5,
                  regularMarketVolume: 50000000,
                },
                timestamp: [1700000000],
                indicators: {
                  quote: [
                    {
                      close: [38.52],
                      high: [38.9],
                      low: [37.5],
                      open: [37.82],
                      volume: [50000000],
                    },
                  ],
                },
              },
            ],
          },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.recommendations({ market: "cn" });

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("market", "cn");
    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      const rec = result.data[0];
      expect(rec).toHaveProperty("code");
      expect(rec).toHaveProperty("nameZh");
      expect(rec).toHaveProperty("nameEn");
      expect(typeof rec.price).toBe("number");
    }

    vi.unstubAllGlobals();
  });

  it("returns us market recommendations", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.recommendations({ market: "us" });

    expect(result).toHaveProperty("market", "us");
    expect(Array.isArray(result.data)).toBe(true);

    vi.unstubAllGlobals();
  });

  it("returns hk market recommendations", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.recommendations({ market: "hk" });

    expect(result).toHaveProperty("market", "hk");

    vi.unstubAllGlobals();
  });

  it("returns crypto market recommendations", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.recommendations({ market: "crypto" });

    expect(result).toHaveProperty("market", "crypto");

    vi.unstubAllGlobals();
  });
});

describe("market.heatmap", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns heatmap sectors for cn market", async () => {  // increased timeout for full stock pool
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.heatmap({ market: "cn" });

    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      const sector = result.data[0];
      expect(sector).toHaveProperty("nameZh");
      expect(sector).toHaveProperty("nameEn");
      expect(typeof sector.changePercent).toBe("number");
      expect(typeof sector.weight).toBe("number");
      expect(Array.isArray(sector.stocks)).toBe(true);
    }

    vi.unstubAllGlobals();
  }, 30000);

  it("returns different sectors for us market", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.heatmap({ market: "us" });

    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);

    vi.unstubAllGlobals();
  });
});

describe("market.stockDetail — individual stock data", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns stock detail with technicals for a valid symbol", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.stockDetail({ symbol: "000001.SS" });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("symbol", "000001.SS");
    expect(result).toHaveProperty("isLive", true);
    expect(typeof result.price).toBe("number");
    expect(result).toHaveProperty("technicals");
    expect(result.technicals).toHaveProperty("rsi14");
    expect(result.technicals).toHaveProperty("macd");
    expect(result).toHaveProperty("intradayChart");
    expect(result).toHaveProperty("dailyChart");

    vi.unstubAllGlobals();
  });

  it("handles API failure gracefully", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.stockDetail({ symbol: "INVALID" });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("symbol", "INVALID");
    expect(result).toHaveProperty("isLive", false);

    vi.unstubAllGlobals();
  });
});

describe("locale.detect", () => {
  it("returns a valid language code", async () => {
    const ctx = createPublicContext("127.0.0.1");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.locale.detect();

    expect(result).toHaveProperty("lang");
    expect(typeof result.lang).toBe("string");
    expect(["zh", "en", "ja", "ko", "ar"]).toContain(result.lang);
  });

  it("defaults to zh for localhost", async () => {
    const ctx = createPublicContext("127.0.0.1");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.locale.detect();

    expect(result.lang).toBe("zh");
  });

  it("defaults to zh for empty IP", async () => {
    const ctx = createPublicContext("");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.locale.detect();

    expect(result.lang).toBe("zh");
  });
});

describe("auth.logout", () => {
  it("clears cookie and returns success", async () => {
    const clearCookie = vi.fn();
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-user",
        email: "test@example.com",
        name: "Test",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie } as any,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearCookie).toHaveBeenCalled();
  });
});
