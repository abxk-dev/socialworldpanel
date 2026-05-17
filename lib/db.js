const dns = require("dns");
const { MongoClient } = require("mongodb");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function getMongoUri() {
  return process.env.MONGODB_URI || process.env.MONGO_URL;
}

function getMongoFallbackUri() {
  return process.env.MONGODB_URI_FALLBACK || process.env.MONGO_URL_FALLBACK || "";
}

/**
 * Optional public DNS override for mongodb+srv resolution.
 * Disabled by default because hard-forcing public resolvers can break
 * local/dev networks where outbound DNS to those resolvers is blocked.
 * Enable only when needed via MONGO_FORCE_PUBLIC_DNS=1.
 */
function ensureSrvDns() {
  const shouldForcePublicDns =
    process.env.MONGO_FORCE_PUBLIC_DNS === "1" ||
    process.env.MONGO_FORCE_PUBLIC_DNS === "true";
  if (!shouldForcePublicDns) return;
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  } catch (e) {
    // ignore if setServers fails (e.g. in some sandboxes)
  }
}

function getDbName() {
  return process.env.DB_NAME || "socialworldpanel";
}

function isDnsResolutionError(error) {
  const msg = (error && (error.message || String(error))) || "";
  const code = error && error.code;
  return (
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    /getaddrinfo ENOTFOUND/i.test(msg) ||
    /querySrv ECONNREFUSED/i.test(msg) ||
    /queryA ECONNREFUSED/i.test(msg)
  );
}

const globalCache = globalThis;
if (!globalCache.__mongoCache) {
  globalCache.__mongoCache = { client: null, promise: null };
}

const cache = globalCache.__mongoCache;

