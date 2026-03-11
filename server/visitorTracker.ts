// ===================================================================
// Visitor Tracker — IP geolocation + visit logging + analytics
// ===================================================================

import { getDb } from "./db";
import { visitorLogs, type InsertVisitorLog } from "../drizzle/schema";
import { sql, eq, gte, and, desc, count, countDistinct } from "drizzle-orm";

// ===================================================================
// IP Geolocation (ip-api.com — free, 45 req/min, no key needed)
// ===================================================================
interface GeoResult {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  isp: string;
}

const geoCache = new Map<string, { data: GeoResult | null; ts: number }>();
const GEO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h cache per IP

async function lookupGeo(ip: string): Promise<GeoResult | null> {
  // Skip private/local IPs
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return { country: 'Local', countryCode: 'LO', region: 'Local', city: 'Local', lat: 0, lon: 0, isp: 'Local' };
  }

  // Check cache
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.ts < GEO_CACHE_TTL) return cached.data;

  try {
    // Primary: ipinfo.io (free tier: 50k/month, no key needed)
    const resp = await fetch(`https://ipinfo.io/${ip}/json`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) throw new Error(`ipinfo.io HTTP ${resp.status}`);
    const data = await resp.json();
    if (data.country) {
      const [lat, lon] = (data.loc || '0,0').split(',').map(Number);
      const result: GeoResult = {
        country: countryCodeToName(data.country) || data.country,
        countryCode: data.country,
        region: data.region || '',
        city: data.city || '',
        lat: lat || 0,
        lon: lon || 0,
        isp: data.org || '',
      };
      geoCache.set(ip, { data: result, ts: Date.now() });
      return result;
    }
    geoCache.set(ip, { data: null, ts: Date.now() });
    return null;
  } catch (err) {
    console.warn(`[VisitorTracker] Geo lookup failed for ${ip}:`, (err as Error).message || err);
    // Cache failure for 5 minutes to avoid hammering
    geoCache.set(ip, { data: null, ts: Date.now() - GEO_CACHE_TTL + 5 * 60 * 1000 });
    return null;
  }
}

/** Map common country codes to names */
function countryCodeToName(code: string): string {
  const map: Record<string, string> = {
    US: 'United States', CN: 'China', JP: 'Japan', KR: 'South Korea',
    GB: 'United Kingdom', DE: 'Germany', FR: 'France', SG: 'Singapore',
    HK: 'Hong Kong', TW: 'Taiwan', IN: 'India', AU: 'Australia',
    CA: 'Canada', BR: 'Brazil', RU: 'Russia', ID: 'Indonesia',
    TH: 'Thailand', VN: 'Vietnam', MY: 'Malaysia', PH: 'Philippines',
    NL: 'Netherlands', IT: 'Italy', ES: 'Spain', SE: 'Sweden',
    CH: 'Switzerland', AE: 'UAE', SA: 'Saudi Arabia', TR: 'Turkey',
    MX: 'Mexico', AR: 'Argentina', ZA: 'South Africa', NG: 'Nigeria',
    EG: 'Egypt', PK: 'Pakistan', BD: 'Bangladesh', NZ: 'New Zealand',
    IE: 'Ireland', PL: 'Poland', NO: 'Norway', DK: 'Denmark',
    FI: 'Finland', PT: 'Portugal', CZ: 'Czech Republic', RO: 'Romania',
    IL: 'Israel', CL: 'Chile', CO: 'Colombia', PE: 'Peru',
  };
  return map[code] || code;
}

