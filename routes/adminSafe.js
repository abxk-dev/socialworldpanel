const express = require("express");
const adminSettingsHandler = require("../lib/handlers/admin/settings");
const { getDb } = require("../lib/db");
const { ObjectId } = require("mongodb");
const upiPaymentHandlers = require("../lib/handlers/upiPayment");
const cryptomusPaymentHandlers = require("../lib/handlers/cryptomusPayment");
const manualQrPaymentHandlers = require("../lib/handlers/manualQrPayment");
const cashfreePaymentHandlers = require("../lib/handlers/cashfreeSettings");
const gcashPaymentHandlers = require("../lib/handlers/gcashPayment");
const refreshProviderChargesHandler = require("../lib/handlers/admin/orders/refresh-provider-charges");
const syncProviderStatusesHandler = require("../lib/handlers/admin/orders/sync-provider-statuses");
const { providerFetchOrderStatus } = require("../lib/providerSmmApi");
const { getCache, setCache, invalidateAllOrderLists } = require("../lib/cache/orderListCache");
const { expandUserIdsForIn } = require("../lib/mongoUserId");
const { buildAdminUsersFilter } = require("../lib/buildAdminUsersFilter");
const usersBulkHandler = require("../lib/handlers/admin/users-bulk");

const router = express.Router();

// This router is a "safe" fallback for local dev.
// Your repo snapshot is missing many real admin handler modules, which makes
// `routes/admin.js` fail to load entirely (and then `/api/admin/*` returns 503).
// These stubs keep the admin UI from being completely broken.

function ensureLocalTheme() {
  if (!globalThis.__swpLocalAdminTheme) {
    globalThis.__swpLocalAdminTheme = {
      enabled: false,
      primary: "#00e0ff",
      mode: "dark",
      cursor: "default",
    };
  }
  return globalThis.__swpLocalAdminTheme;
}

function ensureLocalStatsSettings() {
  if (!globalThis.__swpLocalAdminStatsSettings) {
    globalThis.__swpLocalAdminStatsSettings = {
      base_orders: 0,
      base_users: 0,
      base_services: 0,
      base_orders_today: 0,
      auto_increment: false,
      increment_min: 1,
      increment_max: 5,
      increment_interval: 5,
    };
  }
  return globalThis.__swpLocalAdminStatsSettings;
}

async function safeGetDb() {
  try {
    // getDb() will connect if needed. Mongo DNS can be flaky, so fail fast
    // to avoid blocking admin pages.
    const timeoutMs = Number(process.env.SWP_ADMIN_DB_TIMEOUT_MS || 1500);
    const p = getDb();
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DB_CONNECT_TIMEOUT")), timeoutMs)
    );
    return await Promise.race([p, timeout]);
  } catch (_) {
    return null;
  }
}

function getAdminCache() {
  if (!globalThis.__swpAdminCache) globalThis.__swpAdminCache = {};
  return globalThis.__swpAdminCache;
}

function toObjectId(maybeId) {
  if (!maybeId) return maybeId;
  if (maybeId instanceof ObjectId) return maybeId;
  if (typeof maybeId === "string" && ObjectId.isValid(maybeId)) return new ObjectId(maybeId);
  return maybeId;
}

function parseIsoRange(startDate, endDate, defaultDaysAgo = 30, defaultEndNow = true) {
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getTime() - defaultDaysAgo * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : (defaultEndNow ? now : new Date(now.getTime()));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeProviderOrderStatus(statusText, currentStatus) {
  const cur = String(currentStatus || "").toLowerCase();
  const s = String(statusText || "").toLowerCase();
  if (!s) return cur;
  if (s.includes("complete")) return "completed";
  if (s.includes("partial")) return "partial";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("fail") || s.includes("error")) return "failed";
  if (s.includes("process") || s.includes("progress")) return "in_progress";
  if (s.includes("pend")) return "pending";
  return cur;
}

async function loadProviderByAnyId(db, providerId) {
  const sid = String(providerId || "").trim();
  if (!sid) return null;
  const or = [{ provider_id: sid }, { _id: sid }];
  if (ObjectId.isValid(sid)) {
    try { or.push({ _id: new ObjectId(sid) }); } catch (_) {}
  }
  return db.collection("providers").findOne({ $or: or });
}

router.get("/dashboard", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) {
      return res.json({
        revenue_today: 0,
        profit_today: 0,
        revenue_total: 0,
        total_profit: 0,
        pending_orders: 0,
        processing_orders: 0,
        total_users: 0,
        new_users_today: 0,
        active_providers: 0,
        low_balance_providers: [],
      });
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const revenueTodayAgg = await db
      .collection("orders")
      .aggregate([
        {
          $match: {
            created_at: { $gte: startOfToday },
            status: { $in: ["completed", "partial"] },
          },
        },
        {
          $lookup: {
            from: "services",
            localField: "service_id",
            foreignField: "service_id",
            as: "service_docs",
          },
        },
        {
          $unwind: {
            path: "$service_docs",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: null,
            revenue_today: {
              $sum: { $toDouble: { $ifNull: ["$price", 0] } },
            },
            // cost = (services.cost / 1000) * orders.quantity
            cost_today: {
              $sum: {
                $multiply: [
                  {
                    $divide: [
                      { $toDouble: { $ifNull: ["$service_docs.cost", 0] } },
                      1000,
                    ],
                  },
                  { $toDouble: { $ifNull: ["$quantity", 0] } },
                ],
              },
            },
          },
        },
      ])
      .toArray();
    const revenueToday = revenueTodayAgg[0]?.revenue_today ?? 0;
    const costToday = revenueTodayAgg[0]?.cost_today ?? 0;
    const profitToday = revenueToday - costToday;

    const revenueTotalAgg = await db
      .collection("orders")
      .aggregate([
        { $match: { status: { $in: ["completed", "partial"] } } },
        {
          $lookup: {
            from: "services",
            localField: "service_id",
            foreignField: "service_id",
            as: "service_docs",
          },
        },
        {
          $unwind: {
            path: "$service_docs",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: null,
            revenue_total: {
              $sum: { $toDouble: { $ifNull: ["$price", 0] } },
            },
            // cost = (services.cost / 1000) * orders.quantity
            cost_total: {
              $sum: {
                $multiply: [
                  {
                    $divide: [
                      { $toDouble: { $ifNull: ["$service_docs.cost", 0] } },
                      1000,
                    ],
                  },
                  { $toDouble: { $ifNull: ["$quantity", 0] } },
                ],
              },
            },
          },
        },
      ])
      .toArray();
    const revenueTotal = revenueTotalAgg[0]?.revenue_total ?? 0;
    const costTotal = revenueTotalAgg[0]?.cost_total ?? 0;
    const profitTotal = revenueTotal - costTotal;

    const totalUsers = await db.collection("users").countDocuments({});
    const newUsersToday = await db.collection("users").countDocuments({ created_at: { $gte: startOfToday } });

    const providers = await db
      .collection("providers")
      .find({})
      .project({ provider_id: 1, balance: 1, balance_threshold: 1, is_active: 1, status: 1 })
      .limit(500)
      .toArray();

    const activeProviders = providers.filter(
      (p) => p?.is_active !== false && String(p?.status || "active").toLowerCase() !== "inactive"
    );

    const lowBalanceProviders = providers.filter((p) => {
      const threshold = p?.balance_threshold;
      const bal = p?.balance;
      if (threshold == null || bal == null) return false;
      const t = Number(threshold);
      const b = Number(bal);
      return Number.isFinite(t) && Number.isFinite(b) && b <= t;
    });

    const pendingOrders = await db.collection("orders").countDocuments({ status: "pending" });
    const processingOrders = await db.collection("orders").countDocuments({ status: { $in: ["processing", "in_progress"] } });

    return res.json({
      revenue_today: revenueToday,
      profit_today: Math.round(profitToday * 100) / 100,
      revenue_total: revenueTotal,
      total_profit: Math.round(profitTotal * 100) / 100,
      pending_orders: pendingOrders,
      processing_orders: processingOrders,
      total_users: totalUsers,
      new_users_today: newUsersToday,
      active_providers: activeProviders.length,
      low_balance_providers: lowBalanceProviders.map((p) => p.provider_id).filter(Boolean),
    });
  } catch (_) {
    return res.json({
      revenue_today: 0,
      profit_today: 0,
      revenue_total: 0,
      total_profit: 0,
      pending_orders: 0,
      processing_orders: 0,
      total_users: 0,
      new_users_today: 0,
      active_providers: 0,
      low_balance_providers: [],
    });
  }
});

// Basic admin "nav" config used by `AdminLayout` and `AdminMenu`.
router.get("/admin-nav", async (req, res) => {
  // Frontend merges this with DEFAULT_ADMIN_NAV_CONFIG.
  // Returning empty keeps all default items visible.
  return res.json({ admin_nav: globalThis.__swpLocalAdminNav || [] });
});

router.put("/admin-nav", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const admin_nav = body.admin_nav;
  globalThis.__swpLocalAdminNav = Array.isArray(admin_nav) ? admin_nav : [];
  return res.json({ ok: true, admin_nav: globalThis.__swpLocalAdminNav });
});

// Tickets/withdrawal stats badges used in `AdminLayout`
router.get("/tickets", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.tickets || { total: 0, tickets: [] });

    const status = req.query?.status;
    const limit = req.query?.limit ? Number(req.query.limit) : null;

    const filter = {};
    if (status && status !== "all") filter.status = String(status);

    const total = await db.collection("tickets").countDocuments(filter);
    let cursor = db.collection("tickets").find(filter).sort({ created_at: -1 });
    if (limit && Number.isFinite(limit) && limit > 0) cursor = cursor.limit(limit);
    const tickets = await cursor.toArray();

    const userIds = tickets.map((t) => t.user_id).filter(Boolean);
    const users = userIds.length
      ? await db
          .collection("users")
          .find({ user_id: { $in: userIds } })
          .project({ user_id: 1, email: 1, username: 1, name: 1 })
          .toArray()
      : [];
    const userById = Object.fromEntries(users.map((u) => [u.user_id, u]));

    const normalized = tickets.map((t) => {
      const u = userById[t.user_id] || {};
      return {
        ...t,
        user_email: u.email,
        user_username: u.username,
        user_name: u.name,
      };
    });

    const result = { total, tickets: normalized };
    cache.tickets = result;
    return res.json(result);
  } catch (_) {
    return res.json({ total: 0, tickets: [] });
  }
});

// Ticket replies for `AdminTickets`
router.get("/tickets/:ticketId", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) {
      const replies = cache.ticketReplies?.[req.params?.ticketId] || [];
      const messages = replies.map((r, i) => ({
        message_id: r.message_id || `msg_${i}`,
        is_admin: r.is_admin === true || r.by === "admin",
        message: r.message ?? r.text ?? "",
        created_at: r.created_at || new Date().toISOString(),
      }));
      return res.json({ replies, messages });
    }
    const ticketId = String(req.params?.ticketId || "");
    const idFilters = [{ ticket_id: ticketId }];
    const numericId = Number(ticketId);
    if (Number.isFinite(numericId)) idFilters.push({ ticket_id: numericId });
    const ticket = await db.collection("tickets").findOne({ $or: idFilters });
    const replies = Array.isArray(ticket?.replies) ? ticket.replies : [];
    const messages = replies.map((r, i) => ({
      message_id: r.message_id || `msg_${i}`,
      is_admin: r.is_admin === true || r.by === "admin",
      message: r.message ?? r.text ?? "",
      created_at: r.created_at || new Date().toISOString(),
    }));
    if (replies) {
      if (!cache.ticketReplies) cache.ticketReplies = {};
      cache.ticketReplies[ticketId] = replies;
    }
    return res.json({ replies, messages, ticket });
  } catch (_) {
    return res.json({ replies: [], messages: [] });
  }
});

