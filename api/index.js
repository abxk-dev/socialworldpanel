/**
 * Express server entry (Vercel serverless).
 * All route files from /routes are loaded and mounted under /api/*.
 * Entry: api/index.js (no backend/server.js — this file is the app).
 */
const path = require("path");
const fs = require("fs");
const dns = require("dns").promises;
const { URL } = require("url");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Log env state for production debugging (no secrets)
const hasMongo = !!(process.env.MONGODB_URI || process.env.MONGO_URL);
const hasJwt = !!process.env.JWT_SECRET;
if (process.env.NODE_ENV === "production") {
  console.log("[API] Env check: MONGODB_URI/MONGO_URL=" + (hasMongo ? "set" : "MISSING") + ", JWT_SECRET=" + (hasJwt ? "set" : "MISSING"));
}

const express = require("express");
const { connectDb, getDb, ensureSrvDns } = require("../lib/db");
let startBackgroundJobs;
try {
  startBackgroundJobs = require("../lib/jobs/runner").startBackgroundJobs;
} catch (e) {
  startBackgroundJobs = () => {};
}
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

// Preserve full request path so Vercel/serverless and Express see the same path (img/API routes)
app.use((req, res, next) => {
  try {
    const candidates = [
      req.originalUrl,
      req.url,
      req.headers["x-original-url"],
      req.headers["x-url"],
      req.headers["x-vercel-invoke-path"],
      req.headers["x-invoke-path"],
    ].filter((v) => typeof v === "string" && v);

    let pathToUse = candidates[0] || req.url;
    const hasPathQuery = candidates.find((v) => v.includes("?") && v.includes("path="));
    if (hasPathQuery) pathToUse = hasPathQuery;

    if (pathToUse && typeof pathToUse === "string") {
      const u = new URL(pathToUse, "http://localhost");
      const pathname = u.pathname || "";
      const seg = String(u.searchParams.get("path") || "").trim();
      if (pathname === "/api" && seg) {
        const rest = new URLSearchParams(u.searchParams);
        rest.delete("path");
        const q = rest.toString();
        req.url = `/api/${seg.replace(/^\/+/, "")}${q ? `?${q}` : ""}`;
      } else {
        req.url = pathname + (u.search || "");
      }
    }

    const pathname = (req.url || "").split("?")[0];
    if (pathname && pathname.startsWith("/api") && process.env.NODE_ENV === "production") {
      console.log("[API] Request path:", req.method, pathname);
    }
  } catch (e) {
    console.error("[API] Path restoration error:", e.message);
  }
  next();
});

// Favicon — never 500 (204 if missing); wrap so sendFile/existsSync never crash
app.get("/favicon.ico", (req, res) => {
  try {
    const candidates = [
      path.join(process.cwd(), "public", "favicon.ico"),
      path.join(process.cwd(), "frontend", "public", "favicon.ico"),
      path.join(__dirname, "..", "public", "favicon.ico"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        res.setHeader("Content-Type", "image/x-icon");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.sendFile(p);
      }
    }
  } catch (e) {
    console.error("Favicon .ico error:", e.message);
  }
  if (!res.headersSent) res.status(204).end();
});
app.get("/favicon.png", (req, res) => {
  try {
    const candidates = [
      path.join(process.cwd(), "public", "favicon.png"),
      path.join(process.cwd(), "frontend", "public", "favicon.png"),
      path.join(__dirname, "..", "public", "favicon.png"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        res.setHeader("Content-Type", "image/png");
        return res.sendFile(p);
      }
    }
  } catch (e) {
    console.error("Favicon .png error:", e.message);
  }
  if (!res.headersSent) res.status(204).end();
});
app.get("/favicon", (req, res) => {
  if (!res.headersSent) res.status(204).end();
});

// Simple ping - no DB, proves backend is running (for debugging deployment)
app.get("/api/ping", (req, res) => {
  res.status(200).json({ ok: true, message: "Backend is running", timestamp: new Date().toISOString() });
});