// ===================================================================
// User-Agent Parsing (lightweight, no dependency)
// ===================================================================
function parseUA(ua: string | undefined): { deviceType: string; browser: string; os: string } {
  if (!ua) return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };

  // Device type
  let deviceType = 'desktop';
  const uaLower = ua.toLowerCase();
  if (/bot|crawler|spider|slurp|googlebot|bingbot|baiduspider|yandex/i.test(ua)) {
    deviceType = 'bot';
  } else if (/mobile|android.*mobile|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/ipad|android(?!.*mobile)|tablet/i.test(ua)) {
    deviceType = 'tablet';
  }

  // Browser
  let browser = 'Other';
  if (uaLower.includes('edg/')) browser = 'Edge';
  else if (uaLower.includes('opr/') || uaLower.includes('opera')) browser = 'Opera';
  else if (uaLower.includes('chrome') && !uaLower.includes('edg')) browser = 'Chrome';
  else if (uaLower.includes('firefox')) browser = 'Firefox';
  else if (uaLower.includes('safari') && !uaLower.includes('chrome')) browser = 'Safari';
  else if (uaLower.includes('msie') || uaLower.includes('trident')) browser = 'IE';

  // OS
  let os = 'Other';
  if (uaLower.includes('windows')) os = 'Windows';
  else if (uaLower.includes('mac os')) os = 'macOS';
  else if (uaLower.includes('linux') && !uaLower.includes('android')) os = 'Linux';
  else if (uaLower.includes('android')) os = 'Android';
  else if (uaLower.includes('iphone') || uaLower.includes('ipad')) os = 'iOS';

  return { deviceType, browser, os };
}

// ===================================================================
// Record Visit
// ===================================================================
export async function recordVisit(params: {
  ip: string;
  path: string;
  method?: string;
  userAgent?: string;
  referer?: string;
  userId?: number;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const geo = await lookupGeo(params.ip);
    const { deviceType, browser, os } = parseUA(params.userAgent);

    const record: InsertVisitorLog = {
      ip: params.ip,
      path: params.path,
      method: params.method || 'GET',
      userAgent: params.userAgent || null,
      referer: params.referer || null,
      country: geo?.country || null,
      countryCode: geo?.countryCode || null,
      region: geo?.region || null,
      city: geo?.city || null,
      lat: geo?.lat || null,
      lon: geo?.lon || null,
      isp: geo?.isp || null,
      deviceType,
      browser,
      os,
      userId: params.userId || null,
    };

    await db.insert(visitorLogs).values(record);
  } catch (err) {
    console.warn('[VisitorTracker] Failed to record visit:', err);
  }
}

// ===================================================================
// Analytics Queries
// ===================================================================

/** Get UTC midnight for today (or N days ago). Always uses UTC to match MySQL DATE() behavior. */
function getUtcMidnight(daysAgo: number = 0): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  if (daysAgo > 0) d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

/** Format a Date to YYYY-MM-DD using UTC components */
function toUtcDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Common filter to exclude dev/build paths from analytics
const DEV_PATH_FILTER = sql.raw(`
  AND path NOT LIKE '/src/%'
  AND path NOT LIKE '/@%'
  AND path NOT LIKE '/node_modules/%'
  AND path NOT LIKE '/__vite%'
  AND path NOT LIKE '/client/%'
  AND path NOT LIKE '%.tsx'
  AND path NOT LIKE '%.ts'
  AND path NOT LIKE '%.css'
  AND path NOT LIKE '%.js'
  AND path NOT LIKE '%.map'
`);

/** Get daily PV/UV for a date range, filling in missing dates with zeros */
export async function getDailyStats(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  // Use UTC midnight for consistency across all analytics functions
  // "today" (days=1) means from UTC midnight today; "7 days" means from UTC midnight 7 days ago
  const since = getUtcMidnight(days > 1 ? days - 1 : 0);

  // Use raw SQL to avoid only_full_group_by issues
  const rows = await db.execute(
    sql`SELECT DATE(createdAt) as date, COUNT(*) as pv, COUNT(DISTINCT ip) as uv FROM visitor_logs WHERE createdAt >= ${since} ${DEV_PATH_FILTER} GROUP BY DATE(createdAt) ORDER BY DATE(createdAt)`
  );

  const rawRows = Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0]) ? rows[0] : rows;
  const dataMap = new Map<string, { pv: number; uv: number }>();
  (rawRows as any[]).forEach((r: any) => {
    // Normalize date to YYYY-MM-DD string
    const d = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10);
    dataMap.set(d, { pv: Number(r.pv), uv: Number(r.uv) });
  });

  // Fill in all dates in the range with zeros for missing days (using UTC dates)
  const result: Array<{ date: string; pv: number; uv: number }> = [];
  const todayUtc = getUtcMidnight(0);
  
  for (let d = new Date(since); d <= todayUtc; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = toUtcDateStr(d);
    const entry = dataMap.get(dateStr);
    result.push({
      date: dateStr,
      pv: entry?.pv ?? 0,
      uv: entry?.uv ?? 0,
    });
  }

  return result;
}

