// ===================================================================
// Visitor Statistics — Tests for time range filtering and analytics
// ===================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDailyStats, getCountryStats, getCityStats, getTopPages, getDeviceStats, getRecentVisitors, getTodaySummary, getHourlyStats } from "./visitorTracker";

// Mock the db module
vi.mock("./db", () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue([[]]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
  };
  return {
    getDb: vi.fn().mockResolvedValue(mockDb),
    __mockDb: mockDb,
  };
});

describe("Visitor Statistics", () => {
  describe("getDailyStats", () => {
    it("should accept days parameter and return array", async () => {
      const result = await getDailyStats(7);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should accept 1 day (today) parameter", async () => {
      const result = await getDailyStats(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should accept 365 days parameter", async () => {
      const result = await getDailyStats(365);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should default to 30 days", async () => {
      const result = await getDailyStats();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getCountryStats", () => {
    it("should accept days parameter and return array", async () => {
      const result = await getCountryStats(7);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should default to 30 days", async () => {
      const result = await getCountryStats();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getCityStats", () => {
    it("should accept days parameter and return array", async () => {
      const result = await getCityStats(14);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getTopPages", () => {
    it("should accept days parameter and return array", async () => {
      const result = await getTopPages(30);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getDeviceStats", () => {
    it("should accept days parameter and return object with devices/browsers/oses", async () => {
      const result = await getDeviceStats(7);
      expect(result).toHaveProperty("devices");
      expect(result).toHaveProperty("browsers");
      expect(result).toHaveProperty("oses");
    });
  });

  describe("getRecentVisitors", () => {
    it("should accept limit parameter and return array", async () => {
      const result = await getRecentVisitors(50);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getTodaySummary", () => {
    it("should return summary object with correct shape", async () => {
      const result = await getTodaySummary();
      expect(result).toHaveProperty("todayPV");
      expect(result).toHaveProperty("todayUV");
      expect(result).toHaveProperty("totalPV");
      expect(result).toHaveProperty("totalUV");
      expect(result).toHaveProperty("topCountry");
    });
  });

  describe("getHourlyStats", () => {
    it("should return array", async () => {
      const result = await getHourlyStats();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("null db handling", () => {
    it("getDailyStats returns empty array when db is null", async () => {
      const { getDb } = await import("./db");
      (getDb as any).mockResolvedValueOnce(null);
      const result = await getDailyStats(7);
      expect(result).toEqual([]);
    });

    it("getTodaySummary returns default when db is null", async () => {
      const { getDb } = await import("./db");
      (getDb as any).mockResolvedValueOnce(null);
      const result = await getTodaySummary();
      expect(result).toEqual({ todayPV: 0, todayUV: 0, totalPV: 0, totalUV: 0, topCountry: null });
    });

    it("getHourlyStats returns empty array when db is null", async () => {
      const { getDb } = await import("./db");
      (getDb as any).mockResolvedValueOnce(null);
      const result = await getHourlyStats();
      expect(result).toEqual([]);
    });

    it("getTopPages returns empty array when db is null", async () => {
      const { getDb } = await import("./db");
      (getDb as any).mockResolvedValueOnce(null);
      const result = await getTopPages(30);
      expect(result).toEqual([]);
    });

    it("getCountryStats returns empty array when db is null", async () => {
      const { getDb } = await import("./db");
      (getDb as any).mockResolvedValueOnce(null);
      const result = await getCountryStats(7);
      expect(result).toEqual([]);
    });

    it("getCityStats returns empty array when db is null", async () => {
      const { getDb } = await import("./db");
      (getDb as any).mockResolvedValueOnce(null);
      const result = await getCityStats(7);
      expect(result).toEqual([]);
    });

    it("getDeviceStats returns default object when db is null", async () => {
      const { getDb } = await import("./db");
      (getDb as any).mockResolvedValueOnce(null);
      const result = await getDeviceStats(7);
      expect(result).toEqual({ devices: [], browsers: [], oses: [] });
    });

    it("getRecentVisitors returns empty array when db is null", async () => {
      const { getDb } = await import("./db");
      (getDb as any).mockResolvedValueOnce(null);
      const result = await getRecentVisitors(50);
      expect(result).toEqual([]);
    });
  });

  describe("time range parameter validation", () => {
    it("getDailyStats with 1 day should work for today view", async () => {
      // This tests the new "today" option
      const result = await getDailyStats(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it("different day values should all be accepted", async () => {
      const dayValues = [1, 7, 14, 30, 90, 365];
      for (const days of dayValues) {
        const result = await getDailyStats(days);
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });
});
