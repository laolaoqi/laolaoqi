import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Helper: create admin context for testing admin-only routes
function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// Helper: create non-admin context
function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("admin.visitorSummary", () => {
  it("returns summary data for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.visitorSummary();

    // Should return the expected shape
    expect(result).toHaveProperty("todayPV");
    expect(result).toHaveProperty("todayUV");
    expect(result).toHaveProperty("totalPV");
    expect(result).toHaveProperty("totalUV");
    expect(result).toHaveProperty("topCountry");
    expect(typeof result.todayPV).toBe("number");
    expect(typeof result.todayUV).toBe("number");
    expect(typeof result.totalPV).toBe("number");
    expect(typeof result.totalUV).toBe("number");
  });

  it("rejects non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.visitorSummary()).rejects.toThrow();
  });
});

describe("admin.visitorDailyStats", () => {
  it("returns daily stats array for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.visitorDailyStats({ days: 7 });

    expect(Array.isArray(result)).toBe(true);
    // Each item should have date, pv, uv
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("pv");
      expect(result[0]).toHaveProperty("uv");
    }
  });
});

describe("admin.visitorCountryStats", () => {
  it("returns country stats array for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.visitorCountryStats({ days: 30 });

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("country");
      expect(result[0]).toHaveProperty("countryCode");
      expect(result[0]).toHaveProperty("visits");
      expect(result[0]).toHaveProperty("uniqueIps");
    }
  });
});

describe("admin.visitorRecentList", () => {
  it("returns recent visitors list for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.visitorRecentList({ limit: 10 });

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("ip");
      expect(result[0]).toHaveProperty("path");
      expect(result[0]).toHaveProperty("createdAt");
    }
  });

  it("rejects non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.visitorRecentList({ limit: 10 })).rejects.toThrow();
  });
});

describe("admin.visitorDeviceStats", () => {
  it("returns device/browser/os stats for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.visitorDeviceStats({ days: 30 });

    expect(result).toHaveProperty("devices");
    expect(result).toHaveProperty("browsers");
    expect(result).toHaveProperty("oses");
    expect(Array.isArray(result.devices)).toBe(true);
    expect(Array.isArray(result.browsers)).toBe(true);
    expect(Array.isArray(result.oses)).toBe(true);
  });
});

describe("admin.visitorHourlyStats", () => {
  it("returns hourly stats array for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.visitorHourlyStats();

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("hour");
      expect(result[0]).toHaveProperty("pv");
      expect(result[0]).toHaveProperty("uv");
    }
  });
});

describe("admin.visitorTopPages", () => {
  it("returns top pages array for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.visitorTopPages({ days: 30 });

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("path");
      expect(result[0]).toHaveProperty("visits");
      expect(result[0]).toHaveProperty("uniqueIps");
    }
  });
});

describe("admin.visitorCityStats", () => {
  it("returns city stats array for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.visitorCityStats({ days: 30 });

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("city");
      expect(result[0]).toHaveProperty("country");
      expect(result[0]).toHaveProperty("visits");
    }
  });
});