/** Get country distribution */
export async function getCountryStats(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const since = getUtcMidnight(days > 1 ? days - 1 : 0);

  const rows = await db
    .select({
      country: visitorLogs.country,
      countryCode: visitorLogs.countryCode,
      visits: count().as('visits'),
      uniqueIps: countDistinct(visitorLogs.ip).as('uniqueIps'),
    })
    .from(visitorLogs)
    .where(and(
      gte(visitorLogs.createdAt, since),
      sql`${visitorLogs.country} IS NOT NULL`,
      sql`${visitorLogs.path} NOT LIKE '/src/%'`,
      sql`${visitorLogs.path} NOT LIKE '/@%'`,
      sql`${visitorLogs.path} NOT LIKE '/node_modules/%'`,
      sql`${visitorLogs.path} NOT LIKE '/__vite%'`,
      sql`${visitorLogs.path} NOT LIKE '/client/%'`,
      sql`${visitorLogs.path} NOT LIKE '%.tsx'`,
      sql`${visitorLogs.path} NOT LIKE '%.ts'`,
      sql`${visitorLogs.path} NOT LIKE '%.css'`,
      sql`${visitorLogs.path} NOT LIKE '%.js'`,
      sql`${visitorLogs.path} NOT LIKE '%.map'`,
    ))
    .groupBy(visitorLogs.country, visitorLogs.countryCode)
    .orderBy(desc(sql`visits`))
    .limit(50);

  return rows;
}

/** Get city distribution */
export async function getCityStats(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const since = getUtcMidnight(days > 1 ? days - 1 : 0);

  const rows = await db
    .select({
      city: visitorLogs.city,
      country: visitorLogs.country,
      countryCode: visitorLogs.countryCode,
      visits: count().as('visits'),
      uniqueIps: countDistinct(visitorLogs.ip).as('uniqueIps'),
    })
    .from(visitorLogs)
    .where(and(
      gte(visitorLogs.createdAt, since),
      sql`${visitorLogs.city} IS NOT NULL AND ${visitorLogs.city} != ''`,
      sql`${visitorLogs.path} NOT LIKE '/src/%'`,
      sql`${visitorLogs.path} NOT LIKE '/@%'`,
      sql`${visitorLogs.path} NOT LIKE '/node_modules/%'`,
      sql`${visitorLogs.path} NOT LIKE '/__vite%'`,
      sql`${visitorLogs.path} NOT LIKE '/client/%'`,
      sql`${visitorLogs.path} NOT LIKE '%.tsx'`,
      sql`${visitorLogs.path} NOT LIKE '%.ts'`,
      sql`${visitorLogs.path} NOT LIKE '%.css'`,
      sql`${visitorLogs.path} NOT LIKE '%.js'`,
      sql`${visitorLogs.path} NOT LIKE '%.map'`,
    ))
    .groupBy(visitorLogs.city, visitorLogs.country, visitorLogs.countryCode)
    .orderBy(desc(sql`visits`))
    .limit(50);

  return rows;
}