// Test route: GET /api/test — confirms Express is up and routes are mounted
app.get("/api/test", (req, res) => {
  res.json({ status: "API working" });
});

// DNS diagnostics for MongoDB Atlas resolution issues (no DB required)
app.get("/api/diagnostics/dns", async (req, res) => {
  try {
    // Ensure the same DNS settings we use for Mongo connections.
    // Without this, diagnostics can fail even when Mongo could connect using the fallback DNS strategy.
    ensureSrvDns();

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || "";
    if (!mongoUri) {
      return res.status(200).json({
        ok: false,
        message: "MONGODB_URI/MONGO_URL is not set",
        checks: [],
      });
    }

    let host = "";
    try {
      host = new URL(mongoUri).hostname || "";
    } catch (_) {
      const m = mongoUri.match(/@([^/?]+)/);
      host = m?.[1]?.split(",")?.[0] || "";
    }

    if (!host) {
      return res.status(200).json({
        ok: false,
        message: "Could not parse MongoDB host from URI",
        checks: [],
      });
    }

    const checks = [];
    const pushResult = async (name, fn) => {
      try {
        const result = await fn();
        checks.push({ name, ok: true, result });
      } catch (e) {
        checks.push({
          name,
          ok: false,
          error: e?.message || String(e),
          code: e?.code || null,
        });
      }
    };

    await pushResult("dns.lookup(host)", () => dns.lookup(host, { all: true }));
    await pushResult("dns.resolve4(host)", () => dns.resolve4(host));
    await pushResult("dns.resolveSrv(_mongodb._tcp.host)", () => dns.resolveSrv(`_mongodb._tcp.${host}`));

    const ok = checks.some((c) => c.ok);
    return res.status(200).json({
      ok,
      host,
      message: ok
        ? "At least one DNS check passed"
        : "All DNS checks failed (likely DNS/network issue)",
      checks,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err?.message || "DNS diagnostics failed",
      checks: [],
    });
  }
});

