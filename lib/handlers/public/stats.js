// Minimal public stats handler for `/api/public/stats`.
// HomePage expects:
// - total_orders, total_users, total_services, orders_today
// - config: { auto_increment, min, max, interval }

const { getDb, ensureSrvDns } = require("../../db");

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function safeGetDb(timeoutMs = 1200) {
  try {
    await ensureSrvDns?.();
    const p = getDb();
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DB_CONNECT_TIMEOUT")), timeoutMs)
    );
    return await Promise.race([p, timeout]);
  } catch (_) {
    return null;
  }
}

module.exports = async function publicStats(req, res) {
  const fallback = {
    total_orders: 0,
    total_users: 0,
    total_services: 0,
    orders_today: 0,
    online_users: 0,
    avg_delivery_time: null,
    config: {
      auto_increment: false,
      min: 1,
      max: 5,
      interval: 5,
    },
  };

  const db = await safeGetDb(Number(process.env.SWP_PUBLIC_STATS_DB_TIMEOUT_MS || 1200));
  if (!db) return res.json(fallback);

  const settings = await db.collection("admin_settings").findOne({}) || {};
  const vs = settings.virtual_stats || {};

  const auto_increment = vs.auto_increment === true;
  const min = safeNumber(vs.increment_min || 1);
  const max = safeNumber(vs.increment_max || 5);
  const interval = safeNumber(vs.increment_interval || 5);

  return res.json({
    total_orders: safeNumber(vs.base_orders),
    total_users: safeNumber(vs.base_users),
    total_services: safeNumber(vs.base_services),
    orders_today: safeNumber(vs.base_orders_today),
    online_users: safeNumber(vs.online_users),
    avg_delivery_time: null,
    config: {
      auto_increment,
      min,
      max,
      interval,
    },
  });
};