/** Get top pages */
export async function getTopPages(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const since = getUtcMidnight(days > 1 ? days - 1 : 0);

  const rows = await db
    .select({
      path: visitorLogs.path,
      visits: count().as('visits'),
      uniqueIps: countDistinct(visitorLogs.ip).as('uniqueIps'),
    })
    .from(visitorLogs)
    .where(and(
      gte(visitorLogs.createdAt, since),
      // Filter out dev/build paths that shouldn't appear in analytics
      sql`${visitorLogs.path} NOT LIKE '/src/%'`,
      sql`${visitorLogs.path} NOT LIKE '/@%'`,
      sql`${visitorLogs.path} NOT LIKE '/node_modules/%'`,
      sql`${visitorLogs.path} NOT LIKE '/__vite%'`,
      sql`${visitorLogs.path} NOT LIKE '/client/%'`,
      sql`${visitorLogs.path} NOT LIKE '%.tsx'`,
      sql`${visitorLogs.path} NOT LIKE '%.ts'`,
      sql`${visitorLogs.path} NOT LIKE '%.css'`,
      sql`${visitorLogs.path} NOT LIKE '%.js'`,
      sql`${visitorLogs.path} NOT LIKE '%.map'`,
    ))
    .groupBy(visitorLogs.path)
    .orderBy(desc(sql`visits`))
    .limit(20);

  return rows;
}

/** Get device/browser/OS stats */
export async function getDeviceStats(days: number = 30) {
  const db = await getDb();
  if (!db) return { devices: [], browsers: [], oses: [] };

  const since = getUtcMidnight(days > 1 ? days - 1 : 0);

  const devPathFilter = [
    sql`${visitorLogs.path} NOT LIKE '/src/%'`,
    sql`${visitorLogs.path} NOT LIKE '/@%'`,
    sql`${visitorLogs.path} NOT LIKE '/node_modules/%'`,
    sql`${visitorLogs.path} NOT LIKE '/__vite%'`,
    sql`${visitorLogs.path} NOT LIKE '/client/%'`,
    sql`${visitorLogs.path} NOT LIKE '%.tsx'`,
    sql`${visitorLogs.path} NOT LIKE '%.ts'`,
    sql`${visitorLogs.path} NOT LIKE '%.css'`,
    sql`${visitorLogs.path} NOT LIKE '%.js'`,
    sql`${visitorLogs.path} NOT LIKE '%.map'`,
  ];

  const [devices, browsers, oses] = await Promise.all([
    db.select({
      name: visitorLogs.deviceType,
      count: count().as('count'),
    }).from(visitorLogs)
      .where(and(gte(visitorLogs.createdAt, since), ...devPathFilter))
      .groupBy(visitorLogs.deviceType)
      .orderBy(desc(sql`count`)),

    db.select({
      name: visitorLogs.browser,
      count: count().as('count'),
    }).from(visitorLogs)
      .where(and(gte(visitorLogs.createdAt, since), ...devPathFilter))
      .groupBy(visitorLogs.browser)
      .orderBy(desc(sql`count`)),

    db.select({
      name: visitorLogs.os,
      count: count().as('count'),
    }).from(visitorLogs)
      .where(and(gte(visitorLogs.createdAt, since), ...devPathFilter))
      .groupBy(visitorLogs.os)
      .orderBy(desc(sql`count`)),
  ]);

  return { devices, browsers, oses };
}

