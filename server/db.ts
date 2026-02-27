import { eq, desc, asc, count, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, announcements, InsertAnnouncement, stockRecommendations, marketSentiment } from "../drizzle/schema";
import { ENV } from './_core/env';
import type { ScoredStock, MarketSentimentResult } from './strategyEngine';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Check if this is the first user — auto-assign admin
    const userCount = await db.select({ count: count() }).from(users);
    const isFirstUser = (userCount[0]?.count || 0) === 0;

    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (isFirstUser || user.openId === ENV.ownerOpenId) {
      // First registered user becomes admin, or owner is always admin
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===================================================================
// User Management
// ===================================================================

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    role: users.role,
    cryptoBoardAccess: users.cryptoBoardAccess,
    accessExpiresAt: users.accessExpiresAt,
    accessGrantedAt: users.accessGrantedAt,
    accessNote: users.accessNote,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(asc(users.id));
  return result;
}

export async function updateUserRole(userId: number, role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// Update crypto board access for a user
export async function updateCryptoBoardAccess(
  userId: number,
  access: boolean,
  expiresAt?: Date | null,
  note?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({
    cryptoBoardAccess: access ? 1 : 0,
    accessExpiresAt: expiresAt ?? null,
    accessGrantedAt: access ? new Date() : null,
    accessNote: note ?? null,
  }).where(eq(users.id, userId));
}

// Batch update crypto board access
export async function batchUpdateCryptoBoardAccess(
  userIds: number[],
  access: boolean,
  expiresAt?: Date | null,
  note?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const userId of userIds) {
    await db.update(users).set({
      cryptoBoardAccess: access ? 1 : 0,
      accessExpiresAt: expiresAt ?? null,
      accessGrantedAt: access ? new Date() : null,
      accessNote: note ?? null,
    }).where(eq(users.id, userId));
  }
}

// Check if a user has valid crypto board access
export async function checkCryptoBoardAccess(userId: number): Promise<{ hasAccess: boolean; expiresAt: Date | null; isExpired: boolean }> {
  const db = await getDb();
  if (!db) return { hasAccess: false, expiresAt: null, isExpired: false };
  const [user] = await db.select({
    role: users.role,
    cryptoBoardAccess: users.cryptoBoardAccess,
    accessExpiresAt: users.accessExpiresAt,
  }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return { hasAccess: false, expiresAt: null, isExpired: false };
  // Admin always has access
  if (user.role === 'admin') return { hasAccess: true, expiresAt: null, isExpired: false };
  if (!user.cryptoBoardAccess) return { hasAccess: false, expiresAt: null, isExpired: false };
  // Check expiry
  if (user.accessExpiresAt) {
    const now = new Date();
    if (now > user.accessExpiresAt) {
      return { hasAccess: false, expiresAt: user.accessExpiresAt, isExpired: true };
    }
    return { hasAccess: true, expiresAt: user.accessExpiresAt, isExpired: false };
  }
  // No expiry = permanent access
  return { hasAccess: true, expiresAt: null, isExpired: false };
}

// Get user statistics for admin dashboard
export async function getUserStats() {
  const db = await getDb();
  if (!db) return { total: 0, admins: 0, withAccess: 0, expired: 0, noAccess: 0 };
  const allUsers = await db.select({
    role: users.role,
    cryptoBoardAccess: users.cryptoBoardAccess,
    accessExpiresAt: users.accessExpiresAt,
  }).from(users);
  const now = new Date();
  const total = allUsers.length;
  const admins = allUsers.filter(u => u.role === 'admin').length;
  const withAccess = allUsers.filter(u => {
    if (u.role === 'admin') return true;
    if (!u.cryptoBoardAccess) return false;
    if (u.accessExpiresAt && now > u.accessExpiresAt) return false;
    return true;
  }).length;
  const expired = allUsers.filter(u => u.cryptoBoardAccess && u.accessExpiresAt && now > u.accessExpiresAt).length;
  const noAccess = total - withAccess;
  return { total, admins, withAccess, expired, noAccess };
}

// ===================================================================
// Announcements CRUD
// ===================================================================

export async function createAnnouncement(data: { title: string; content: string; imageUrl?: string; imageCaption?: string; authorId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(announcements).values({
    title: data.title,
    content: data.content,
    imageUrl: data.imageUrl || null,
    imageCaption: data.imageCaption || null,
    authorId: data.authorId,
    isActive: 1,
  });
  return { id: result[0].insertId };
}

export async function getActiveAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcements).where(eq(announcements.isActive, 1)).orderBy(desc(announcements.createdAt)).limit(10);
}