// Connect DB before routes that need it (skip for public/settings, live-feed, ping, currencies so they can return safe payloads without DB)
app.use("/api", async (req, res, next) => {
  const p = (
    req.headers["x-vercel-invoke-path"] ||
    req.headers["x-invoke-path"] ||
    req.url ||
    req.originalUrl ||
    ""
  ).split("?")[0];
  const skipDb = p === "/api/ping" ||
    p === "/api/test" ||
    p === "/api/diagnostics/dns" || p.endsWith("/diagnostics/dns") ||
    p === "/api/public/settings" || p.endsWith("/public/settings") ||
    p === "/api/public/live-feed" || p.endsWith("/public/live-feed") ||
    p === "/api/currencies" || p.endsWith("/currencies") ||
    p === "/api/reseller/config" || p.endsWith("/reseller/config");
  const optionalDb = p === "/api/public/stats" || p.endsWith("/public/stats") ||
    (p.startsWith("/api/admin/uploads") || p.includes("/admin/uploads/")) ||
    (p.startsWith("/api/public/uploads") || p.includes("/public/uploads/")) ||
    p === "/api/public/theme" || p.endsWith("/public/theme") ||
    p === "/api/admin/settings/theme" || p.endsWith("/admin/settings/theme") ||
    p === "/api/admin/settings" || p.endsWith("/admin/settings") ||
    p === "/api/admin/dashboard" || p.endsWith("/admin/dashboard") ||
    p === "/api/admin/dashboard/charts" || p.endsWith("/admin/dashboard/charts") ||
    p === "/api/admin/users" || p.endsWith("/admin/users") ||
    p.includes("/admin/users/bulk") ||
    p === "/api/admin/tickets" || p.endsWith("/admin/tickets") ||
    p === "/api/admin/withdrawals/stats" || p.endsWith("/admin/withdrawals/stats") ||
    p === "/api/admin/recommendations/stats" || p.endsWith("/admin/recommendations/stats") ||
    // adminSafe stubs (allow admin UI to work without Mongo connectivity)
    p === "/api/admin/admin-nav" || p.endsWith("/admin/admin-nav") ||
    p === "/api/admin/theme" || p.endsWith("/admin/theme") ||
    p === "/api/admin/stats-settings" || p.endsWith("/admin/stats-settings") ||
    p === "/api/admin/files" || p.endsWith("/admin/files") ||
    p === "/api/admin/services" || p.endsWith("/admin/services") ||
    p === "/api/admin/services/avg-times" || p.endsWith("/admin/services/avg-times") ||
    p === "/api/admin/providers" || p.endsWith("/admin/providers") ||
    p === "/api/admin/orders" || p.endsWith("/admin/orders") ||
    p === "/api/admin/refills" || p.endsWith("/admin/refills") ||
    p === "/api/admin/resellers" || p.endsWith("/admin/resellers") ||
    p === "/api/admin/bundles" || p.endsWith("/admin/bundles") ||
    p === "/api/admin/categories" || p.endsWith("/admin/categories") ||
    p === "/api/admin/bonus/settings" || p.endsWith("/admin/bonus/settings") ||
    p === "/api/admin/bonus/tiers" || p.endsWith("/admin/bonus/tiers") ||
    p === "/api/admin/bonus/promotions" || p.endsWith("/admin/bonus/promotions") ||
    p === "/api/admin/loyalty/settings" || p.endsWith("/admin/loyalty/settings") ||
    p === "/api/admin/loyalty/users" || p.endsWith("/admin/loyalty/users") ||
    p === "/api/admin/loyalty/transactions" || p.endsWith("/admin/loyalty/transactions") ||
    p === "/api/admin/vip-tiers" || p.endsWith("/admin/vip-tiers") ||
    p === "/api/admin/user-pricing" || p.endsWith("/admin/user-pricing") ||
    p === "/api/admin/logs" || p.endsWith("/admin/logs") ||
    p === "/api/admin/meta" || p.endsWith("/admin/meta") ||
    p === "/api/admin/pages" || p.endsWith("/admin/pages") ||
    p === "/api/admin/category-management/flat" || p.endsWith("/admin/category-management/flat") ||
    p === "/api/admin/hidden-services" || p.endsWith("/admin/hidden-services") ||
    p === "/api/promocodes" || p.endsWith("/promocodes") ||
    (p.includes("/admin/spam")) ||
    p === "/api/admin/spam-stats" || p.endsWith("/admin/spam-stats") ||
    p === "/api/admin/spam-scan-history" || p.endsWith("/admin/spam-scan-history") ||
    p === "/api/auth/login" || p.endsWith("/auth/login") ||
    p === "/api/reseller/config" || p.endsWith("/reseller/config");
  if (skipDb) return next();
  try {
    await connectDb();
    try { startBackgroundJobs(); } catch (_) {}
    next();
  } catch (err) {
    console.error("[API] DB connection failed:", err.message, "path:", p);
    if (optionalDb) return next();
    if (!res.headersSent) res.status(500).json({ error: "Database unavailable", message: err.message });
  }
});

const domainMiddleware = require("../lib/middleware/domainMiddleware");
app.use("/api", domainMiddleware);

// Route modules from /routes — all mounted under /api/* (load failure → 503 for that prefix)
const { wrap } = require("../lib/wrapHandler");

function loadRoute(desc, fn) {
  try {
    return fn();
  } catch (err) {
    console.error("Route load failed:", desc, err.message, err.stack);
    const express = require("express");
    const r = express.Router();
    r.use((req, res) => {
      res.status(503).json({ error: "Service temporarily unavailable", route: desc, message: err.message });
    });
    return r;
  }
}