/** Get recent visitors */
export async function getRecentVisitors(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: visitorLogs.id,
      ip: visitorLogs.ip,
      path: visitorLogs.path,
      country: visitorLogs.country,
      countryCode: visitorLogs.countryCode,
      city: visitorLogs.city,
      region: visitorLogs.region,
      deviceType: visitorLogs.deviceType,
      browser: visitorLogs.browser,
      os: visitorLogs.os,
      referer: visitorLogs.referer,
      createdAt: visitorLogs.createdAt,
    })
    .from(visitorLogs)
    .where(and(
      sql`${visitorLogs.path} NOT LIKE '/src/%'`,
      sql`${visitorLogs.path} NOT LIKE '/@%'`,
      sql`${visitorLogs.path} NOT LIKE '/node_modules/%'`,
      sql`${visitorLogs.path} NOT LIKE '/__vite%'`,
      sql`${visitorLogs.path} NOT LIKE '/client/%'`,
      sql`${visitorLogs.path} NOT LIKE '%.tsx'`,
      sql`${visitorLogs.path} NOT LIKE '%.ts'`,
      sql`${visitorLogs.path} NOT LIKE '%.css'`,
      sql`${visitorLogs.path} NOT LIKE '%.js'`,
      sql`${visitorLogs.path} NOT LIKE '%.map'`,
    ))
    .orderBy(desc(visitorLogs.createdAt))
    .limit(limit);

  return rows;
}

/** Get today's summary */
export async function getTodaySummary() {
  const db = await getDb();
  if (!db) return { todayPV: 0, todayUV: 0, totalPV: 0, totalUV: 0, topCountry: null };

  const today = getUtcMidnight(0);

  // Reusable dev path filter for Drizzle where clauses — must match DEV_PATH_FILTER
  const devPathFilter = [
    sql`${visitorLogs.path} NOT LIKE '/src/%'`,
    sql`${visitorLogs.path} NOT LIKE '/@%'`,
    sql`${visitorLogs.path} NOT LIKE '/node_modules/%'`,
    sql`${visitorLogs.path} NOT LIKE '/__vite%'`,
    sql`${visitorLogs.path} NOT LIKE '/client/%'`,
    sql`${visitorLogs.path} NOT LIKE '%.tsx'`,
    sql`${visitorLogs.path} NOT LIKE '%.ts'`,
    sql`${visitorLogs.path} NOT LIKE '%.css'`,
    sql`${visitorLogs.path} NOT LIKE '%.js'`,
    sql`${visitorLogs.path} NOT LIKE '%.map'`,
  ];

  const [todayStats, totalStats, topCountry] = await Promise.all([
    db.select({
      pv: count().as('pv'),
      uv: countDistinct(visitorLogs.ip).as('uv'),
    }).from(visitorLogs).where(and(gte(visitorLogs.createdAt, today), ...devPathFilter)),

    db.select({
      pv: count().as('pv'),
      uv: countDistinct(visitorLogs.ip).as('uv'),
    }).from(visitorLogs).where(and(...devPathFilter)),

    db.select({
      country: visitorLogs.country,
      visits: count().as('visits'),
    }).from(visitorLogs)
      .where(and(gte(visitorLogs.createdAt, today), sql`${visitorLogs.country} IS NOT NULL`, ...devPathFilter))
      .groupBy(visitorLogs.country)
      .orderBy(desc(sql`visits`))
      .limit(1),
  ]);

  return {
    todayPV: todayStats[0]?.pv ?? 0,
    todayUV: todayStats[0]?.uv ?? 0,
    totalPV: totalStats[0]?.pv ?? 0,
    totalUV: totalStats[0]?.uv ?? 0,
    topCountry: topCountry[0]?.country ?? null,
  };
}

/** Get hourly distribution for today */
export async function getHourlyStats() {
  const db = await getDb();
  if (!db) return [];

  const today = getUtcMidnight(0);

  // Use raw SQL to avoid Drizzle ORM GROUP BY expression mismatch with only_full_group_by
  const rows = await db.execute(
    sql`SELECT HOUR(createdAt) as hour, COUNT(*) as pv, COUNT(DISTINCT ip) as uv FROM visitor_logs WHERE createdAt >= ${today} ${DEV_PATH_FILTER} GROUP BY HOUR(createdAt) ORDER BY HOUR(createdAt)`
  );

  // db.execute returns [[rows], fields] — extract the inner rows array
  const rawRows = Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0]) ? rows[0] : rows;
  return (rawRows as any[]).map((r: any) => ({
    hour: Number(r.hour),
    pv: Number(r.pv),
    uv: Number(r.uv),
  }));
}