router.get("/withdrawals/stats", async (req, res) => {
  return res.json({ pending_count: 0 });
});

router.get("/dashboard/charts", async (req, res) => {
  const empty = {
    revenue_by_day: [],
    users_by_day: [],
    orders_by_status: [],
    revenue_by_method: [],
    top_services: [],
  };
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.dashboardCharts || empty);

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);

    // Pre-build 30-day buckets so charts keep consistent x-axis.
    const dayBuckets = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dayBuckets.push({ key, label });
    }
    const revenueByDayMap = {};
    const usersByDayMap = {};
    const ordersByStatusMap = {};
    const revenueByMethodMap = {};
    const topServicesMap = {};

    // NOTE: In this codebase, `created_at` is stored as an ISO string in Mongo.
    // Mongo `$gte` comparisons can fail (string vs Date), so we group in JS instead.
    const orders = await db.collection("orders").find({}).sort({ created_at: -1 }).limit(5000).toArray();
    for (const o of orders) {
      const dt = o?.created_at ? new Date(o.created_at) : null;
      if (!dt || Number.isNaN(dt.getTime())) continue;
      if (dt < from) continue;

      const dayKey = dt.toISOString().slice(0, 10);
      const status = o?.status || "unknown";
      ordersByStatusMap[status] = (ordersByStatusMap[status] || 0) + 1;

      if (["completed", "partial"].includes(status)) {
        const price = Number(o?.price ?? 0);
        revenueByDayMap[dayKey] = revenueByDayMap[dayKey] || 0;
        revenueByDayMap[dayKey] += Number.isFinite(price) ? price : 0;

        const method = o?.mode || "unknown";
        revenueByMethodMap[method] = revenueByMethodMap[method] || 0;
        revenueByMethodMap[method] += Number.isFinite(price) ? price : 0;

        const sid = o?.service_id;
        if (sid) topServicesMap[sid] = (topServicesMap[sid] || 0) + 1;
      }
    }

    const users = await db.collection("users").find({}).sort({ created_at: -1 }).limit(5000).toArray();
    for (const u of users) {
      const dt = u?.created_at ? new Date(u.created_at) : null;
      if (!dt || Number.isNaN(dt.getTime())) continue;
      if (dt < from) continue;
      const dayKey = dt.toISOString().slice(0, 10);
      usersByDayMap[dayKey] = (usersByDayMap[dayKey] || 0) + 1;
    }

    const revenue_by_day = dayBuckets.map((b) => ({
      label: b.label,
      revenue: revenueByDayMap[b.key] ?? 0,
      profit: 0,
    }));
    const users_by_day = dayBuckets.map((b) => ({
      label: b.label,
      users: usersByDayMap[b.key] ?? 0,
    }));
    const orders_by_status = Object.entries(ordersByStatusMap).map(([status, count]) => ({ status, count }));
    const revenue_by_method = Object.entries(revenueByMethodMap).map(([method, amount]) => ({ method, amount }));

    const topServiceIds = Object.entries(topServicesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sid]) => sid);
    const services = topServiceIds.length
      ? await db
          .collection("services")
          .find({ service_id: { $in: topServiceIds } })
          .project({ service_id: 1, name: 1 })
          .toArray()
      : [];
    const serviceById = Object.fromEntries(services.map((s) => [s.service_id, s]));
    const top_services = Object.entries(topServicesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sid, orders]) => ({
        name: serviceById[sid]?.name || sid || "—",
        orders,
      }));

    const result = { revenue_by_day, users_by_day, orders_by_status, revenue_by_method, top_services };
    cache.dashboardCharts = result;
    return res.json(result);
  } catch (_) {
    return res.json(empty);
  }
});

// AdminAdvanced: homepage stats + theme
router.get("/theme", async (req, res) => {
  return res.json({ theme: ensureLocalTheme() });
});

router.put("/theme", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const incomingTheme =
    body.theme && typeof body.theme === "object" ? body.theme : (body || {});

  const next = { ...ensureLocalTheme(), ...incomingTheme };
  globalThis.__swpLocalAdminTheme = next;
  return res.json({ ok: true, theme: next });
});

router.get("/stats-settings", async (req, res) => {
  return res.json(ensureLocalStatsSettings());
});

router.put("/stats-settings", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const next = { ...ensureLocalStatsSettings(), ...body };
  globalThis.__swpLocalAdminStatsSettings = next;
  return res.json({ ok: true, stats: next });
});

// AdminAdvanced: write files (no-op stub)
router.post("/files", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const filePath = body.file_path || body.filePath || "";
  if (!filePath) return res.json({ ok: false, error: "file_path missing" });
  return res.json({ ok: true, file_path: filePath });
});

router.get("/recommendations/stats", async (req, res) => {
  return res.json({
    requests_today: 0,
    requests_week: 0,
    conversion_rate: 0,
    conversion_rate_pct: 0,
    top_recommended: [],
  });
});

// Admin settings
router.get("/settings", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({});

    const settings = await db.collection("admin_settings")
      .findOne({ panel_name: { $exists: true } });

    if (!settings) return res.json({});
    const { cryptomus, smtp_password: _smtpDrop, ...safe } = settings;

    return res.json({
      ...safe,
      cryptomus: cryptomus
        ? {
            ...cryptomus,
            api_key: cryptomus.api_key ? "***" : "",
            webhook_secret: "***",
          }
        : {},
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/settings", async (req, res) => adminSettingsHandler(req, res));

// Loyalty settings
router.get("/loyalty", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ settings: {} });

    const settings = await db.collection("loyalty_settings").findOne({});
    return res.json({
      success: true,
      settings: settings || {
        enabled: false,
        tiers: {
          bronze: { min: 0, cashback_pct: 0, pts_per_dollar: 0 },
          silver: { min: 50, cashback_pct: 0, pts_per_dollar: 0 },
          gold: { min: 200, cashback_pct: 0, pts_per_dollar: 0 },
          platinum: { min: 500, cashback_pct: 0, pts_per_dollar: 0 },
        },
        points_per_dollar: 100,
        min_redemption_points: 100,
        hold_hours: 24,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/loyalty", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false });

    const updates = { ...(req.body || {}), updated_at: new Date().toISOString() };
    await db.collection("loyalty_settings").updateOne({}, { $set: updates }, { upsert: true });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// SEO settings
router.get("/seo", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ seo_pages: {} });

    const settings = await db.collection("admin_settings")
      .findOne({ panel_name: { $exists: true } });

    return res.json({
      success: true,
      seo_pages: settings?.seo_pages || {},
      seo_meta: settings?.seo_meta || {},
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/seo", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false });

    const { seo_pages, seo_meta } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (seo_pages) updates.seo_pages = seo_pages;
    if (seo_meta) updates.seo_meta = seo_meta;

    await db.collection("admin_settings").updateOne(
      { panel_name: { $exists: true } },
      { $set: updates },
      { upsert: true }
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/seo/:page", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false });

    const { page } = req.params;
    const { title, description, keywords } = req.body || {};
    const updateKey = `seo_pages.${page}`;
    await db.collection("admin_settings").updateOne(
      { panel_name: { $exists: true } },
      {
        $set: {
          [updateKey]: { title, description, keywords },
          updated_at: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Reviews list with service-name enrichment.
router.get("/reviews", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ reviews: [] });

    const reviews = await db.collection("reviews")
      .find({})
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    const serviceIds = [...new Set(reviews.map((r) => r.service_id).filter(Boolean))];
    const services = serviceIds.length
      ? await db.collection("services")
          .find({ service_id: { $in: serviceIds } })
          .project({ service_id: 1, name: 1 })
          .toArray()
      : [];

    const serviceMap = {};
    services.forEach((s) => {
      serviceMap[s.service_id] = s.name;
    });

    const enriched = reviews.map((r) => ({
      ...r,
      service_name: r.service_name || serviceMap[r.service_id] || r.service_id || "—",
    }));

    return res.json({ success: true, reviews: enriched });
  } catch (err) {
    return res.json({ reviews: [] });
  }
});

// Free trial
router.get("/free-trial/settings", (req, res) => {
  const g = globalThis.__swpLocalAdminSettings || {};
  return res.json({
    free_trial_enabled: g.free_trial_enabled === true,
    free_trial_service_id: g.free_trial_service_id ?? "",
    free_trial_quantity: Number(g.free_trial_quantity) || 50,
    free_trial_label: g.free_trial_label ?? "50 YouTube Views",
    free_trial_show_on_homepage: g.free_trial_show_on_homepage !== false,
    free_trial_link_placeholder: g.free_trial_link_placeholder ?? "Paste your link",
    free_trial_disclaimer: g.free_trial_disclaimer ?? "One per account. Results typically in 1–6 hours.",
    free_trial_modal_title: g.free_trial_modal_title ?? "Claim Your Free Trial",
    free_trial_button_text: g.free_trial_button_text ?? "Claim Now — It's Free!",
  });
});

router.get("/free-trial/stats", (req, res) => {
  return res.json({
    total_trials_used: 0,
    converted_to_paid: 0,
    conversion_rate_pct: 0,
    revenue_from_converted: 0,
  });
});

router.post("/free-trial/settings", (req, res) => {
  const b = req.body && typeof req.body === "object" ? req.body : {};
  const sid = String(b.service_id || "")
    .trim()
    .replace(/^#/, "");
  globalThis.__swpLocalAdminSettings = {
    ...(globalThis.__swpLocalAdminSettings || {}),
    free_trial_enabled: !!b.enabled,
    free_trial_service_id: sid,
    free_trial_quantity: Math.max(1, parseInt(b.quantity, 10) || 50),
    free_trial_label: String(b.label || "").trim() || "50 YouTube Views",
    free_trial_show_on_homepage: b.show_on_homepage !== false,
    free_trial_link_placeholder: String(b.link_placeholder || "").trim() || "Paste your link",
    free_trial_disclaimer: String(b.disclaimer || "").trim(),
    free_trial_modal_title: String(b.modal_title || "").trim() || "Claim Your Free Trial",
    free_trial_button_text: String(b.button_text || "").trim() || "Claim Now — It's Free!",
    updated_at: new Date().toISOString(),
  };
  return res.json({ ok: true, success: true });
});

// Live feed settings
router.get("/live-feed/settings", (req, res) => {
  const g = globalThis.__swpLocalAdminSettings || {};
  return res.json({
    live_feed_enabled: g.live_feed_enabled !== false,
    live_feed_show_country: g.live_feed_show_country !== false,
    live_feed_speed_ms: Number(g.live_feed_speed_ms) || 3000,
    live_feed_show_toast: g.live_feed_show_toast !== false,
  });
});

router.post("/live-feed/settings", (req, res) => {
  const b = req.body && typeof req.body === "object" ? req.body : {};
  const speed = Math.min(60000, Math.max(1000, parseInt(b.speed_ms, 10) || 3000));
  globalThis.__swpLocalAdminSettings = {
    ...(globalThis.__swpLocalAdminSettings || {}),
    live_feed_enabled: b.enabled !== false,
    live_feed_show_country: b.show_country !== false,
    live_feed_speed_ms: speed,
    live_feed_show_toast: b.show_toast !== false,
    updated_at: new Date().toISOString(),
  };
  return res.json({ ok: true, success: true });
});

// Admin: user management table (`/admin/users?page=1&limit=20...`)
router.get("/users", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.users || { users: [], pages: 1, countries: [] });

    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.max(1, Number(req.query?.limit || 20));
    const filter = buildAdminUsersFilter(req.query || {});

    const total = await db.collection("users").countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;

    const docs = await db
      .collection("users")
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const users = docs.map((u) => {
      const userId = u.user_id ?? u.userId ?? (u._id ? String(u._id) : undefined);
      const isActive = u.is_active !== false;
      const isSuspended = u.is_suspended === true || !isActive;
      return { ...u, user_id: userId, is_active: isActive, is_suspended: isSuspended };
    });

    const uidList = [...new Set(users.map((u) => String(u.user_id)).filter(Boolean))];
    const uidMatchList = expandUserIdsForIn(uidList);
    let latestFromHistory = {};
    if (uidMatchList.length) {
      const rows = await db
        .collection("user_login_history")
        .aggregate([
          { $match: { user_id: { $in: uidMatchList } } },
          { $sort: { logged_in_at: -1 } },
          {
            $group: {
              _id: "$user_id",
              last_ip: { $first: "$ip_address" },
              last_at: { $first: "$logged_in_at" },
            },
          },
        ])
        .toArray();
      for (const r of rows) {
        const id = String(r._id);
        latestFromHistory[id] = {
          ip: r.last_ip ? String(r.last_ip) : null,
          at: r.last_at || null,
        };
      }
    }

    const enriched = users.map((u) => {
      const uid = String(u.user_id || "");
      const hist = uid ? latestFromHistory[uid] : null;
      const displayIp = u.last_login_ip || u.last_ip || hist?.ip || null;
      const displayAt = u.last_login_at || hist?.at || null;
      const { password_hash, password, ...rest } = u;
      return {
        ...rest,
        last_login_ip: displayIp ?? u.last_login_ip,
        last_login_at: displayAt ?? u.last_login_at,
      };
    });

    const [locCodes, topCodes] = await Promise.all([
      db.collection("users").distinct("location.country_code"),
      db.collection("users").distinct("country_code"),
    ]);
    const countries = [
      ...new Set(
        [...(locCodes || []), ...(topCodes || [])]
          .filter(Boolean)
          .map((c) => String(c).trim().toUpperCase().slice(0, 2))
          .filter((c) => c.length === 2)
      ),
    ].sort();

    const result = { users: enriched, pages, countries, total };
    cache.users = result;
    return res.json(result);
  } catch (_) {
    return res.json({ users: [], pages: 1, countries: [] });
  }
});

router.post("/users/bulk", (req, res) => usersBulkHandler(req, res));

// Services/Providers/orders endpoints used by Admin pages.
router.get("/services", (req, res) => {
  // Prefer real DB when available, so admin UI isn't empty.
  (async () => {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.services || []);
    const docs = await db.collection("services").find({}).limit(5000).toArray();
    cache.services = docs;
    return res.json(docs);
  })().catch(() => res.json([]));
});

router.get("/providers", (req, res) => {
  (async () => {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.providers || { providers: [] });
    const docs = await db.collection("providers").find({}).limit(2000).toArray();
    const result = { providers: docs };
    cache.providers = result;
    return res.json(result);
  })().catch(() => res.json({ providers: [] }));
});

// Category management (AdminServices uses `/admin/category-management/flat`)
router.get("/category-management/flat", (req, res) => {
  (async () => {
    const db = await safeGetDb();
    if (!db) {
      const cache = getAdminCache();
      return res.json({ success: true, categories: cache.categories || [] });
    }
    const docs = await db.collection("categories").find({}).limit(5000).toArray();
    const cache = getAdminCache();
    cache.categories = docs;
    return res.json({ success: true, categories: docs });
  })().catch(() => res.json({ success: true, categories: [] }));
});

// Category management full endpoint used by `CategoryManagement.jsx`
// Returns platforms with their categories grouped + ordered.
router.get("/category-management", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json({ platforms: cache.categoryPlatforms || [] });

    const platforms = await db
      .collection("platforms")
      .find({})
      .sort({ priority: 1 })
      .toArray();

    const categories = await db
      .collection("categories")
      .find({})
      .sort({ platform_id: 1, sort_order: 1 })
      .toArray();

    const byPlatformId = new Map();
    for (const cat of categories) {
      const pid = cat?.platform_id ? String(cat.platform_id) : null;
      if (!pid) continue;
      const arr = byPlatformId.get(pid) || [];
      arr.push(cat);
      byPlatformId.set(pid, arr);
    }

    const outPlatforms = platforms.map((p, idx) => {
      const pid = p?._id ? String(p._id) : null;
      const cats = pid && byPlatformId.get(pid) ? byPlatformId.get(pid) : [];
      const orderedCats = cats.map((c, i) => ({ ...c, sort_order: c.sort_order ?? i + 1 }));
      const categories_count = orderedCats.length;
      return {
        ...p,
        categories: orderedCats,
        categories_count,
        // UI expects `slug` for move menu and DnD. (DB uses `slug` already)
        slug: p.slug || p.platform_slug || p.platformSlug || `platform_${idx}`,
      };
    });

    cache.categoryPlatforms = outPlatforms;
    return res.json({ platforms: outPlatforms });
  } catch (_) {
    const cache = getAdminCache();
    return res.json({ platforms: cache.categoryPlatforms || [] });
  }
});

