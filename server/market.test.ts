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

describe("market.indices", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts cn market and returns data array", async () => {
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

    vi.unstubAllGlobals();
  });

  it("accepts hk market", async () => {
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

    vi.unstubAllGlobals();
  });

  it("accepts us market", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.indices({ market: "us" });

    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);

    vi.unstubAllGlobals();
  });

  it("accepts crypto market", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.indices({ market: "crypto" });

    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);

    vi.unstubAllGlobals();
  });

  it("returns all markets when no market specified", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.indices();

    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);

    vi.unstubAllGlobals();
  });

  it("handles API failures gracefully", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
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

  it("returns recommendations for cn market", async () => {
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

    vi.unstubAllGlobals();
  });

  it("returns recommendations for us market", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(mockYahooResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.market.recommendations({ market: "us" });

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("market", "us");

    vi.unstubAllGlobals();
  });

  it("returns recommendations for hk market", async () => {
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

  it("returns recommendations for crypto market", async () => {
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
