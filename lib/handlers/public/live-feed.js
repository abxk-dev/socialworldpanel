// Public live order feed for homepage / dashboard ticker + toasts.
const { getDb, ensureSrvDns } = require("../../db");

async function safeGetDb(timeoutMs = 5000) {
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

function clampSpeed(ms) {
  const n = parseInt(ms, 10);
  if (!Number.isFinite(n)) return 3000;
  return Math.min(60000, Math.max(1000, n));
}

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function flagEmoji(countryRaw) {
  if (!countryRaw || typeof countryRaw !== "string") return "🌍";
  const c = countryRaw.trim();
  if (c.length === 2 && /^[a-z]{2}$/i.test(c)) {
    const A = 0x1f1e6;
    const up = c.toUpperCase();
    return String.fromCodePoint(A + up.charCodeAt(0) - 65, A + up.charCodeAt(1) - 65);
  }
  return "🌍";
}

function displayCountry(userDoc, showCountry) {
  if (!showCountry) return "";
  const cc = userDoc?.country_code || userDoc?.countryCode;
  const name = userDoc?.country_name || userDoc?.country;
  if (name && String(name).trim()) return String(name).trim();
  if (cc && String(cc).trim()) return String(cc).trim().toUpperCase();
  return "Global";
}

module.exports = async function liveFeed(req, res) {
  const localBypass =
    process.env.NODE_ENV !== "production" || process.env.LOCAL_BYPASS_AUTH === "1";

  const empty = () =>
    res.json({
      enabled: false,
      feed: [],
      total_today: 0,
      speed_ms: 3000,
      show_toast: true,
    });

  const db = await safeGetDb(Number(process.env.SWP_PUBLIC_SETTINGS_DB_TIMEOUT_MS || 5000));
  if (!db) {
    if (localBypass && globalThis.__swpLocalAdminSettings) {
      const g = globalThis.__swpLocalAdminSettings;
      const enabled = g.live_feed_enabled !== false;
      return res.json({
        enabled: false,
        feed: [],
        total_today: 0,
        speed_ms: clampSpeed(g.live_feed_speed_ms),
        show_toast: g.live_feed_show_toast !== false,
      });
    }
    return empty();
  }

  let settings = {};
  try {
    settings =
      (await db
        .collection("admin_settings")
        .findOne({}, { sort: { updated_at: -1, _id: -1 } })
        .catch(() => null)) || {};
  } catch (_) {
    return empty();
  }

  const featureOn = settings.live_feed_enabled !== false;
  const showCountry = settings.live_feed_show_country !== false;
  const speedMs = clampSpeed(settings.live_feed_speed_ms ?? 3000);
  const showToast = settings.live_feed_show_toast !== false;

  if (!featureOn) {
    return res.json({
      enabled: false,
      feed: [],
      total_today: 0,
      speed_ms: speedMs,
      show_toast: showToast,
    });
  }

  const since = new Date(Date.now() - 90 * 86400000);
  let orders = [];
  try {
    orders = await db
      .collection("orders")
      .find(
        { created_at: { $gte: since.toISOString() } },
        {
          projection: {
            user_id: 1,
            service_name: 1,
            service_id: 1,
            created_at: 1,
            quantity: 1,
          },
        }
      )
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();
  } catch (_) {
    orders = [];
  }

  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];
  let usersById = {};
  if (userIds.length) {
    try {
      const users = await db
        .collection("users")
        .find({ user_id: { $in: userIds } }, { projection: { user_id: 1, country: 1, country_code: 1, country_name: 1 } })
        .toArray();
      usersById = Object.fromEntries(users.map((u) => [u.user_id, u]));
    } catch (_) {
      usersById = {};
    }
  }

  let feed = orders.map((o) => {
    const u = o.user_id ? usersById[o.user_id] : null;
    const country = displayCountry(u, showCountry);
    const flag = showCountry ? flagEmoji(u?.country_code || u?.countryCode || country) : "";
    const service =
      (o.service_name && String(o.service_name).trim()) ||
      (o.service_id != null ? `Service #${o.service_id}` : "a service");
    return {
      flag,
      country,
      service,
      time_ago: timeAgo(o.created_at),
    };
  });

  if (featureOn && feed.length === 0) {
    feed = [
      {
        flag: "✨",
        country: "",
        service: "Live feed is on — orders will appear here as customers place them.",
        time_ago: "",
      },
    ];
  }

  let totalToday = 0;
  try {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    totalToday = await db.collection("orders").countDocuments({
      created_at: { $gte: start.toISOString() },
    });
  } catch (_) {
    totalToday = 0;
  }

  const enabled = featureOn && feed.length > 0;

  return res.json({
    enabled,
    feed,
    total_today: totalToday,
    speed_ms: speedMs,
    show_toast: showToast,
  });
};