const authRoutes = loadRoute("auth", () => require("../routes/auth"));
const orderRoutes = loadRoute("orders", () => require("../routes/orders"));
const serviceRoutes = loadRoute("services", () => require("../routes/services"));
const userRoutes = loadRoute("user", () => require("../routes/user"));
const depositsRoutes = loadRoute("deposits", () => require("../routes/deposits"));
const ticketsRoutes = loadRoute("tickets", () => require("../routes/tickets"));
const publicRoutes = loadRoute("public", () => require("../routes/public"));
const freeTrialRoutes = loadRoute("free-trial", () => require("../routes/free-trial"));
let adminRoutes;
try {
  adminRoutes = require("../routes/admin");
} catch (err) {
  console.error("[API] Admin route load failed, using adminSafe:", err.message);
  adminRoutes = require("../routes/adminSafe");
}
const instagramRoutes = loadRoute("instagram", () => require("../routes/instagram"));
const accountsRoutes = loadRoute("accounts", () => require("../routes/accounts"));
const templatesRoutes = loadRoute("templates", () => require("../routes/templates"));
const recommendRoutes = loadRoute("recommend", () => require("../routes/recommend"));
const currenciesRoutes = loadRoute("currencies", () => require("../routes/currencies"));
const spinRoutes = loadRoute("spin", () => require("../routes/spin"));
const upiRoutes = loadRoute("upi", () => require("../routes/upi"));
const paymentRoutes = loadRoute("payment", () => require("../routes/payment"));
const addFundsRoutes = loadRoute("addfunds", () => require("../routes/addfunds"));
const refillsRoutes = loadRoute("refills", () => require("../routes/refills"));
const resellerRoutes = loadRoute("reseller", () => require("../routes/reseller"));
const loyaltyRoutes = loadRoute("loyalty", () => require("../routes/loyalty"));
const analyticsRoutes = loadRoute("analytics", () => require("../routes/analytics"));
const reviewRoutes = loadRoute("reviews", () => require("../routes/reviews"));
const withdrawalRoutes = loadRoute("withdrawals", () => require("../routes/withdrawals"));
const promocodeRoutes = loadRoute("promocodes", () => require("../routes/promocodes"));
const userPricingRoutes = loadRoute("user-pricing", () => require("../routes/user-pricing"));
const collaborationsRoutes = loadRoute("collaborations", () => require("../routes/collaborations"));
const campaignsRoutes = loadRoute("campaigns", () => require("../routes/campaigns"));
const influencersRoutes = loadRoute("influencers", () => require("../routes/influencers"));
const contractsRoutes = loadRoute("contracts", () => require("../routes/contracts"));
const collabReviewsRoutes = loadRoute("collab-reviews", () => require("../routes/collab-reviews"));
const aiRoutes = loadRoute("ai", () => require("../routes/ai"));
const healthScoreRoutes = loadRoute("health-score", () => require("../routes/healthScore"));
const dripRoutes = loadRoute("drip", () => require("../routes/drip"));
const reorderAlertsRoutes = loadRoute("reorder-alerts", () => require("../routes/reorderAlerts"));
const gamificationRoutes = loadRoute("gamification", () => require("../routes/gamificationRoutes"));
const collabMarketRoutes = loadRoute("collab-market", () => require("../routes/collabMarket"));
const invoicesRoutes = loadRoute("invoices", () => require("../routes/invoices"));
const blogRoutes = loadRoute("blogs", () => require("../routes/blogs"));
const blogAdminRoutes = loadRoute("blog-admin", () => require("../routes/blog-admin"));
const categoriesRoutes = loadRoute("categories", () => require("../routes/categories"));
const categoryMgmtRoutes = loadRoute("category-management", () => require("../routes/categoryManagement"));
const { getActiveTheme, updateTheme } = require("../lib/handlers/themeHandler");
const bundleHandler = require("../lib/handlers/bundleHandler");
const { seedPlatforms } = require("../lib/seedPlatforms");