export async function getAllAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(50);
}

export async function updateAnnouncement(id: number, data: { title?: string; content?: string; imageUrl?: string; imageCaption?: string; isActive?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateSet: Record<string, unknown> = {};
  if (data.title !== undefined) updateSet.title = data.title;
  if (data.content !== undefined) updateSet.content = data.content;
  if (data.imageUrl !== undefined) updateSet.imageUrl = data.imageUrl;
  if (data.imageCaption !== undefined) updateSet.imageCaption = data.imageCaption;
  if (data.isActive !== undefined) updateSet.isActive = data.isActive;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(announcements).set(updateSet).where(eq(announcements.id, id));
}

export async function deleteAnnouncement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(announcements).where(eq(announcements.id, id));
}

// ===================================================================
// Stock Recommendations CRUD
// ===================================================================

export async function saveStrategyResults(
  batchId: string,
  market: string,
  stocks: ScoredStock[],
  sentimentData: MarketSentimentResult
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert stock recommendations
  if (stocks.length > 0) {
    const values = stocks.map(s => ({
      market,
      rank: s.rank,
      code: s.code,
      symbol: s.symbol,
      nameZh: s.nameZh,
      nameEn: s.nameEn,
      industry: s.industry || null,
      price: s.price,
      change: s.change,
      changePercent: s.changePercent,
      score: s.score,
      signal: s.signal,
      pe: s.pe,
      pb: s.pb,
      dividendYield: s.dividendYield,
      capitalFlow: s.capitalFlow,
      reason: s.reason,
      reasonDetail: s.reasonDetail,
      tags: s.tags.join(','),
      batchId,
    }));
    await db.insert(stockRecommendations).values(values);
  }

  // Insert market sentiment
  await db.insert(marketSentiment).values({
    market,
    advanceRatio: sentimentData.advanceRatio,
    mainForceFlow: sentimentData.mainForceFlow,
    marketState: sentimentData.marketState,
    stopLoss: sentimentData.stopLoss,
    positionSuggestion: sentimentData.positionSuggestion,
    advice: sentimentData.advice,
    batchId,
  });
}

export async function getLatestRecommendations(market: string) {
  const db = await getDb();
  if (!db) return [];

  // Get the latest batchId for this market
  const latestBatch = await db
    .select({ batchId: stockRecommendations.batchId })
    .from(stockRecommendations)
    .where(eq(stockRecommendations.market, market))
    .orderBy(desc(stockRecommendations.createdAt))
    .limit(1);

  if (latestBatch.length === 0) return [];

  const batchId = latestBatch[0].batchId;
  return db
    .select()
    .from(stockRecommendations)
    .where(and(
      eq(stockRecommendations.market, market),
      eq(stockRecommendations.batchId, batchId)
    ))
    .orderBy(asc(stockRecommendations.rank))
    .limit(10);
}

export async function getLatestSentiment(market: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(marketSentiment)
    .where(eq(marketSentiment.market, market))
    .orderBy(desc(marketSentiment.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function cleanOldStrategyData(keepDays = 7) {
  const db = await getDb();
  if (!db) return;

  const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
  // Use raw SQL for date comparison since drizzle doesn't have lt for timestamps easily
  try {
    await db.execute(`DELETE FROM stock_recommendations WHERE createdAt < '${cutoff.toISOString().slice(0, 19)}'`);
    await db.execute(`DELETE FROM market_sentiment_data WHERE createdAt < '${cutoff.toISOString().slice(0, 19)}'`);
    console.log(`[DB] Cleaned strategy data older than ${keepDays} days`);
  } catch (err: any) {
    console.error('[DB] Failed to clean old data:', err?.message);
  }
}
