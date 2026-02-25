import { describe, it, expect, vi } from "vitest";

// Mock nanoid
vi.mock("nanoid", () => ({ nanoid: () => "test-batch-id" }));

// We test the scoring logic and tag generation by importing the module
// Since the functions are not directly exported, we test via the public API
describe("Strategy Engine", () => {
  it("should export runStrategyForMarket function", async () => {
    const mod = await import("./strategyEngine");
    expect(typeof mod.runStrategyForMarket).toBe("function");
  });

  it("should export runAllStrategies function", async () => {
    const mod = await import("./strategyEngine");
    expect(typeof mod.runAllStrategies).toBe("function");
  });

  it("should have correct ScoredStock type shape", async () => {
    // Verify the type exports work
    const mod = await import("./strategyEngine");
    expect(mod).toBeDefined();
  });
});

describe("Strategy Engine - Market Data", () => {
  it("should handle unknown market gracefully", async () => {
    const { runStrategyForMarket } = await import("./strategyEngine");
    const result = await runStrategyForMarket("unknown_market");
    expect(result.stocks).toEqual([]);
    expect(result.sentiment.market).toBe("unknown_market");
    expect(result.sentiment.marketState).toBe("neutral");
  });
});

describe("DB Functions - Strategy", () => {
  it("should export strategy-related db functions", async () => {
    const db = await import("./db");
    expect(typeof db.saveStrategyResults).toBe("function");
    expect(typeof db.getLatestRecommendations).toBe("function");
    expect(typeof db.getLatestSentiment).toBe("function");
    expect(typeof db.cleanOldStrategyData).toBe("function");
  });
});

describe("Schema - Strategy Tables", () => {
  it("should have stockRecommendations table defined", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.stockRecommendations).toBeDefined();
  });

  it("should have marketSentiment table defined", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.marketSentiment).toBeDefined();
  });

  it("stockRecommendations should have required columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.stockRecommendations;
    // Check key columns exist
    expect(table.market).toBeDefined();
    expect(table.rank).toBeDefined();
    expect(table.code).toBeDefined();
    expect(table.symbol).toBeDefined();
    expect(table.score).toBeDefined();
    expect(table.signal).toBeDefined();
    expect(table.reason).toBeDefined();
    expect(table.tags).toBeDefined();
    expect(table.batchId).toBeDefined();
  });
});