// Health — includes DB check
app.get("/api/health", wrap(async (req, res) => {
  try {
    await connectDb();
    const db = await getDb();
    await db.collection("users").findOne({}, { projection: { _id: 1 } });
    res.status(200).json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Health check error:", err.message, err.stack);
    res.status(500).json({ status: "error", error: err.message || "Database unavailable" });
  }
}));

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/user", userRoutes);
app.use("/api/deposits", depositsRoutes);
app.use("/api/tickets", ticketsRoutes);
app.use("/api/public", publicRoutes);
app.get("/api/public/theme", wrap(getActiveTheme));
app.put("/api/admin/settings/theme", wrap(updateTheme));
app.use("/api/free-trial", freeTrialRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/instagram", instagramRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/recommend", recommendRoutes);
app.use("/api/currencies", currenciesRoutes);
app.use("/api/spin", spinRoutes);
app.use("/api/upi", upiRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/addfunds", addFundsRoutes);
app.use("/api/refills", refillsRoutes);
app.use("/api/reseller", resellerRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/promocodes", promocodeRoutes);
// mount user-pricing routes:
// - /api/user/my-pricing (user-side)
// - /api/admin/user-pricing/* (admin helper endpoints)
app.use("/api/user", userPricingRoutes);
app.use("/api/admin/user-pricing", userPricingRoutes);
app.use("/api/collaborations", collaborationsRoutes);
app.use("/api/campaigns", campaignsRoutes);
app.use("/api/influencers", influencersRoutes);
app.use("/api/contracts", contractsRoutes);
app.use("/api/collab-reviews", collabReviewsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/health-score", healthScoreRoutes);
app.use("/api/drip", dripRoutes);
app.use("/api/reorder-alerts", reorderAlertsRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/collab", collabMarketRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/blogs", blogRoutes);

// Scheduled jobs (Vercel Cron): set CRON_SECRET and call ?secret=...
function cronAllowed(req) {
  const vercelCron = String(req.headers["x-vercel-cron"] || "") === "1";
  const secret = String(req.query.secret || "");
  const expected = String(process.env.CRON_SECRET || "");
  return vercelCron || (expected && secret && secret === expected);
}

app.get(
  "/api/cron/drip",
  wrap(async (req, res) => {
    if (!cronAllowed(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await connectDb();
    await require("../lib/jobs/dripCampaignProcessor").processTick();
    res.json({ ok: true });
  })
);
app.get(
  "/api/cron/reorder-alerts",
  wrap(async (req, res) => {
    if (!cronAllowed(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await connectDb();
    await require("../lib/jobs/reorderAlertDetector").runDaily();
    res.json({ ok: true });
  })
);
app.get(
  "/api/cron/ip-scan",
  wrap(async (req, res) => {
    if (!cronAllowed(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await connectDb();
    const { runFullIpScan } = require("../lib/jobs/autoIpScanner");
    const result = await runFullIpScan({ scanType: "auto" });
    res.json({ ok: true, ...result });
  })
);

// Secure one-time admin bootstrap (POST, requires CRON_SECRET or Vercel Cron header)
app.post(
  "/api/admin/bootstrap-superadmin",
  wrap(async (req, res) => {
    if (!cronAllowed(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await connectDb();
    const handler = require("../lib/handlers/admin/bootstrapSuperAdmin");
    return handler(req, res);
  })
);

app.get(
  "/api/cron/sync-orders",
  wrap(async (req, res) => {
    if (!cronAllowed(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await connectDb();
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    const minAgeMs = Math.max(0, Number(req.query.min_age_ms || 5 * 60 * 1000));
    const out = await require("../lib/jobs/providerOrderStatusSync").runTick({ limit, minAgeMs });
    res.json({ ok: true, ...out });
  })
);
app.use("/api/admin/blogs", blogAdminRoutes);
app.use("/api", categoriesRoutes);
app.use("/api", categoryMgmtRoutes);

// Seed default platforms and backfill existing categories on cold start.
// Safe to call multiple times; seeder is idempotent.
seedPlatforms().catch(err => {
  console.error("Seed failed:", err.message || err);
});

// Start count (lazy load so a bug here cannot break login or other routes)
app.get("/api/start-count", wrap(async (req, res) => {
  try {
    const startCountHandler = require("../lib/handlers/startCountHandler");
    return startCountHandler.fetchStartCount(req, res);
  } catch (err) {
    console.error("start-count load or run error:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Service unavailable" });
  }
}));

// Bundle packages (public + admin + ordering)
app.get("/api/bundles", wrap(bundleHandler.listBundles));
app.get("/api/bundles/:id", wrap(bundleHandler.getBundleById));
app.get("/api/admin/bundles", wrap(bundleHandler.adminListBundles));
app.post("/api/admin/bundles", wrap(bundleHandler.createBundle));
app.put("/api/admin/bundles/:id", wrap(bundleHandler.updateBundle));
app.delete("/api/admin/bundles/:id", wrap(bundleHandler.deleteBundle));

// 404 — path only (no query) so "Route /api/test not found" not "Route /api/test?path=test not found"
app.use("/api", (req, res) => {
  const full = req.originalUrl || req.url || req.path || "";
  const pathname = full.split("?")[0] || full;
  console.log("[API] 404 — no route for:", pathname);
  res.status(404).json({
    error: "Route not found",
    path: pathname,
    message: "No handler registered for this path. API is Express in api/index.js (Vercel serverless), not Next.js.",
  });
});

// Global error handler (must not throw so Vercel doesn't report FUNCTION_INVOCATION_FAILED)
app.use((err, req, res, next) => {
  try {
    const path = (req && (req.originalUrl || req.url)) || "";
    console.error("GLOBAL ERROR", path, err.message, err.stack);
    if (res.headersSent) return;
    const msg = process.env.NODE_ENV === "production" ? "Internal Server Error" : (err.message || "Internal Server Error");
    res.status(500).json({ error: "Internal server error", message: msg });
  } catch (e) {
    console.error("GLOBAL ERROR HANDLER FAILED:", e.message);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal server error", message: "Internal Server Error" }));
    }
  }
});

// Avoid process exit on unhandled rejection (can cause Vercel 503)
if (typeof process !== "undefined") {
  process.on("unhandledRejection", (reason, promise) => {
    console.error("[API] Unhandled rejection:", reason && (reason.message || reason));
  });
}

// Vercel cold start: run IP scan if >6h since last run. Local dev uses startAutoScanner from local-api-server.js instead.
(function scheduleIpScanOnColdStart() {
  if (!process.env.VERCEL && !process.env.FORCE_SERVERLESS_IP_SCAN) return;
  if (globalThis.__swpIpScanColdStart) return;
  globalThis.__swpIpScanColdStart = true;
  setImmediate(() => {
    (async () => {
      try {
        const { connectDb, getDb } = require("../lib/db");
        await connectDb();
        const db = await getDb();
        if (!db) return;
        const lastScan = await db.collection("ip_scan_history").findOne({}, { sort: { scanned_at: -1 } });
        const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
        const lastTs = lastScan?.scanned_at ? new Date(lastScan.scanned_at).getTime() : 0;
        if (!lastTs || lastTs < sixHoursAgo) {
          const { runFullIpScan } = require("../lib/jobs/autoIpScanner");
          console.log("[AutoIPScan] Cold start: running scan (6h elapsed or first run)");
          await runFullIpScan({ scanType: "auto" }).catch((e) => console.error("[AutoIPScan]", e.message));
        }
      } catch (e) {
        console.error("[AutoIPScan] check error:", e.message);
      }
    })();
  });
})();

// Vercel: single serverless entry; wrap so uncaught sync errors don't crash the function
function handler(req, res) {
  try {
    app(req, res);
  } catch (err) {
    console.error("[API Uncaught]", err.message || err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ detail: err.message || "Internal Server Error" }));
    }
  }
}

module.exports = handler;
