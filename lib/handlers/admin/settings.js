const { getDb } = require("../_db");
const { parseAuth } = require("../_auth");

const DEFAULT_SETTINGS = {
  panel_name: "Social World Panel",
  panel_logo: "",
  panel_logo_light: "",
  panel_logo_light_updated_at: 0,
  favicon: "",
  maintenance_mode: false,
  registration_enabled: true,
  free_balance_new_users: 0,
  default_currency: "USD",
  google_analytics_id: "",
  currency_format: "1000.00",
  balance_format: "default",
  rates_rounding: "hundredth",
  new_order_search_field: "enabled",
  service_name_format: "ID - Name - Rate per 1000",
  new_order_sidebar_note: "",
  new_order_sidebar_note_format: "html",
  free_trial_enabled: false,
  free_trial_service_id: "",
  free_trial_quantity: 50,
  free_trial_label: "50 YouTube Views",
  free_trial_show_on_homepage: true,
  free_trial_link_placeholder: "Paste your link",
  free_trial_disclaimer: "One per account. Results typically in 1–6 hours.",
  free_trial_modal_title: "Claim Your Free Trial",
  free_trial_button_text: "Claim Now — It's Free!",
  free_trial_max_per_ip: 0,
  live_feed_enabled: true,
  live_feed_show_country: true,
  live_feed_show_toast: true,
  live_feed_speed_ms: 3000,
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  smtp_password: "",
};

async function requireAdmin(req, db) {
  const claims = parseAuth(req);
  if (!claims) return null;

  const localBypass =
    process.env.NODE_ENV !== "production" || process.env.LOCAL_BYPASS_AUTH === "1";
  if (localBypass) {
    const role = claims.role || "user";
    if (role === "admin" || role === "main_admin") {
      return { role };
    }
    return null;
  }

  const user = await db.collection("users").findOne({ user_id: claims.sub }, { projection: { _id: 0 } });
  const role = user?.role || "user";
  if (!user || !["admin", "main_admin"].includes(role)) return null;
  return user;
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const db = await getDb();
      if (!db) {
        const local = globalThis.__swpLocalAdminSettings;
        return res.status(200).json(local || DEFAULT_SETTINGS);
      }
      let settings = await db.collection("admin_settings").findOne(
        {},
        { projection: { _id: 0 }, sort: { updated_at: -1, _id: -1 } }
      );
      if (!settings) {
        settings = { ...DEFAULT_SETTINGS, updated_at: new Date().toISOString() };
        try {
          await db.collection("admin_settings").insertOne(settings);
        } catch (_) {}
      }
      // Remove sensitive fields before sending.
      const { cryptomus, ...publicSettings } = settings || {};
      const safeCryptomus = cryptomus
        ? {
            ...cryptomus,
            api_key: cryptomus.api_key ? "***hidden***" : "",
            webhook_secret: cryptomus.webhook_secret ? "***hidden***" : "",
          }
        : {};

      const out = {
        ...publicSettings,
        cryptomus: safeCryptomus,
      };
      delete out.smtp_password;
      return res.status(200).json(out);
    } catch (e) {
      console.error("Admin settings GET error:", e.message);
      return res.status(200).json(DEFAULT_SETTINGS);
    }
  }
  if (req.method !== "PUT") {
    return res.status(405).json({ detail: "Method Not Allowed" });
  }

  // Local-dev: accept updates based on JWT role and store them in memory.
  const localBypass =
    process.env.NODE_ENV !== "production" || process.env.LOCAL_BYPASS_AUTH === "1";
  let bypassAdmin = false;
  if (localBypass) {
    const claims = parseAuth(req);
    const role = claims?.role || "user";
    if (role === "admin" || role === "main_admin") {
      bypassAdmin = true;
    } else {
      return res.status(401).json({ detail: "Unauthorized" });
    }
  }

  let db;
  try {
    db = await getDb();
  } catch (e) {
    console.error("Admin settings DB error:", e.message);
    return res.status(503).json({ detail: "Database unavailable" });
  }
  if (!db) {
    return res.status(503).json({ detail: "Database unavailable" });
  }
  if (!bypassAdmin) {
    const admin = await requireAdmin(req, db);
    if (!admin) {
      return res.status(401).json({ detail: "Unauthorized" });
    }
  }
  try {
    let body = req.body;
    if (!body || typeof body !== "object") {
      const raw = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (c) => (data += c));
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });
      body = raw ? JSON.parse(raw) : {};
    }
    const allowed = [
      "panel_name","panel_logo","favicon","maintenance_mode","registration_enabled",
      "free_balance_new_users","default_currency","google_analytics_id",
      "rapidapi_key","rapidapi_instagram_key","instagram_boost_enabled","max_saved_profiles",
      "notification_popup_limit",
      "hero_headline", "hero_description", "hero_image", "hero_image_updated_at",
      "hero_glow_color",
      "panel_logo_light","panel_logo_light_updated_at",
      "currency_format", "balance_format", "rates_rounding", "new_order_search_field", "service_name_format",
      "referral_commission_percent", "referral_system_enabled",
      "drip_delivery_enabled", "drip_delivery_default_runs", "drip_delivery_default_interval",
      "spin_enabled", "spin_prizes", "spin_free_views_service_id",
      "whatsapp_support_number",
      "mass_order_enabled", "mass_order_max_links", "mass_order_min_interval", "mass_order_max_interval",
      "withdrawal_enabled", "withdrawal_min_amount", "withdrawal_max_amount",
      "withdrawal_fee_fixed", "withdrawal_fee_percentage", "withdrawal_min_spent",
      "withdrawal_crypto_networks",
      // Custom meta / verification / scripts
      "google_site_verification",
      "bing_site_verification",
      "custom_head_html",
      "custom_footer_html",
      "new_order_sidebar_note",
      "new_order_sidebar_note_format",
      "favicon_updated_at",
      "panel_logo_updated_at",
      "hero_image_updated_at",
      // Free trial (also saved via POST /admin/free-trial/settings)
      "free_trial_enabled",
      "free_trial_service_id",
      "free_trial_quantity",
      "free_trial_label",
      "free_trial_show_on_homepage",
      "free_trial_link_placeholder",
      "free_trial_disclaimer",
      "free_trial_modal_title",
      "free_trial_button_text",
      "free_trial_max_per_ip",
      // Live order feed (also saved via POST /admin/live-feed/settings)
      "live_feed_enabled",
      "live_feed_show_country",
      "live_feed_speed_ms",
      "live_feed_show_toast",
      // Outbound email (optional; app may read these later)
      "smtp_host",
      "smtp_port",
      "smtp_user",
      "smtp_password",
    ];
    const updates = {};
    for (const k of allowed) {
      if (!(k in body)) continue;
      if (k === "smtp_password") {
        const p = String(body[k] ?? "").trim();
        if (!p) continue;
        updates[k] = p;
        continue;
      }
      updates[k] = body[k];
    }
    const nowIso = new Date().toISOString();
    const updatesWithMeta = { ...updates, updated_at: nowIso };
    globalThis.__swpLocalAdminSettings = {
      ...(globalThis.__swpLocalAdminSettings || DEFAULT_SETTINGS),
      ...updatesWithMeta,
    };
    const bulk = await db.collection("admin_settings").updateMany({}, { $set: updatesWithMeta });
    if ((bulk?.matchedCount || 0) === 0) {
      await db.collection("admin_settings").insertOne({
        ...DEFAULT_SETTINGS,
        ...updatesWithMeta,
      });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(400).json({ detail: e.message || "Failed to update settings" });
  }
}
