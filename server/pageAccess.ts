// ===================================================================
// Page Access Control — admin-managed page visibility per user type
// Supports: guest (unauthenticated), user (registered), admin (always full access)
// ===================================================================

import { getDb } from "./db";
import { pageAccessRules, siteSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// All controllable pages (excluding /admin which is always admin-only)
const ALL_PAGES = [
  { path: "/", label: "首页 Home" },
  { path: "/about", label: "关于 About" },
  { path: "/crypto-investment", label: "数字货币投资看板" },
  { path: "/crypto-panorama", label: "数字货币全景看板" },
  { path: "/stock/:symbol", label: "个股详情页" },
];

const SITE_OPEN_ALL_KEY = "site_open_all";

/**
 * Initialize default page access rules if not exist
 * Called on server startup
 */
export async function initPageAccessRules() {
  try {
    const db = await getDb();
    if (!db) return;
    for (const page of ALL_PAGES) {
      const existing = await db
        .select()
        .from(pageAccessRules)
        .where(eq(pageAccessRules.pagePath, page.path))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(pageAccessRules).values({
          pagePath: page.path,
          pageLabel: page.label,
          guestAccess: 1,
          userAccess: 1,
        });
      }
    }
    const openAllSetting = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.settingKey, SITE_OPEN_ALL_KEY))
      .limit(1);
    if (openAllSetting.length === 0) {
      await db.insert(siteSettings).values({
        settingKey: SITE_OPEN_ALL_KEY,
        settingValue: "true",
      });
    }
  } catch (err) {
    console.error("[PageAccess] Failed to initialize rules:", err);
  }
}

/**
 * Get all page access rules
 */
export async function getAllPageAccessRules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pageAccessRules).orderBy(pageAccessRules.id);
}

/**
 * Update a single page's access rule
 */
export async function updatePageAccessRule(
  pagePath: string,
  guestAccess: number,
  userAccess: number
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(pageAccessRules)
    .set({ guestAccess, userAccess })
    .where(eq(pageAccessRules.pagePath, pagePath));
}

/**
 * Set all pages to open (guest=1, user=1) — one-click open all
 */
export async function setAllPagesOpen() {
  const db = await getDb();
  if (!db) return;
  await db
    .update(pageAccessRules)
    .set({ guestAccess: 1, userAccess: 1 });
  await db
    .update(siteSettings)
    .set({ settingValue: "true" })
    .where(eq(siteSettings.settingKey, SITE_OPEN_ALL_KEY));
}

/**
 * Set all pages to restricted (guest=0, user=0) — one-click lock all
 */
export async function setAllPagesRestricted() {
  const db = await getDb();
  if (!db) return;
  await db
    .update(pageAccessRules)
    .set({ guestAccess: 0, userAccess: 0 });
  await db
    .update(siteSettings)
    .set({ settingValue: "false" })
    .where(eq(siteSettings.settingKey, SITE_OPEN_ALL_KEY));
}

/**
 * Get the site_open_all setting
 */
export async function getSiteOpenAll(): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;
  const result = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.settingKey, SITE_OPEN_ALL_KEY))
    .limit(1);
  return result.length > 0 && result[0].settingValue === "true";
}

/**
 * Check if a specific page is accessible for a given user type
 * @param pagePath - the page path (e.g. "/crypto-investment")
 * @param userType - "guest" | "user" | "admin"
 * @returns boolean
 */
export async function checkPageAccess(
  pagePath: string,
  userType: "guest" | "user" | "admin"
): Promise<boolean> {
  // Admin always has access to everything
  if (userType === "admin") return true;

  // Normalize dynamic routes: /stock/AAPL -> /stock/:symbol
  let normalizedPath = pagePath;
  if (pagePath.startsWith("/stock/")) {
    normalizedPath = "/stock/:symbol";
  }

  const db = await getDb();
  if (!db) return true;
  const rules = await db
    .select()
    .from(pageAccessRules)
    .where(eq(pageAccessRules.pagePath, normalizedPath))
    .limit(1);

  // If no rule exists, default to open
  if (rules.length === 0) return true;

  const rule = rules[0];
  if (userType === "guest") return rule.guestAccess === 1;
  if (userType === "user") return rule.userAccess === 1;
  return true;
}

/**
 * Get all page access rules with site_open_all flag — for frontend
 */
export async function getPageAccessConfig() {
  const rules = await getAllPageAccessRules();
  const isOpenAll = await getSiteOpenAll();
  return { rules, isOpenAll };
}

/**
 * Get all available pages (for admin UI)
 */
export function getAllPages() {
  return ALL_PAGES;
}
