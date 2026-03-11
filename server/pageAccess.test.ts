import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Helper to create a context with a specific role
function createContext(role: "admin" | "user" | null): TrpcContext {
  const user: AuthenticatedUser | null = role
    ? {
        id: role === "admin" ? 1 : 2,
        openId: `${role}-test`,
        email: `${role}@example.com`,
        name: `Test ${role}`,
        loginMethod: "manus",
        role: role,
        cryptoBoardAccess: 0,
        accessExpiresAt: null,
        accessGrantedAt: null,
        accessNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    : null;

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ===================================================================
// Page Access Check (public procedure - used by PageAccessGuard)
// ===================================================================
describe("pageAccess.check", () => {
  it("returns hasAccess and userType for guest (unauthenticated)", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pageAccess.check({ path: "/" });
    expect(result).toHaveProperty("hasAccess");
    expect(result).toHaveProperty("userType");
    expect(result.userType).toBe("guest");
    expect(typeof result.hasAccess).toBe("boolean");
  });

  it("returns userType 'user' for authenticated regular user", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pageAccess.check({ path: "/" });
    expect(result.userType).toBe("user");
    expect(typeof result.hasAccess).toBe("boolean");
  });

  it("returns userType 'admin' for admin user", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pageAccess.check({ path: "/" });
    expect(result.userType).toBe("admin");
    expect(result.hasAccess).toBe(true); // admin always has access
  });

  it("normalizes dynamic stock routes (/stock/AAPL -> /stock/:symbol)", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    // Should not throw - the normalization happens inside checkPageAccess
    const result = await caller.pageAccess.check({ path: "/stock/AAPL" });
    expect(result).toHaveProperty("hasAccess");
    expect(result.userType).toBe("user");
  });

  it("defaults to open for unknown paths", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pageAccess.check({ path: "/some-nonexistent-page" });
    expect(result.hasAccess).toBe(true); // no rule = default open
  });
});

// ===================================================================
// Page Access Rules (public procedure - for frontend nav display)
// ===================================================================
describe("pageAccess.rules", () => {
  it("returns rules array and isOpenAll flag for guest", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pageAccess.rules();
    expect(result).toHaveProperty("rules");
    expect(result).toHaveProperty("isOpenAll");
    expect(result).toHaveProperty("userType");
    expect(result.userType).toBe("guest");
    expect(Array.isArray(result.rules)).toBe(true);
    expect(typeof result.isOpenAll).toBe("boolean");
  });

  it("returns userType 'admin' for admin user", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pageAccess.rules();
    expect(result.userType).toBe("admin");
  });
});

// ===================================================================
// Admin Page Access Management (admin-only procedures)
// ===================================================================
describe("admin.getPageAccessConfig", () => {
  it("returns config for admin user", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.getPageAccessConfig();
    expect(result).toHaveProperty("rules");
    expect(result).toHaveProperty("isOpenAll");
    expect(Array.isArray(result.rules)).toBe(true);
  });

  it("rejects non-admin user", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.getPageAccessConfig()).rejects.toThrow();
  });

  it("rejects unauthenticated user", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.getPageAccessConfig()).rejects.toThrow();
  });
});

describe("admin.updatePageAccess", () => {
  it("allows admin to update page access", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.updatePageAccess({
      pagePath: "/",
      guestAccess: 1,
      userAccess: 1,
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin user", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.updatePageAccess({
        pagePath: "/",
        guestAccess: 0,
        userAccess: 0,
      })
    ).rejects.toThrow();
  });

  it("validates input - guestAccess must be 0 or 1", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.updatePageAccess({
        pagePath: "/",
        guestAccess: 2,
        userAccess: 1,
      })
    ).rejects.toThrow();
  });
});

describe("admin.openAllPages", () => {
  it("allows admin to open all pages", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.openAllPages();
    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin user", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.openAllPages()).rejects.toThrow();
  });
});

describe("admin.restrictAllPages", () => {
  it("allows admin to restrict all pages", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.restrictAllPages();
    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin user", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.restrictAllPages()).rejects.toThrow();
  });

  it("rejects unauthenticated user", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.restrictAllPages()).rejects.toThrow();
  });
});

// ===================================================================
// Full workflow: restrict -> check -> open -> check
// ===================================================================
describe("page access workflow", () => {
  it("after restrictAll, guest should be denied; after openAll, guest should be allowed", async () => {
    const adminCtx = createContext("admin");
    const guestCtx = createContext(null);
    const adminCaller = appRouter.createCaller(adminCtx);
    const guestCaller = appRouter.createCaller(guestCtx);

    // Step 1: Restrict all
    await adminCaller.admin.restrictAllPages();

    // Step 2: Guest should be denied on homepage
    const deniedResult = await guestCaller.pageAccess.check({ path: "/" });
    expect(deniedResult.hasAccess).toBe(false);
    expect(deniedResult.userType).toBe("guest");

    // Step 3: Admin should still have access
    const adminResult = await appRouter.createCaller(adminCtx).pageAccess.check({ path: "/" });
    expect(adminResult.hasAccess).toBe(true);

    // Step 4: Open all
    await adminCaller.admin.openAllPages();

    // Step 5: Guest should be allowed again
    const allowedResult = await guestCaller.pageAccess.check({ path: "/" });
    expect(allowedResult.hasAccess).toBe(true);
  });

  it("admin can restrict specific page for guest but keep user access", async () => {
    const adminCtx = createContext("admin");
    const adminCaller = appRouter.createCaller(adminCtx);

    // First ensure all open
    await adminCaller.admin.openAllPages();

    // Restrict crypto-investment for guests only
    await adminCaller.admin.updatePageAccess({
      pagePath: "/crypto-investment",
      guestAccess: 0,
      userAccess: 1,
    });

    // Guest should be denied
    const guestResult = await appRouter
      .createCaller(createContext(null))
      .pageAccess.check({ path: "/crypto-investment" });
    expect(guestResult.hasAccess).toBe(false);

    // User should still have access
    const userResult = await appRouter
      .createCaller(createContext("user"))
      .pageAccess.check({ path: "/crypto-investment" });
    expect(userResult.hasAccess).toBe(true);

    // Restore
    await adminCaller.admin.openAllPages();
  });
});