/** Connect and cache MongoDB. Call before routes that need DB. Returns null if MONGODB_URI is not set. */
async function connectDb() {
  const uri = getMongoUri();
  if (!uri || !uri.trim()) {
    console.warn("[DB] MONGODB_URI (or MONGO_URL) is missing or empty - set it in Vercel Environment Variables");
    return null;
  }
  const dbName = getDbName();
  // If requested, force public DNS for *all* resolution paths (SRV + fallback hosts).
  // This prevents intermittent ENOTFOUND for the fallback `ac-*.mongodb.net` hosts.
  ensureSrvDns();
  if (cache.client) {
    return cache.client.db(dbName);
  }
  if (!cache.promise) {
    let uriToUse = uri.trim();
    if (uriToUse.includes("mongodb.net") && !uriToUse.includes("retryWrites")) {
      uriToUse += (uriToUse.includes("?") ? "&" : "?") + "retryWrites=true&w=majority";
    }
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 20000,
    };
    cache.promise = (async () => {
      try {
        // First attempt with system DNS (default)
        return await MongoClient.connect(uriToUse, opts);
      } catch (firstErr) {
        // If SRV/DNS fails for Atlas, retry once with public DNS as fallback.
        if (uriToUse.startsWith("mongodb+srv://") && isDnsResolutionError(firstErr)) {
          try {
            ensureSrvDns();
            return await MongoClient.connect(uriToUse, opts);
          } catch (retryErr) {
            const fallbackUri = (getMongoFallbackUri() || "").trim();
            // Final fallback: explicit mongodb:// URI (non-SRV) if provided.
            if (fallbackUri) {
              let fallbackToUse = fallbackUri;
              if (fallbackToUse.includes("mongodb.net") && !fallbackToUse.includes("retryWrites")) {
                fallbackToUse += (fallbackToUse.includes("?") ? "&" : "?") + "retryWrites=true&w=majority";
              }
              return await MongoClient.connect(fallbackToUse, opts);
            }
            throw retryErr;
          }
        }
        throw firstErr;
      }
    })();
  }
  try {
    cache.client = await cache.promise;
  } catch (e) {
    console.error("[DB] MongoDB connection failed:", e.message, "code:", e.code || "N/A");
    cache.promise = null;
    throw e;
  }
  const db = cache.client.db(dbName);
  // Create indexes for performance (ignore errors if collections missing)
  try {
    await db.collection("orders").createIndex({ user_id: 1, created_at: -1 });
    await db.collection("orders").createIndex({ bundle_order_id: 1 });
    await db.collection("orders").createIndex({ status: 1 });
    await db.collection("orders").createIndex({ is_scheduled: 1, scheduled_for: 1 });
    await db.collection("orders").createIndex({ created_at: -1, status: 1 });
    await db.collection("orders").createIndex({ is_free_trial: 1 });
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("users").createIndex({ user_id: 1 });
    await db.collection("notifications").createIndex({ user_id: 1, is_read: 1 });
    await db.collection("services").createIndex({ category_id: 1, status: 1 });
    await db.collection("users").createIndex({ username: 1 }, { unique: true, sparse: true });
    await db.collection("users").createIndex({ referral_code: 1 }, { unique: true, sparse: true });
    await db.collection("user_login_history").createIndex({ user_id: 1, logged_in_at: -1 });
    await db.collection("user_login_history").createIndex({ ip_address: 1, logged_in_at: -1 });
    await db.collection("spam_alerts").createIndex({ status: 1, created_at: -1 });
    await db.collection("spam_alerts").createIndex({ ip_address: 1, alert_type: 1 });
    await db.collection("ip_scan_history").createIndex({ scanned_at: -1 });
    await db.collection("free_trial_ips").createIndex({ ip_address: 1 }, { unique: true });
    await db.collection("spin_history").createIndex({ user_id: 1, spun_at: -1 });
    await db.collection("vip_tiers").createIndex({ min_total_spend: 1 });
    await db.collection("upi_deposits").createIndex({ upi_txn_id: 1 }, { unique: true });
    await db.collection("upi_deposits").createIndex({ user_id: 1, created_at: -1 });
    await db.collection("upi_deposits").createIndex({ status: 1, created_at: -1 });
    // New indexes for PhonePe / Paytm UPI verification
    await db.collection("upi_deposits").createIndex({ order_id: 1 }, { unique: true, sparse: true });
    await db.collection("upi_deposits").createIndex({ paytm_bank_txn_id: 1 }, { sparse: true });
    await db.collection("security_logs").createIndex({ event: 1, created_at: -1 });
    await db.collection("crypto_deposits").createIndex({ cryptomus_invoice_id: 1 }, { unique: true });
    await db.collection("crypto_deposits").createIndex({ user_id: 1, created_at: -1 });
    await db.collection("crypto_deposits").createIndex({ order_id: 1 }, { unique: true });
    await db.collection("deposits").createIndex({ transaction_id: 1 }, { unique: true, sparse: true });
    await db.collection("deposits").createIndex({ txn_id: 1 }, { unique: true, sparse: true });
    await db.collection("deposits").createIndex({ invoice_id: 1 }, { unique: true, sparse: true });
    await db.collection("deposits").createIndex({ user_id: 1, created_at: -1 });
    await db.collection("balance_transactions").createIndex({ user_id: 1, created_at: -1 });
    await db.collection("manual_deposit_requests").createIndex({ status: 1, created_at: -1 });
    await db.collection("tickets").createIndex({ user_id: 1, created_at: -1 });
    await db.collection("tickets").createIndex({ ticket_id: 1 }, { unique: true });
    await db.collection("bundle_packages").createIndex({ name: 1 }, { unique: true });
    await db.collection("refill_requests").createIndex({ order_id: 1 });
    await db.collection("refill_requests").createIndex({ status: 1, updated_at: -1 });
    await db.collection("refills").createIndex({ order_id: 1, created_at: -1 });
    await db.collection("refills").createIndex({ provider_order_id: 1 });
    await db.collection("resellers").createIndex({ email: 1 }, { unique: true });
    await db.collection("resellers").createIndex({ custom_domain: 1 }, { unique: true });
    await db.collection("resellers").createIndex({ api_key: 1 }, { unique: true, sparse: true });
    await db.collection("reseller_service_prices").createIndex({ reseller_id: 1, service_id: 1 }, { unique: true });
    await db.collection("reseller_users").createIndex({ reseller_id: 1, email: 1 }, { unique: true });
    await db.collection("orders").createIndex({ is_reseller_order: 1, reseller_id: 1 });
    await db.collection("orders").createIndex({ reseller_user_id: 1, created_at: -1 });
    await db.collection("loyalty_transactions").createIndex({ user_id: 1, created_at: -1 });
    await db.collection("loyalty_transactions").createIndex({ order_id: 1 });
    await db.collection("loyalty_transactions").createIndex({ status: 1 });
    await db.collection("loyalty_transactions").createIndex({ hold_until: 1 });
    await db.collection("mass_orders").createIndex({ user_id: 1, created_at: -1 });
    await db.collection("mass_orders").createIndex({ status: 1 });
    await db.collection("mass_orders").createIndex({ drip_next_at: 1 });
    await db.collection("orders").createIndex({ mass_order_id: 1, mass_order_index: 1 });
    await db.collection("reviews").createIndex({ user_id: 1, service_id: 1 }, { unique: true });
    await db.collection("reviews").createIndex({ service_id: 1 });
    await db.collection("reviews").createIndex({ is_visible: 1 });
    await db.collection("providers").createIndex({ priority: 1 }, { unique: true });
    await db.collection("providers").createIndex({ api_url: 1 });
    await db.collection("provider_service_mappings").createIndex({ service_id: 1 }, { unique: true });
    await db.collection("orders").createIndex({ provider_id: 1, status: 1 });
    await db.collection("orders").createIndex({ pending_since: 1 });
    await db.collection("recommendation_logs").createIndex({ user_id: 1, created_at: -1 });
    await db.collection("withdrawals").createIndex({ user_id: 1, created_at: -1 });
    await db.collection("withdrawals").createIndex({ status: 1 });
    await db.collection("withdrawals").createIndex({ created_at: -1 });
  } catch (e) {
    if (e.code !== 85 && e.code !== 86) console.warn("DB index creation:", e.message);
  }
  try {
    if (!globalCache.__providerMigrationDone) {
      const { migrateExistingProvider } = require("./handlers/providerHandler");
      await migrateExistingProvider(db);
      globalCache.__providerMigrationDone = true;
    }
  } catch (migErr) {
    console.warn("Provider migration:", migErr.message);
  }
  return db;
}

/** Get DB instance (must have called connectDb first, or will connect on first use). */
async function getDb() {
  return connectDb();
}

module.exports = { connectDb, getDb, ensureSrvDns };