router.put("/category-management/move", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false, error: "Database unavailable" });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const category_id = body.category_id;
    const new_platform_slug = body.new_platform_slug;
    if (!category_id || !new_platform_slug) {
      return res.json({ success: false, error: "category_id and new_platform_slug are required" });
    }

    const catId = toObjectId(category_id);
    const newPlatform = await db.collection("platforms").findOne({ slug: new_platform_slug });
    if (!newPlatform) {
      return res.json({ success: false, error: "Target platform not found" });
    }

    const newSortOrder =
      (await db.collection("categories").countDocuments({ platform_id: newPlatform._id })) + 1;

    await db.collection("categories").updateOne(
      { _id: catId },
      {
        $set: {
          platform_id: newPlatform._id,
          platform_name: newPlatform.name,
          platform_slug: newPlatform.slug,
          sort_order: newSortOrder,
          updated_at: new Date().toISOString(),
        },
      }
    );

    return res.json({ success: true });
  } catch (e) {
    return res.json({ success: false, error: e?.message || "Move failed" });
  }
});

router.put("/category-management/reorder", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false, error: "Database unavailable" });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const platformsPayload = Array.isArray(body.platforms) ? body.platforms : [];
    if (!platformsPayload.length) return res.json({ success: true });

    for (const p of platformsPayload) {
      if (!p?.platform_id) continue;
      const platformId = toObjectId(p.platform_id);
      if (typeof p.priority === "number" && platformId) {
        await db
          .collection("platforms")
          .updateOne({ _id: platformId }, { $set: { priority: p.priority } });
      }

      const cats = Array.isArray(p.categories) ? p.categories : [];
      for (const c of cats) {
        if (!c?.category_id) continue;
        const catId = toObjectId(c.category_id);
        const sortOrder = typeof c.sort_order === "number" ? c.sort_order : null;
        const set = { updated_at: new Date().toISOString() };
        if (sortOrder != null) set.sort_order = sortOrder;
        await db.collection("categories").updateOne({ _id: catId }, { $set: set });
      }
    }

    // Cache invalidation
    const cache = getAdminCache();
    delete cache.categoryPlatforms;
    return res.json({ success: true });
  } catch (e) {
    return res.json({ success: false, error: e?.message || "Reorder failed" });
  }
});

router.post("/category-management/migrate", async (req, res) => {
  // For now, just regroup based on existing `platform_slug`/`platform_id`.
  // This keeps the UI functional even when full migration logic is missing.
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false, error: "Database unavailable" });
    return res.json({ success: true });
  } catch (e) {
    return res.json({ success: false, error: e?.message || "Migration failed" });
  }
});

router.post("/category-management/categories", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false, error: "Database unavailable" });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const name = String(body.name || "").trim();
    const platform_id = toObjectId(body.platform_id);
    if (!name) return res.json({ success: false, error: "name is required" });
    if (!platform_id) return res.json({ success: false, error: "platform_id is required" });

    const platform = await db.collection("platforms").findOne({ _id: platform_id });
    if (!platform) return res.json({ success: false, error: "Platform not found" });

    const sort_order =
      (await db.collection("categories").countDocuments({ platform_id })) + 1;
    const now = new Date().toISOString();

    await db.collection("categories").insertOne({
      name,
      platform_id: platform._id,
      platform_name: platform.name,
      platform_slug: platform.slug,
      sort_order,
      is_active: true,
      is_visible: true,
      services_count: 0,
      created_at: now,
      updated_at: now,
      // keep these optional fields aligned with existing docs (if your schema expects them)
      slug: platform.slug ? `${platform.slug}_${name.toLowerCase().replace(/\\s+/g, "_")}` : undefined,
      icon: platform.icon,
      priority: platform.priority,
    });

    const cache = getAdminCache();
    delete cache.categoryPlatforms;
    return res.json({ success: true });
  } catch (e) {
    return res.json({ success: false, error: e?.message || "Create failed" });
  }
});

router.put("/category-management/categories/:id", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false, error: "Database unavailable" });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const id = req.params?.id;
    if (!id) return res.json({ success: false, error: "id is required" });

    const catId = toObjectId(id);
    if (!catId) return res.json({ success: false, error: "Invalid id" });

    const update = { updated_at: new Date().toISOString() };
    if (typeof body.is_active !== "undefined") update.is_active = !!body.is_active;
    if (typeof body.is_visible !== "undefined") update.is_visible = !!body.is_visible;

    if (body.name) update.name = String(body.name).trim();

    if (body.platform_id) {
      const platform = await db.collection("platforms").findOne({ _id: body.platform_id });
      if (!platform) return res.json({ success: false, error: "Platform not found" });
      update.platform_id = platform._id;
      update.platform_name = platform.name;
      update.platform_slug = platform.slug;

      // If moving platforms, place at end (unless caller also sets sort_order)
      if (typeof body.sort_order === "number") {
        update.sort_order = body.sort_order;
      } else {
        update.sort_order = (await db.collection("categories").countDocuments({ platform_id: platform._id })) + 1;
      }
    }

    await db.collection("categories").updateOne({ _id: catId }, { $set: update });
    const cache = getAdminCache();
    delete cache.categoryPlatforms;
    return res.json({ success: true });
  } catch (e) {
    return res.json({ success: false, error: e?.message || "Update failed" });
  }
});

router.delete("/category-management/categories/:id", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false, error: "Database unavailable" });

    const id = req.params?.id;
    if (!id) return res.json({ success: false, error: "id is required" });

    const catId = toObjectId(id);
    if (!catId) return res.json({ success: false, error: "Invalid id" });

    await db.collection("categories").deleteOne({ _id: catId });
    const cache = getAdminCache();
    delete cache.categoryPlatforms;
    return res.json({ success: true });
  } catch (e) {
    return res.json({ success: false, error: e?.message || "Delete failed" });
  }
});

// Hidden services config (AdminServices + AdminUsers uses this)
router.get("/hidden-services", (req, res) => {
  return res.json({
    hidden_service_ids: Array.isArray(globalThis.__swpLocalHiddenServiceIds)
      ? globalThis.__swpLocalHiddenServiceIds
      : [],
    hidden_access:
      (globalThis.__swpLocalHiddenServiceAccess &&
        typeof globalThis.__swpLocalHiddenServiceAccess === "object" &&
        globalThis.__swpLocalHiddenServiceAccess) ||
      {},
  });
});

router.put("/hidden-services", (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const ids = Array.isArray(body.hidden_service_ids) ? body.hidden_service_ids : [];
  const access = body.hidden_access && typeof body.hidden_access === "object" ? body.hidden_access : {};
  globalThis.__swpLocalHiddenServiceIds = ids;
  globalThis.__swpLocalHiddenServiceAccess = access;
  return res.json({ ok: true, success: true });
});

// Avg times per service (AdminServices uses `/admin/services/avg-times`)
router.get("/services/avg-times", (req, res) => {
  (async () => {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.avgTimes || {});
    const docs = await db
      .collection("services")
      .find({}, { projection: { service_id: 1, avg_time: 1, avgTime: 1 } })
      .limit(5000)
      .toArray();
    const out = {};
    for (const s of docs) {
      const sid = s?.service_id ?? (typeof s?.serviceId !== "undefined" ? s.serviceId : null);
      if (!sid) continue;
      const v = s.avg_time ?? s.avgTime ?? null;
      out[String(sid)] = v;
    }
    cache.avgTimes = out;
    return res.json(out);
  })().catch(() => res.json({}));
});

router.get("/orders", async (req, res) => {
  try {
    const cacheKey = `adminOrders:${JSON.stringify(req.query || {})}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.orders || { orders: [], pages: 1, counts_by_status: {} });

    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.max(1, Number(req.query?.limit || 20));
    const status = String(req.query?.status || "all");
    const createdLast = String(req.query?.created_last || "0");
    const serviceId = String(req.query?.service_id || "");
    const providerId = String(req.query?.provider_id || "");
    const search = String(req.query?.search || "").trim();

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (serviceId) filter.service_id = serviceId;

    if (createdLast && createdLast !== "0") {
      const days = Number(createdLast);
      if (Number.isFinite(days) && days > 0) {
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        // `orders.created_at` is stored as an ISO string in this codebase.
        // Use an ISO string for $gte/$lte so Mongo comparisons work.
        filter.created_at = { ...(filter.created_at || {}), $gte: from.toISOString() };
      }
    }

    if (providerId) {
      const services = await db.collection("services").find({ provider_id: providerId }).project({ service_id: 1 }).toArray();
      const serviceIds = services.map((s) => s.service_id).filter(Boolean);
      if (serviceIds.length) filter.service_id = { $in: serviceIds };
      else filter.service_id = "__none__";
    }

    if (search) {
      const r = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ order_id: r }, { link: r }, { user_id: r }, { user_note: r }];
    }

    const total = await db.collection("orders").countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;

    const orders = await db
      .collection("orders")
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Keep list endpoint fast in adminSafe mode.
    // Provider sync must be triggered explicitly via refresh endpoints.

    // Enrich orders with usernames + service names (admin UI expects these fields).
    const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];
    const serviceIds = [...new Set(orders.map((o) => o.service_id).filter(Boolean))];

    const [usersArr, servicesArr] = await Promise.all([
      userIds.length
        ? db
            .collection("users")
            .find({ user_id: { $in: userIds } })
            .project({
              user_id: 1,
              username: 1,
              email: 1,
              full_name: 1,
              name: 1,
            })
            .toArray()
        : Promise.resolve([]),
      serviceIds.length
        ? db
            .collection("services")
            .find({ service_id: { $in: serviceIds } })
            .project({ service_id: 1, name: 1 })
            .toArray()
        : Promise.resolve([]),
    ]);

    const userMap = Object.fromEntries(
      usersArr.map((u) => [String(u.user_id), u])
    );
    const serviceMap = Object.fromEntries(
      servicesArr.map((s) => [String(s.service_id), s])
    );

    const enrichedOrders = orders.map((order) => {
      const userDoc = order?.user_id != null ? userMap[String(order.user_id)] : null;
      const serviceDoc =
        order?.service_id != null ? serviceMap[String(order.service_id)] : null;

      const charge = order.charge ?? order.price ?? 0;
      const provider_charge = order.provider_charge ?? order.provider_cost ?? 0;

      return {
        ...order,
        user_username:
          userDoc?.username ||
          userDoc?.email?.split("@")?.[0] ||
          order?.user_id ||
          "—",
        user_email: userDoc?.email || null,
        user_full_name: userDoc?.full_name || userDoc?.name || null,
        service_name: order.service_name || serviceDoc?.name || order?.service_id || "—",
        charge,
        provider_charge,
        provider_cost: provider_charge,
        cost_exceeds_charge: provider_charge > charge,
        needs_price_approval: order.needs_price_approval ?? false,
      };
    });

    const countsAgg = await db
      .collection("orders")
      .aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray();
    const counts_by_status = Object.fromEntries(countsAgg.map((x) => [x._id, x.count]));

    const result = { orders: enrichedOrders, pages, counts_by_status };
    cache.orders = result;
    setCache(cacheKey, result);
    return res.json(result);
  } catch (_) {
    return res.json({ orders: [], pages: 1, counts_by_status: {} });
  }
});

router.post("/orders/refresh-provider-charges", async (req, res) => {
  return refreshProviderChargesHandler(req, res);
});

router.post("/orders/sync-provider-statuses", async (req, res) => {
  return syncProviderStatusesHandler(req, res);
});

// Order detail for expandable row
router.get("/orders/:orderId", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({});
    const orderId = String(req.params?.orderId || "");
    const order = await db.collection("orders").findOne({ order_id: orderId });
    if (!order) return res.json({});

    const [userDoc, serviceDoc] = await Promise.all([
      order?.user_id != null
        ? db
            .collection("users")
            .findOne({ user_id: String(order.user_id) })
            .catch(() => null)
        : Promise.resolve(null),
      order?.service_id != null
        ? db
            .collection("services")
            .findOne({ service_id: String(order.service_id) })
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    const charge = order.charge ?? order.price ?? 0;
    const provider_charge = order.provider_charge ?? order.provider_cost ?? 0;

    return res.json({
      ...order,
      user_username:
        userDoc?.username ||
        userDoc?.email?.split("@")?.[0] ||
        order?.user_id ||
        "—",
      user_email: userDoc?.email || null,
      user_full_name: userDoc?.full_name || userDoc?.name || null,
      service_name: order.service_name || serviceDoc?.name || order?.service_id || "—",
      charge,
      provider_charge,
      provider_cost: provider_charge,
      cost_exceeds_charge: provider_charge > charge,
      needs_price_approval: order.needs_price_approval ?? false,
    });
  } catch (_) {
    return res.json({});
  }
});

router.put("/orders/:id", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false, error: "Database unavailable" });
    const id = String(req.params?.id || "");
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const order = await db.collection("orders").findOne({ order_id: id });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    if (body.cancel_and_refund) {
      const statusNow = String(order.status || "").toLowerCase();
      const alreadyDone = !!order.cancel_refund_done || statusNow === "cancelled";
      const refundable = Number(order.charge ?? order.price ?? 0);
      const refundAmount = !alreadyDone && Number.isFinite(refundable) && refundable > 0 ? refundable : 0;
      if (refundAmount > 0 && order.user_id) {
        await db.collection("users").updateOne({ user_id: order.user_id }, { $inc: { balance: refundAmount } });
      }
      await db.collection("orders").updateOne(
        { order_id: id },
        {
          $set: {
            status: "cancelled",
            remains: 0,
            charge: 0,
            price: 0,
            cancel_refund_done: true,
            cancelled_at: new Date().toISOString(),
            refunded_amount: Number((Number(order.refunded_amount || 0) + refundAmount).toFixed(6)),
            updated_at: new Date().toISOString(),
          },
        }
      );
      invalidateAllOrderLists();
      return res.json({ success: true, refunded_amount: refundAmount, status: "cancelled" });
    }

    if (body.set_partial) {
      if (order.partial_set_at) {
        return res.status(409).json({ success: false, error: "Partial already applied for this order" });
      }
      const totalQty = Number(order.quantity ?? 0);
      const remainsRaw = Number(body.remains);
      if (!Number.isFinite(remainsRaw) || remainsRaw < 0 || remainsRaw > totalQty) {
        return res.status(400).json({ success: false, error: "Invalid remains value" });
      }
      const remains = Math.floor(remainsRaw);
      const delivered = Math.max(0, totalQty - remains);
      const originalCharge = Number(order.original_charge ?? order.charge ?? order.price ?? 0) || 0;
      const newCharge = totalQty > 0 ? Number(((originalCharge * delivered) / totalQty).toFixed(6)) : 0;
      const currentCharge = Number(order.charge ?? order.price ?? 0);
      const refundAmount = Math.max(0, Number((currentCharge - newCharge).toFixed(6)));
      const nextStatus = remains > 0 ? "partial" : "completed";

      if (refundAmount > 0 && order.user_id) {
        await db.collection("users").updateOne({ user_id: order.user_id }, { $inc: { balance: refundAmount } });
      }
      await db.collection("orders").updateOne(
        { order_id: id },
        {
          $set: {
            status: nextStatus,
            remains,
            charge: newCharge,
            price: newCharge,
            original_charge: originalCharge,
            partial_refunded_amount: Number((Number(order.partial_refunded_amount || 0) + refundAmount).toFixed(6)),
            partial_set_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }
      );
      invalidateAllOrderLists();
      return res.json({ success: true, status: nextStatus, new_charge: newCharge, refunded_amount: refundAmount });
    }

    const updates = { ...body, updated_at: new Date().toISOString() };
    delete updates._id;
    delete updates.cancel_and_refund;
    delete updates.set_partial;
    await db.collection("orders").updateOne({ order_id: id }, { $set: updates });
    invalidateAllOrderLists();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || "Failed to update order" });
  }
});

router.post("/orders/:id/resend", (req, res) => {
  return res.json({ ok: true, success: true });
});

// Admin: notification history table (`/admin/notifications?page=1&limit=20`)
router.get("/notifications", async (req, res) => {
  try {
    const db = await safeGetDb();
    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.max(1, Number(req.query?.limit || 20));
    const cache = getAdminCache();
    if (!db) return res.json(cache.notifications || { notifications: [], pages: 1, total: 0 });

    const filter = {};
    const total = await db.collection("notifications").countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;

    const docs = await db
      .collection("notifications")
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const result = { notifications: docs, pages, total };
    cache.notifications = result;
    return res.json(result);
  } catch (_) {
    return res.json({ notifications: [], pages: 1, total: 0 });
  }
});

// ====================
// Admin Reports (data for `/admin/reports/*`)
// These are required for pages like Revenue/Profit/Orders/Payments/Delivery.
// ====================

router.get("/reports/revenue", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.reportsRevenue || { summary: {}, by_day: [], by_payment_method: [] });

    const range = parseIsoRange(req.query?.start_date, req.query?.end_date, 30, true);
    if (!range) return res.json({ summary: {}, by_day: [], by_payment_method: [] });
    const { startIso, endIso } = range;

    const orders = await db.collection("orders").find(
      { created_at: { $gte: startIso, $lte: endIso } },
      { projection: { created_at: 1, status: 1, mode: 1, service_id: 1, price: 1, final_price: 1 } }
    ).toArray();

    const revenueByDay = {};
    let totalRevenue = 0;
    let totalCost = 0;

    for (const o of orders) {
      const dt = o?.created_at ? new Date(o.created_at) : null;
      if (!dt || Number.isNaN(dt.getTime())) continue;
      const day = dt.toISOString().slice(0, 10);
      const revenue = o.final_price != null ? safeNumber(o.final_price) : safeNumber(o.price);

      totalRevenue += revenue;
      const entry = revenueByDay[day] || { revenue: 0, cost: 0, profit: 0, orders: 0 };
      entry.revenue += revenue;
      entry.orders += 1;
      // cost/profit fields are not present in this project's Mongo orders snapshot,
      // so we treat them as 0 for local admin reports.
      entry.cost += 0;
      entry.profit += revenue;
      revenueByDay[day] = entry;
    }

    const totalOrders = orders.length;
    const profitMargin = totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue * 100 : 0;
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    const deposits = await db.collection("deposits").find(
      { created_at: { $gte: startIso, $lte: endIso }, status: "completed" },
      { projection: { created_at: 1, method: 1, amount: 1, bonus_amount: 1 } }
    ).toArray();

    const byPaymentMethod = {};
    for (const d of deposits) {
      const method = String(d?.method || "unknown");
      if (!byPaymentMethod[method]) byPaymentMethod[method] = { method, amount: 0, bonus: 0, count: 0 };
      byPaymentMethod[method].amount += safeNumber(d?.amount);
      byPaymentMethod[method].bonus += safeNumber(d?.bonus_amount ?? 0);
      byPaymentMethod[method].count += 1;
    }

    const result = {
      summary: {
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_cost: Math.round(totalCost * 100) / 100,
        total_profit: Math.round((totalRevenue - totalCost) * 100) / 100,
        profit_margin: Math.round(profitMargin * 100) / 100,
        total_orders: totalOrders,
        avg_order_value: Math.round(avgOrderValue * 100) / 100,
        total_bonuses_given: 0,
      },
      by_day: Object.entries(revenueByDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, revenue: v.revenue, profit: v.profit })),
      by_payment_method: Object.values(byPaymentMethod),
    };

    cache.reportsRevenue = result;
    return res.json(result);
  } catch (_) {
    return res.json({ summary: {}, by_day: [], by_payment_method: [] });
  }
});

router.get("/reports/profit", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.reportsProfit || { summary: {}, by_day: [], top_profitable_services: [] });

    const range = parseIsoRange(req.query?.start_date, req.query?.end_date, 30, true);
    if (!range) return res.json({ summary: {}, by_day: [], top_profitable_services: [] });
    const { startIso, endIso } = range;

    const orders = await db.collection("orders").find(
      { created_at: { $gte: startIso, $lte: endIso } },
      { projection: { created_at: 1, service_id: 1, price: 1, final_price: 1 } }
    ).toArray();

    let grossRevenue = 0;
    let providerCosts = 0;

    const profitByDay = {};
    const profitByService = {};

    for (const o of orders) {
      const dt = o?.created_at ? new Date(o.created_at) : null;
      if (!dt || Number.isNaN(dt.getTime())) continue;
      const day = dt.toISOString().slice(0, 10);
      const revenue = o.final_price != null ? safeNumber(o.final_price) : safeNumber(o.price);

      grossRevenue += revenue;

      profitByDay[day] = (profitByDay[day] || 0) + revenue;
      const sid = o?.service_id;
      if (sid) profitByService[sid] = (profitByService[sid] || 0) + revenue;
    }

    const netProfit = grossRevenue - providerCosts;
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    const top_profitable_services = Object.entries(profitByService)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([service_id, profit]) => ({ service_id, profit }));

    const result = {
      summary: {
        gross_revenue: Math.round(grossRevenue * 100) / 100,
        provider_costs: Math.round(providerCosts * 100) / 100,
        net_profit: Math.round(netProfit * 100) / 100,
        profit_margin: Math.round(profitMargin * 100) / 100,
      },
      by_day: Object.entries(profitByDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, profit]) => ({ date, profit })),
      top_profitable_services,
    };

    cache.reportsProfit = result;
    return res.json(result);
  } catch (_) {
    return res.json({ summary: {}, by_day: [], top_profitable_services: [] });
  }
});

router.get("/reports/orders", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.reportsOrders || { summary: { by_status: {}, total_orders: 0 }, by_day: [], top_services: [] });

    const range = parseIsoRange(req.query?.start_date, req.query?.end_date, 30, true);
    if (!range) return res.json({ summary: { by_status: {}, total_orders: 0 }, by_day: [], top_services: [] });
    const { startIso, endIso } = range;

    const orders = await db.collection("orders").find(
      { created_at: { $gte: startIso, $lte: endIso } },
      { projection: { created_at: 1, status: 1, service_id: 1, service_name: 1 } }
    ).toArray();

    const byStatus = {};
    const byDay = {};
    const byServiceCount = {};

    for (const o of orders) {
      const dt = o?.created_at ? new Date(o.created_at) : null;
      if (!dt || Number.isNaN(dt.getTime())) continue;
      const day = dt.toISOString().slice(0, 10);
      const status = String(o?.status || "unknown");
      const sid = o?.service_id || "unknown";
      const svcName = o?.service_name || sid;

      byDay[day] = (byDay[day] || 0) + 1;
      byStatus[status] = (byStatus[status] || 0) + 1;
      byServiceCount[svcName] = (byServiceCount[svcName] || 0) + 1;
    }

    const top_services = Object.entries(byServiceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([service, count]) => ({ service, count }));

    const result = {
      summary: { total_orders: orders.length, by_status: byStatus },
      by_day: Object.entries(byDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, ordersCount]) => ({ date, orders: ordersCount })),
      top_services,
    };

    cache.reportsOrders = result;
    return res.json(result);
  } catch (_) {
    return res.json({ summary: { by_status: {}, total_orders: 0 }, by_day: [], top_services: [] });
  }
});

router.get("/reports/payments", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.reportsPayments || { summary: {}, by_method: [], recent_deposits: [] });

    const range = parseIsoRange(req.query?.start_date, req.query?.end_date, 30, true);
    if (!range) return res.json({ summary: {}, by_method: [], recent_deposits: [] });
    const { startIso, endIso } = range;

    const deposits = await db.collection("deposits").find(
      { created_at: { $gte: startIso, $lte: endIso } },
      { projection: { deposit_id: 1, user_id: 1, amount: 1, method: 1, status: 1, note: 1, created_at: 1 } }
    ).sort({ created_at: -1 }).toArray();

    const users = await db
      .collection("users")
      .find(
        { user_id: { $in: deposits.map((d) => d.user_id).filter(Boolean) } },
        { projection: { user_id: 1, username: 1, email: 1 } }
      )
      .toArray();
    const userById = Object.fromEntries(users.map((u) => [u.user_id, u]));

    const byMethod = {};
    let totalAmount = 0;
    let totalDeposits = deposits.length;

    for (const d of deposits) {
      const method = String(d?.method || "unknown");
      const amount = safeNumber(d?.amount);
      totalAmount += amount;
      const bonus = 0;
      if (!byMethod[method]) byMethod[method] = { method, amount: 0, bonus, count: 0 };
      byMethod[method].amount += amount;
      byMethod[method].bonus += bonus;
      byMethod[method].count += 1;
    }

    const completed = deposits.filter((d) => d.status === "completed");
    const totalBonus = 0;
    const totalCredited = completed.reduce((sum, d) => sum + safeNumber(d?.amount), 0) + (deposits.length ? 0 : 0);

    const recent_deposits = deposits.slice(0, 50).map((d) => {
      const u = d?.user_id ? userById[d.user_id] : null;
      return {
        deposit_id: d.deposit_id,
        user_id: d.user_id,
        username: u?.username || u?.email || d.user_id,
        email: u?.email || null,
        amount: safeNumber(d?.amount),
        bonus_amount: 0,
        status: d.status,
        method: d.method,
        source: String(d.method || "").replace(/_/g, " "),
        created_at: d.created_at,
      };
    });

    const result = {
      summary: {
        total_deposits: totalDeposits,
        total_amount: Math.round(totalAmount * 100) / 100,
        total_bonus: totalBonus,
        total_credited: Math.round(totalCredited * 100) / 100,
        // Fields below are not required by AdminReports currently, but kept for compatibility.
      },
      by_method: Object.values(byMethod).map((m) => ({ ...m, bonus: m.bonus, amount: m.amount })),
      recent_deposits,
    };

    cache.reportsPayments = result;
    return res.json(result);
  } catch (_) {
    return res.json({ summary: {}, by_method: [], recent_deposits: [] });
  }
});

router.get("/reports/delivery", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.reportsDelivery || []);

    const range = parseIsoRange(req.query?.start_date, req.query?.end_date, 30, true);
    if (!range) return res.json([]);
    const { startIso, endIso } = range;

    const platform = req.query?.platform ? String(req.query.platform) : "";
    const provider = req.query?.provider ? String(req.query.provider) : "";
    const statusFilter = req.query?.status ? String(req.query.status) : "all";

    const servicesQuery = {};
    if (platform) servicesQuery.platform = platform;
    if (provider) servicesQuery.provider_id = provider;

    const services = await db
      .collection("services")
      .find(Object.keys(servicesQuery).length ? servicesQuery : {})
      .project({ service_id: 1, name: 1, avg_time: 1, avgTime: 1, platform: 1, provider_id: 1 })
      .toArray();
    const serviceIdSet = new Set(services.map((s) => s.service_id).filter(Boolean));

    const orders = await db
      .collection("orders")
      .find(
        (() => {
          const q = { created_at: { $gte: startIso, $lte: endIso } };
          if (serviceIdSet.size) q.service_id = { $in: Array.from(serviceIdSet) };
          return q;
        })(),
        { projection: { created_at: 1, status: 1, service_id: 1 } }
      )
      .toArray();

    const normalizeStatus = (s) => {
      const st = String(s || "");
      if (st === "processing") return "in_progress";
      if (st === "pending_manual") return "pending";
      if (st === "cancelled") return "canceled";
      return st;
    };

    const rowsByService = {};
    for (const o of orders) {
      const sid = o?.service_id;
      if (!sid) continue;
      const status = normalizeStatus(o?.status);
      const r = rowsByService[sid] || {
        service_id: sid,
        service_name: sid,
        total_orders: 0,
        completed: 0,
        pending: 0,
        in_progress: 0,
        failed: 0,
        error: 0,
        canceled: 0,
        partial: 0,
      };
      r.total_orders += 1;
      if (r.hasOwnProperty(status)) r[status] += 1;
      else r.pending += 0;
      rowsByService[sid] = r;
    }

    const serviceById = Object.fromEntries(services.map((s) => [s.service_id, s]));
    let rows = Object.values(rowsByService).map((r) => {
      const svc = serviceById[r.service_id];
      const completed = r.completed;
      const failed = r.failed;
      const error = r.error;
      const total = r.total_orders || 0;
      const failRate = total ? ((failed + error) / total) * 100 : 0;
      return {
        ...r,
        service_name: svc?.name || r.service_name,
        avg_time_seconds: svc?.avg_time ?? svc?.avgTime ?? null,
        fail_rate_pct: Math.round(failRate * 10) / 10,
      };
    });

    const statusToColumn = (sf) => {
      if (sf === "processing") return "in_progress";
      if (sf === "cancelled") return "canceled";
      if (sf === "pending_manual") return "pending";
      return sf;
    };

    if (statusFilter && statusFilter !== "all") {
      const col = statusToColumn(statusFilter);
      rows = rows.filter((r) => (r[col] || 0) > 0);
    }

    cache.reportsDelivery = rows;
    return res.json(rows);
  } catch (_) {
    return res.json([]);
  }
});

// Refills page
router.get("/refills", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.refills || { refills: [], total: 0, pages: 1 });

    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.max(1, Number(req.query?.limit || 50));
    const status = String(req.query?.status || "").trim();
    const filter = {};
    if (status) filter.status = status;

    const total = await db.collection("refill_requests").countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const refills = await db
      .collection("refill_requests")
      .find(filter)
      .sort({ created_at: -1, updated_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const result = { refills, total, pages };
    cache.refills = result;
    return res.json(result);
  } catch (_) {
    return res.json({ refills: [], total: 0, pages: 1 });
  }
});

router.post("/refills/:id/retry", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: true });
    const id = req.params?.id;
    const _id = toObjectId(id);
    await db.collection("refill_requests").updateOne(
      { $or: [{ _id }, { order_id: id }] },
      { $set: { status: "pending", updated_at: new Date().toISOString() }, $inc: { attempt: 1 } }
    );
    const cache = getAdminCache();
    delete cache.refills;
    return res.json({ success: true });
  } catch (_) {
    return res.json({ success: false });
  }
});

// Resellers page
router.get("/resellers", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.resellers || { resellers: [] });

    const resellers = await db.collection("resellers").find({}).sort({ created_at: -1 }).limit(1000).toArray();
    const out = [];
    for (const r of resellers) {
      const resellerId = r?._id;
      const total_users = await db.collection("reseller_users").countDocuments({ reseller_id: resellerId });
      out.push({
        ...r,
        total_users,
        total_revenue: safeNumber(r?.total_revenue),
        total_profit: safeNumber(r?.total_profit),
        status: r?.status || "active",
        domain_verified: r?.domain_verified === true,
      });
    }
    const result = { resellers: out };
    cache.resellers = result;
    return res.json(result);
  } catch (_) {
    return res.json({ resellers: [] });
  }
});

router.post("/resellers", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ error: "Database unavailable" });
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const now = new Date().toISOString();
    const doc = {
      name: String(body.name || "").trim(),
      email: String(body.email || "").trim(),
      custom_domain: String(body.custom_domain || "").trim(),
      status: "active",
      domain_verified: false,
      pricing: {
        markup_type: "percentage",
        default_markup_percentage: Number(body.default_markup_percentage || 30),
      },
      created_at: now,
      updated_at: now,
    };
    if (!doc.name || !doc.email || !doc.custom_domain) return res.status(400).json({ error: "Missing fields" });
    const out = await db.collection("resellers").insertOne(doc);
    const cache = getAdminCache();
    delete cache.resellers;
    return res.status(201).json({ ...doc, _id: out.insertedId });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Create failed" });
  }
});

router.put("/resellers/:id", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false, error: "Database unavailable" });
    const id = toObjectId(req.params?.id);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    await db.collection("resellers").updateOne({ _id: id }, { $set: { ...body, updated_at: new Date().toISOString() } });
    const cache = getAdminCache();
    delete cache.resellers;
    return res.json({ success: true });
  } catch (e) {
    return res.json({ success: false, error: e?.message || "Update failed" });
  }
});

router.delete("/resellers/:id", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false, error: "Database unavailable" });
    const id = toObjectId(req.params?.id);
    await db.collection("resellers").updateOne({ _id: id }, { $set: { status: "suspended", updated_at: new Date().toISOString() } });
    const cache = getAdminCache();
    delete cache.resellers;
    return res.json({ success: true });
  } catch (e) {
    return res.json({ success: false, error: e?.message || "Suspend failed" });
  }
});

router.post("/resellers/:id/add-balance", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false, error: "Database unavailable" });
    const id = toObjectId(req.params?.id);
    const amount = Number(req.body?.amount || 0);
    if (!(amount > 0)) return res.status(400).json({ error: "amount must be > 0" });
    await db.collection("resellers").updateOne(
      { _id: id },
      { $inc: { balance: amount }, $set: { updated_at: new Date().toISOString() } }
    );
    const cache = getAdminCache();
    delete cache.resellers;
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Add balance failed" });
  }
});

router.get("/resellers/:id/stats", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ total_users: 0, total_orders: 0, total_revenue: 0, total_profit: 0 });
    const id = toObjectId(req.params?.id);
    const reseller = await db.collection("resellers").findOne({ _id: id });
    const total_users = await db.collection("reseller_users").countDocuments({ reseller_id: id });
    return res.json({
      total_users,
      total_orders: safeNumber(reseller?.total_orders),
      total_revenue: safeNumber(reseller?.total_revenue),
      total_profit: safeNumber(reseller?.total_profit),
    });
  } catch (_) {
    return res.json({ total_users: 0, total_orders: 0, total_revenue: 0, total_profit: 0 });
  }
});

// Bundles page
router.get("/bundles", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.bundles || { bundles: [] });
    const bundles = await db.collection("bundle_packages").find({}).sort({ created_at: -1 }).limit(1000).toArray();
    const result = { bundles };
    cache.bundles = result;
    return res.json(result);
  } catch (_) {
    return res.json({ bundles: [] });
  }
});

// For AdminBundles categories query compatibility (`/api/admin/categories`)
router.get("/categories", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.categories || []);
    const categories = await db.collection("categories").find({}).sort({ sort_order: 1, name: 1 }).limit(5000).toArray();
    cache.categories = categories;
    return res.json(categories);
  } catch (_) {
    return res.json([]);
  }
});

router.post("/bundles", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const now = new Date().toISOString();
    const doc = {
      name: String(body.name || "").trim(),
      description: String(body.description || "").trim(),
      category_id: body.category_id || null,
      price: safeNumber(body.price),
      image_url: String(body.image_url || ""),
      is_active: body.is_active !== false,
      services: Array.isArray(body.services) ? body.services : [],
      created_at: now,
      updated_at: now,
    };
    if (!doc.name) return res.status(400).json({ error: "name is required" });
    const out = await db.collection("bundle_packages").insertOne(doc);
    const cache = getAdminCache();
    delete cache.bundles;
    return res.status(201).json({ ...doc, _id: out.insertedId });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Create failed" });
  }
});

router.put("/bundles/:id", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const id = toObjectId(req.params?.id);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    await db.collection("bundle_packages").updateOne({ _id: id }, { $set: { ...body, updated_at: new Date().toISOString() } });
    const cache = getAdminCache();
    delete cache.bundles;
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Update failed" });
  }
});

router.delete("/bundles/:id", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const id = toObjectId(req.params?.id);
    await db.collection("bundle_packages").updateOne({ _id: id }, { $set: { is_active: false, updated_at: new Date().toISOString() } });
    const cache = getAdminCache();
    delete cache.bundles;
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Delete failed" });
  }
});

// Bonus page
router.get("/bonus/settings", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    const fallback = {
      enabled: true,
      first_deposit_bonus: false,
      first_deposit_percent: 10,
      first_deposit_min: 10,
    };
    if (!db) return res.json(cache.bonusSettings || fallback);
    const doc = await db.collection("bonus_settings").findOne({}) || fallback;
    cache.bonusSettings = doc;
    return res.json(doc);
  } catch (_) {
    return res.json({
      enabled: true,
      first_deposit_bonus: false,
      first_deposit_percent: 10,
      first_deposit_min: 10,
    });
  }
});

router.put("/bonus/settings", async (req, res) => {
  try {
    const db = await safeGetDb();
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (!db) {
      const cache = getAdminCache();
      cache.bonusSettings = { ...(cache.bonusSettings || {}), ...body };
      return res.json({ success: true });
    }
    await db.collection("bonus_settings").updateOne({}, { $set: { ...body } }, { upsert: true });
    const cache = getAdminCache();
    delete cache.bonusSettings;
    return res.json({ success: true });
  } catch (_) {
    return res.json({ success: false });
  }
});

router.get("/bonus/tiers", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.bonusTiers || { tiers: [] });
    const tiers = await db.collection("vip_tiers").find({}).sort({ min_total_spend: 1 }).toArray();
    const mapped = tiers.map((t) => ({
      tier_id: t.vip_id || (t._id ? String(t._id) : undefined),
      min_amount: safeNumber(t.min_total_spend),
      max_amount: null,
      bonus_percent: safeNumber(t.discount_percent),
      is_active: t.is_active !== false,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
    const result = { tiers: mapped };
    cache.bonusTiers = result;
    return res.json(result);
  } catch (_) {
    return res.json({ tiers: [] });
  }
});

router.get("/bonus/promotions", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.bonusPromotions || { promotions: [] });
    const promos = await db.collection("promocodes").find({}).sort({ created_at: -1 }).limit(500).toArray();
    const mapped = promos.map((p) => ({
      promo_id: p._id ? String(p._id) : p.promo_id,
      title: p.code || "Promotion",
      bonus_percent: safeNumber(p.discount_type === "percentage" ? p.discount_value : 0),
      min_deposit: safeNumber(p.min_order_value),
      max_bonus: p.max_discount_cap ?? null,
      start_date: p.valid_from ? new Date(p.valid_from).toISOString() : null,
      end_date: p.valid_until ? new Date(p.valid_until).toISOString() : null,
      is_active: p.is_active !== false,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
    const result = { promotions: mapped };
    cache.bonusPromotions = result;
    return res.json(result);
  } catch (_) {
    return res.json({ promotions: [] });
  }
});

// Loyalty program
router.get("/loyalty/settings", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    const fallback = {
      enabled: true,
      tiers: {
        bronze: { min: 0, cashback_pct: 1, pts_per_dollar: 1 },
        silver: { min: 100, cashback_pct: 2, pts_per_dollar: 1 },
        gold: { min: 1000, cashback_pct: 3, pts_per_dollar: 2 },
        platinum: { min: 5000, cashback_pct: 5, pts_per_dollar: 3 },
      },
      points_per_dollar: 100,
      min_redemption_points: 100,
      hold_hours: 24,
      inactivity_expiry_days: 90,
    };
    if (!db) return res.json(cache.loyaltySettings || fallback);
    const doc = (await db.collection("loyalty_settings").findOne({})) || fallback;
    cache.loyaltySettings = doc;
    return res.json(doc);
  } catch (_) {
    return res.json({
      enabled: true,
      tiers: {
        bronze: { min: 0, cashback_pct: 1, pts_per_dollar: 1 },
        silver: { min: 100, cashback_pct: 2, pts_per_dollar: 1 },
        gold: { min: 1000, cashback_pct: 3, pts_per_dollar: 2 },
        platinum: { min: 5000, cashback_pct: 5, pts_per_dollar: 3 },
      },
      points_per_dollar: 100,
      min_redemption_points: 100,
      hold_hours: 24,
      inactivity_expiry_days: 90,
    });
  }
});

router.put("/loyalty/settings", async (req, res) => {
  try {
    const db = await safeGetDb();
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (!db) {
      const cache = getAdminCache();
      cache.loyaltySettings = { ...(cache.loyaltySettings || {}), ...body };
      return res.json({ success: true });
    }
    await db.collection("loyalty_settings").updateOne({}, { $set: { ...body, updated_at: new Date().toISOString() } }, { upsert: true });
    const cache = getAdminCache();
    delete cache.loyaltySettings;
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Failed to save" });
  }
});

router.get("/loyalty/users", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.loyaltyUsers || { users: [], total: 0 });
    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.max(1, Number(req.query?.limit || 20));
    const tier = String(req.query?.tier || "").trim();
    const filter = {};
    if (tier) filter.loyalty_tier = tier;
    const total = await db.collection("users").countDocuments(filter);
    const skip = (page - 1) * limit;
    const users = await db
      .collection("users")
      .find(filter)
      .project({
        user_id: 1,
        email: 1,
        username: 1,
        loyalty_tier: 1,
        loyalty_points: 1,
        loyalty_points_pending: 1,
        cashback_pending: 1,
        total_spent: 1,
        last_order_at: 1,
      })
      .sort({ total_spent: -1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    const result = { users, total };
    cache.loyaltyUsers = result;
    return res.json(result);
  } catch (_) {
    return res.json({ users: [], total: 0 });
  }
});

router.get("/loyalty/transactions", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.loyaltyTransactions || { transactions: [], total: 0 });
    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.max(1, Number(req.query?.limit || 20));
    const type = String(req.query?.type || "").trim();
    const status = String(req.query?.status || "").trim();
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    const total = await db.collection("loyalty_transactions").countDocuments(filter);
    const skip = (page - 1) * limit;
    const tx = await db.collection("loyalty_transactions").find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).toArray();
    const userIds = tx.map((x) => x.user_id).filter(Boolean);
    const users = userIds.length
      ? await db.collection("users").find({ user_id: { $in: userIds } }).project({ user_id: 1, email: 1 }).toArray()
      : [];
    const userById = Object.fromEntries(users.map((u) => [u.user_id, u]));
    const transactions = tx.map((x) => ({ ...x, user_email: userById[x.user_id]?.email || null }));
    const result = { transactions, total };
    cache.loyaltyTransactions = result;
    return res.json(result);
  } catch (_) {
    return res.json({ transactions: [], total: 0 });
  }
});

router.post("/loyalty/adjust", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: true });
    const user_id = String(req.body?.user_id || "").trim();
    const points = Number(req.body?.points || 0);
    const note = req.body?.note ? String(req.body.note) : null;
    if (!user_id || !Number.isFinite(points) || points === 0) return res.status(400).json({ error: "Invalid payload" });
    const now = new Date().toISOString();
    await db.collection("users").updateOne({ user_id }, { $inc: { loyalty_points: points }, $set: { updated_at: now } });
    await db.collection("loyalty_transactions").insertOne({
      user_id,
      order_id: null,
      type: "admin_adjustment",
      points,
      cashback_usd: 0,
      status: "credited",
      tier_at_time: null,
      hold_until: null,
      note: note || "Manual adjustment by admin",
      created_at: now,
      updated_at: now,
    });
    const cache = getAdminCache();
    delete cache.loyaltyUsers;
    delete cache.loyaltyTransactions;
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Failed to adjust" });
  }
});

// VIP tiers page
router.get("/vip-tiers", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.vipTiers || []);
    const docs = await db.collection("vip_tiers").find({}).sort({ min_total_spend: 1 }).toArray();
    cache.vipTiers = docs;
    return res.json(docs);
  } catch (_) {
    return res.json([]);
  }
});

router.post("/vip-tiers", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.status(503).json({ detail: "Database unavailable" });
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const now = new Date().toISOString();
    const vip_id = `vip_${Math.random().toString(36).slice(2, 14)}`;
    const doc = {
      vip_id,
      name: String(body.name || "VIP"),
      min_total_spend: safeNumber(body.min_total_spend),
      discount_percent: safeNumber(body.discount_percent),
      is_active: body.is_active !== false,
      created_at: now,
      updated_at: now,
    };
    await db.collection("vip_tiers").insertOne(doc);
    const cache = getAdminCache();
    delete cache.vipTiers;
    return res.status(201).json(doc);
  } catch (e) {
    return res.status(400).json({ detail: e?.message || "Failed to save" });
  }
});

router.put("/vip-tiers/:vipId", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.status(503).json({ detail: "Database unavailable" });
    const vipId = String(req.params?.vipId || "");
    const body = req.body && typeof req.body === "object" ? req.body : {};
    await db.collection("vip_tiers").updateOne(
      { vip_id: vipId },
      { $set: { ...body, min_total_spend: safeNumber(body.min_total_spend), discount_percent: safeNumber(body.discount_percent), updated_at: new Date().toISOString() } }
    );
    const cache = getAdminCache();
    delete cache.vipTiers;
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ detail: e?.message || "Failed to save" });
  }
});

router.delete("/vip-tiers/:vipId", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.status(503).json({ detail: "Database unavailable" });
    const vipId = String(req.params?.vipId || "");
    await db.collection("vip_tiers").deleteOne({ vip_id: vipId });
    const cache = getAdminCache();
    delete cache.vipTiers;
    return res.json({ success: true });
  } catch (_) {
    return res.status(400).json({ detail: "Failed to delete" });
  }
});

// User custom pricing page
router.get("/user-pricing", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.userPricing || { data: [] });
    const docs = await db.collection("user_custom_pricing").find({}).sort({ updated_at: -1, created_at: -1 }).limit(3000).toArray();
    const result = { data: docs };
    cache.userPricing = result;
    return res.json(result);
  } catch (_) {
    return res.json({ data: [] });
  }
});

router.post("/user-pricing", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const now = new Date().toISOString();
    const service_id = String(body.service_id || "").trim();
    const username = String(body.username || "").trim();
    if (!service_id || !username) return res.status(400).json({ error: "username and service_id are required" });

    const service = await db.collection("services").findOne({ service_id });
    const users = await db.collection("users").find({ $or: [{ username }, { email: username }] }).limit(1).toArray();
    const user = users[0] || null;
    const pricing_type = body.pricing_type || "percentage";
    const pricing_value = safeNumber(body.pricing_value);
    const original_price = safeNumber(service?.rate ?? service?.price ?? 0);
    const final_price = pricing_type === "fixed" ? pricing_value : Math.max(0, original_price * (1 - pricing_value / 100));
    const doc = {
      user_id: user?.user_id || username,
      username: user?.username || user?.email || username,
      service_id,
      service_name: service?.name || service_id,
      pricing_type,
      pricing_value,
      original_price,
      final_price,
      note: body.note || "",
      is_active: body.is_active !== false,
      allow_promo_stack: !!body.allow_promo_stack,
      created_by: null,
      created_at: now,
      updated_at: now,
    };
    const out = await db.collection("user_custom_pricing").insertOne(doc);
    const cache = getAdminCache();
    delete cache.userPricing;
    return res.status(201).json({ ...doc, _id: out.insertedId });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Failed to save" });
  }
});

router.put("/user-pricing/:id", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const id = toObjectId(req.params?.id);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const current = await db.collection("user_custom_pricing").findOne({ _id: id });
    const pricing_type = body.pricing_type || current?.pricing_type || "percentage";
    const pricing_value = safeNumber(body.pricing_value ?? current?.pricing_value);
    const original_price = safeNumber(current?.original_price);
    const final_price = pricing_type === "fixed" ? pricing_value : Math.max(0, original_price * (1 - pricing_value / 100));
    await db.collection("user_custom_pricing").updateOne(
      { _id: id },
      { $set: { ...body, pricing_type, pricing_value, final_price, updated_at: new Date().toISOString() } }
    );
    const cache = getAdminCache();
    delete cache.userPricing;
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Failed to save" });
  }
});

router.put("/user-pricing/:id/toggle", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const id = toObjectId(req.params?.id);
    const row = await db.collection("user_custom_pricing").findOne({ _id: id });
    if (!row) return res.status(404).json({ error: "Not found" });
    const is_active = !(row.is_active !== false);
    await db.collection("user_custom_pricing").updateOne({ _id: id }, { $set: { is_active, updated_at: new Date().toISOString() } });
    const cache = getAdminCache();
    delete cache.userPricing;
    return res.json({ success: true, is_active });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Failed to toggle" });
  }
});

router.delete("/user-pricing/:id", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const id = toObjectId(req.params?.id);
    await db.collection("user_custom_pricing").deleteOne({ _id: id });
    const cache = getAdminCache();
    delete cache.userPricing;
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Failed to delete" });
  }
});

// Activity logs page
router.get("/logs", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.logs || { logs: [], pages: 1 });
    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.max(1, Number(req.query?.limit || 50));
    const search = String(req.query?.search || "").trim();
    const actionType = String(req.query?.action_type || "all");
    const riskLevel = String(req.query?.risk_level || "all");
    const filter = {};
    if (search) {
      const r = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ event: r }, { reason: r }, { user_id: r }, { ip: r }, { upi_txn_id: r }, { message: r }, { type: r }];
    }
    if (actionType && actionType !== "all") filter.event = actionType;
    if (riskLevel && riskLevel !== "all") filter.risk_level = riskLevel;

    const total = await db.collection("security_logs").countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const docs = await db.collection("security_logs").find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).toArray();
    const logs = docs.map((d) => ({
      created_at: d.created_at,
      admin_username: d.admin_username || null,
      admin_email: d.admin_email || null,
      admin_id: d.admin_id || d.user_id || null,
      admin_role: d.admin_role || "main_admin",
      action_type: d.event || "SECURITY_EVENT",
      action_category: d.type || "security",
      target_name: d.user_id || d.upi_txn_id || null,
      target_type: d.target_type || "record",
      target_id: d.target_id || null,
      risk_level: d.risk_level || "medium",
      action_description: d.reason || d.message || d.event || "Activity log entry",
      ip: d.ip || null,
    }));
    const result = { logs, pages };
    cache.logs = result;
    return res.json(result);
  } catch (_) {
    return res.json({ logs: [], pages: 1 });
  }
});

// SEO settings page
router.get("/meta", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    const fallback = { seo_meta: {}, seo_pages: {} };
    if (!db) return res.json(cache.meta || fallback);
    const doc = await db.collection("admin_settings").findOne({}, { projection: { seo_meta: 1, seo_pages: 1 } });
    const result = { seo_meta: doc?.seo_meta || {}, seo_pages: doc?.seo_pages || {} };
    cache.meta = result;
    return res.json(result);
  } catch (_) {
    return res.json({ seo_meta: {}, seo_pages: {} });
  }
});

router.put("/meta", async (req, res) => {
  try {
    const db = await safeGetDb();
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (!db) {
      const cache = getAdminCache();
      cache.meta = { seo_meta: body.seo_meta || {}, seo_pages: body.seo_pages || {} };
      return res.json({ success: true });
    }
    await db.collection("admin_settings").updateOne(
      {},
      { $set: { seo_meta: body.seo_meta || {}, seo_pages: body.seo_pages || {}, updated_at: new Date().toISOString() } },
      { upsert: true }
    );
    const cache = getAdminCache();
    delete cache.meta;
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ detail: e?.message || "Failed to save" });
  }
});

// Pages CRUD
router.get("/pages", async (req, res) => {
  try {
    const db = await safeGetDb();
    const cache = getAdminCache();
    if (!db) return res.json(cache.pages || { pages: [] });
    const pages = await db.collection("pages").find({}).sort({ created_at: -1 }).toArray();
    const result = { pages };
    cache.pages = result;
    return res.json(result);
  } catch (_) {
    return res.json({ pages: [] });
  }
});

router.post("/pages", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.status(503).json({ detail: "Database unavailable" });
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const title = String(body.title || "").trim();
    const slug = String(body.slug || "").trim().replace(/^\/+/, "");
    if (!title || !slug) return res.status(400).json({ detail: "Title and slug required" });
    const page_id = `pg_${Math.random().toString(36).slice(2, 14)}`;
    const now = new Date().toISOString();
    const doc = {
      page_id,
      title,
      slug,
      content_html: String(body.content_html || ""),
      is_published: body.is_published !== false,
      created_at: now,
      updated_at: now,
    };
    await db.collection("pages").insertOne(doc);
    const cache = getAdminCache();
    delete cache.pages;
    return res.status(201).json(doc);
  } catch (e) {
    return res.status(400).json({ detail: e?.message || "Failed to save page" });
  }
});

router.put("/pages/:id", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.status(503).json({ detail: "Database unavailable" });
    const id = String(req.params?.id || "");
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const set = {
      ...(body.title != null ? { title: String(body.title) } : {}),
      ...(body.slug != null ? { slug: String(body.slug).replace(/^\/+/, "") } : {}),
      ...(body.content_html != null ? { content_html: String(body.content_html) } : {}),
      ...(typeof body.is_published !== "undefined" ? { is_published: !!body.is_published } : {}),
      updated_at: new Date().toISOString(),
    };
    await db.collection("pages").updateOne({ page_id: id }, { $set: set });
    const page = await db.collection("pages").findOne({ page_id: id });
    const cache = getAdminCache();
    delete cache.pages;
    return res.json(page || { page_id: id, ...set });
  } catch (e) {
    return res.status(400).json({ detail: e?.message || "Failed to save page" });
  }
});

router.delete("/pages/:id", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.status(503).json({ detail: "Database unavailable" });
    const id = String(req.params?.id || "");
    await db.collection("pages").deleteOne({ page_id: id });
    const cache = getAdminCache();
    delete cache.pages;
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ detail: e?.message || "Failed to remove page" });
  }
});

// Payment settings + deposits (used by AdminPayments page)
router.get("/payment/upi/settings", (req, res) => {
  return upiPaymentHandlers.adminGetUpiSettings(req, res);
});
router.post("/payment/upi/settings", (req, res) => {
  return upiPaymentHandlers.adminSaveUpiSettings(req, res);
});
router.get("/payment/upi/deposits", (req, res) => {
  return upiPaymentHandlers.adminGetDeposits(req, res);
});

router.get("/payment/cryptomus/settings", (req, res) => {
  return cryptomusPaymentHandlers.adminGetCryptoSettings(req, res);
});
router.post("/payment/cryptomus/settings", (req, res) => {
  return cryptomusPaymentHandlers.adminSaveCryptoSettings(req, res);
});
router.get("/payment/cryptomus/deposits", (req, res) => {
  return cryptomusPaymentHandlers.adminGetCryptoDeposits(req, res);
});

router.get("/payment/manual/settings", (req, res) => {
  return manualQrPaymentHandlers.adminGetManualSettings(req, res);
});
router.post("/payment/manual/settings", (req, res) => {
  return manualQrPaymentHandlers.adminSaveManualSettings(req, res);
});
router.get("/payment/manual/deposits", (req, res) => {
  return manualQrPaymentHandlers.adminGetManualDeposits(req, res);
});
router.get("/payment/manual/deposits/:id/screenshot", (req, res) => {
  return manualQrPaymentHandlers.adminGetManualScreenshot(req, res);
});
router.post("/payment/manual/approve", (req, res) => {
  return manualQrPaymentHandlers.adminApproveManual(req, res);
});
router.post("/payment/manual/reject", (req, res) => {
  return manualQrPaymentHandlers.adminRejectManual(req, res);
});

router.get("/payment/cashfree/settings", (req, res) => {
  return cashfreePaymentHandlers.adminGetCashfreeSettings(req, res);
});
router.post("/payment/cashfree/settings", (req, res) => {
  return cashfreePaymentHandlers.adminSaveCashfreeSettings(req, res);
});

router.get("/payment/gcash/settings", (req, res) => {
  return gcashPaymentHandlers.adminGetGcashSettings(req, res);
});
router.post("/payment/gcash/settings", (req, res) => {
  return gcashPaymentHandlers.adminSaveGcashSettings(req, res);
});
router.get("/payment/gcash/deposits", (req, res) => {
  return gcashPaymentHandlers.adminGetGcashDeposits(req, res);
});
router.get("/payment/gcash/deposits/:id/screenshot", (req, res) => {
  return gcashPaymentHandlers.adminGetGcashScreenshot(req, res);
});
router.post("/payment/gcash/approve", (req, res) => {
  return gcashPaymentHandlers.adminApproveGcash(req, res);
});
router.post("/payment/gcash/reject", (req, res) => {
  return gcashPaymentHandlers.adminRejectGcash(req, res);
});

// --- Spam / referral security (fallback when full admin router fails to load) ---
router.get("/spam-stats", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) {
      return res.json({
        success: true,
        suspicious_users: 0,
        open_alerts: 0,
        banned_users: 0,
        high_risk_users: 0,
        last_scan_at: null,
        next_scan_at: null,
      });
    }

    const [suspicious, alerts, banned, highRisk, lastScan] = await Promise.all([
      db.collection("users").countDocuments({
        $or: [{ ip_flag: true }, { referral_fraud_flag: true }, { is_flagged: true }],
      }),
      db.collection("spam_alerts").countDocuments({ status: "open" }),
      db.collection("users").countDocuments({ is_banned: true }),
      db.collection("users").countDocuments({ ip_flag_severity: "high" }),
      db.collection("ip_scan_history").findOne({}, { sort: { scanned_at: -1 } }),
    ]);

    return res.json({
      success: true,
      suspicious_users: suspicious,
      open_alerts: alerts,
      banned_users: banned,
      high_risk_users: highRisk,
      last_scan_at: lastScan?.scanned_at || null,
      next_scan_at: lastScan
        ? new Date(new Date(lastScan.scanned_at).getTime() + 6 * 60 * 60 * 1000).toISOString()
        : null,
    });
  } catch (err) {
    return res.json({
      success: true,
      suspicious_users: 0,
      open_alerts: 0,
      banned_users: 0,
      high_risk_users: 0,
      last_scan_at: null,
      next_scan_at: null,
    });
  }
});

router.get("/spam-scan-history", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: true, history: [] });

    const history = await db
      .collection("ip_scan_history")
      .find({})
      .sort({ scanned_at: -1 })
      .limit(20)
      .toArray();

    return res.json({ success: true, history });
  } catch (_) {
    return res.json({ success: true, history: [] });
  }
});

router.get("/spam-users", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: true, users: [], total: 0, page: 1, pages: 1 });
    const filterType = String(req.query?.type || "all");
    let userFilter = {};
    if (filterType === "shared_ip") userFilter = { ip_flag: true };
    else if (filterType === "referral_fraud") userFilter = { referral_fraud_flag: true };
    else if (filterType === "flagged") userFilter = { is_flagged: true };
    else {
      userFilter = {
        $or: [
          { is_flagged: true },
          { ip_flag: true },
          { is_banned: true },
          { referral_fraud_flag: true },
          { vpn_flag: true },
        ],
      };
    }
    const users = await db
      .collection("users")
      .find(userFilter)
      .sort({ ip_flag_date: -1, created_at: -1 })
      .limit(50)
      .toArray();
    const safeUsers = users.map((u) => {
      const { password_hash, password, ...safe } = u;
      return { ...safe, alerts: [], shared_ip_users: [], alert_count: 0, risk_level: "low" };
    });
    return res.json({
      success: true,
      users: safeUsers,
      total: safeUsers.length,
      page: 1,
      pages: 1,
    });
  } catch (_) {
    return res.json({ success: true, users: [], total: 0, page: 1, pages: 1 });
  }
});

router.get("/spam-alerts", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: true, alerts: [], total: 0, page: 1, pages: 1 });
    const alerts = await db
      .collection("spam_alerts")
      .find({ status: "open" })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();
    return res.json({ success: true, alerts, total: alerts.length, page: 1, pages: 1 });
  } catch (_) {
    return res.json({ success: true, alerts: [], total: 0, page: 1, pages: 1 });
  }
});

router.post("/spam-scan", async (req, res) => {
  try {
    const { runFullIpScan } = require("../lib/jobs/autoIpScanner");
    const result = await runFullIpScan({ scanType: "manual" });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/spam-users/:userId/ban", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false });
    const userId = String(req.params.userId || "");
    const { reason, ban_referrals, ban_shared_ip_users } = req.body || {};
    const user = await db.collection("users").findOne({ user_id: userId });
    if (!user) return res.status(404).json({ error: "Not found" });
    const now = new Date().toISOString();
    const bannedUsers = [userId];
    await db.collection("users").updateOne(
      { user_id: userId },
      {
        $set: {
          is_banned: true,
          is_active: false,
          ban_reason: reason || "Spam detected",
          banned_at: now,
        },
      }
    );
    if (ban_referrals && user.referral_code) {
      const refs = await db
        .collection("users")
        .find({ referred_by: user.referral_code })
        .project({ user_id: 1 })
        .toArray();
      for (const r of refs) {
        await db.collection("users").updateOne(
          { user_id: r.user_id },
          {
            $set: {
              is_banned: true,
              is_active: false,
              ban_reason: "Referred by banned user",
              banned_at: now,
            },
          }
        );
        bannedUsers.push(r.user_id);
      }
    }
    if (ban_shared_ip_users && user.known_ips?.length) {
      const ipUsers = await db
        .collection("users")
        .find({ user_id: { $ne: userId }, known_ips: { $in: user.known_ips } })
        .project({ user_id: 1 })
        .toArray();
      for (const u of ipUsers) {
        await db.collection("users").updateOne(
          { user_id: u.user_id },
          {
            $set: {
              is_banned: true,
              is_active: false,
              ban_reason: "Shared IP with banned user",
              banned_at: now,
            },
          }
        );
        bannedUsers.push(u.user_id);
      }
    }
    return res.json({
      success: true,
      message: `Banned ${bannedUsers.length} user(s)`,
      banned_user_ids: bannedUsers,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/spam-users/:userId/unban", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: false });
    const userId = String(req.params.userId || "");
    await db.collection("users").updateOne(
      { user_id: userId },
      {
        $set: {
          is_banned: false,
          is_active: true,
          is_flagged: false,
          ip_flag: false,
          referral_fraud_flag: false,
          unbanned_at: new Date().toISOString(),
        },
      }
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/spam-users/:userId/login-history", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: true, history: [], ip_details: [], shared_ip_users: [], ips: [] });
    const userId = String(req.params.userId || "");
    const history = await db
      .collection("user_login_history")
      .find({ user_id: userId })
      .sort({ logged_in_at: -1 })
      .limit(100)
      .toArray();
    const user = await db.collection("users").findOne({ user_id: userId });
    const uniqueIps = [...new Set(history.map((h) => h.ip_address))];
    const ipDetails = await Promise.all(
      uniqueIps.map(async (ip) => {
        if (!ip || ip === "unknown") return { ip, other_users: [], is_shared: false };
        const others = await db
          .collection("users")
          .find({
            user_id: { $ne: userId },
            $or: [{ known_ips: ip }, { last_login_ip: ip }],
          })
          .project({ user_id: 1, email: 1, username: 1 })
          .toArray();
        return { ip, other_users: others, is_shared: others.length > 0 };
      })
    );
    return res.json({
      success: true,
      history,
      user_known_ips: user?.known_ips || [],
      last_login_ip: user?.last_login_ip,
      ip_details: ipDetails,
      total_logins: history.length,
      unique_ips: uniqueIps.length,
      shared_ip_users: ipDetails.flatMap((d) => d.other_users || []),
      ips: uniqueIps,
    });
  } catch (_) {
    return res.json({ success: true, history: [], ip_details: [], shared_ip_users: [], ips: [] });
  }
});

router.post("/spam-alerts/:alertId/dismiss", async (req, res) => {
  try {
    const db = await safeGetDb();
    if (!db) return res.json({ success: true });
    const { ObjectId } = require("mongodb");
    const id = req.params.alertId;
    if (ObjectId.isValid(id)) {
      await db.collection("spam_alerts").updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "dismissed", dismissed_at: new Date().toISOString() } }
      );
    }
    return res.json({ success: true });
  } catch (_) {
    return res.json({ success: true });
  }
});

try {
  const { wrap } = require("../lib/wrapHandler");
  const smmAdmin = require("../lib/handlers/admin/smmFeaturesAdmin");
  router.get("/ai-conversations", wrap(smmAdmin.aiConversations));
  router.get("/health-scores", wrap(smmAdmin.healthScoresAdmin));
  router.get("/drip-campaigns", wrap(smmAdmin.dripCampaignsAdmin));
  router.get("/reseller-panels", wrap(smmAdmin.resellerPanelsAdmin));
  router.put("/reseller-panels/:id/approve", wrap(smmAdmin.approveReseller));
  router.put("/reseller-panels/:id/suspend", wrap(smmAdmin.suspendReseller));
  router.get("/reorder-alerts", wrap(smmAdmin.reorderAlertsAdmin));
  router.get("/gamification", wrap(smmAdmin.gamificationAdminGet));
  router.put("/gamification", wrap(smmAdmin.gamificationAdminPut));
  router.get("/gamification/leaderboard", wrap(smmAdmin.gamificationLeaderboardAdmin));
  router.post("/gamification/award-xp", wrap(smmAdmin.gamificationAward));
  router.post("/gamification/award-badge", wrap(smmAdmin.gamificationBadge));
  router.get("/collab-listings", wrap(smmAdmin.collabListingsAdmin));
  router.put("/collab-listings/:id/approve", wrap(smmAdmin.collabApprove));
  router.put("/collab-listings/:id/remove", wrap(smmAdmin.collabRemove));
  router.get("/platform-invoices", wrap(smmAdmin.invoicesAdmin));
  router.get("/platform-invoices/:invoiceId/download", wrap(smmAdmin.invoiceAdminDownload));
} catch (e) {
  console.warn("[adminSafe] SMM feature routes not mounted:", e.message);
}

// Default handler for unknown /api/admin paths under the safe router.
router.use((req, res) => {
  res.status(404).json({ error: "Admin route not stubbed in adminSafe", path: req.originalUrl || req.url });
});

module.exports = router;
