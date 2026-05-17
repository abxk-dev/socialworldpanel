// Public settings handler for `/api/public/settings`.
// Frontend mainly uses this for:
// - SEO meta tags (via SettingsProvider applyMeta)
// - Favicon + logo URLs (Navbar/Footer)
// - Feature toggles for the homepage

const { getDb, ensureSrvDns } = require("../../db");

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function safeGetDb(timeoutMs = 5000) {
  try {
    // Ensure we apply the same DNS override logic as Mongo connections.
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

module.exports = async function publicSettings(req, res) {
  const localBypass =
    process.env.NODE_ENV !== "production" || process.env.LOCAL_BYPASS_AUTH === "1";
  const fallback = {
    panel_name: process.env.PANEL_NAME || "Social World Panel",
    favicon: null,
    favicon_updated_at: null,
    panel_logo: null,
    panel_logo_updated_at: null,
    panel_logo_light: null,
    panel_logo_light_updated_at: null,
    hero_image: null,
    hero_image_updated_at: null,
    hero_headline: process.env.HERO_HEADLINE || "",
    hero_description: process.env.HERO_DESCRIPTION || "",
    hero_glow_color: process.env.HERO_GLOW_COLOR || "#00d2ff",
    seo_meta: {
      title: process.env.SEO_TITLE || "Social World Panel",
      description: process.env.SEO_DESCRIPTION || "",
      keywords: process.env.SEO_KEYWORDS || "",
      og_image: process.env.SEO_OG_IMAGE || "",
    },
    seo_pages: {},
    custom_head_html: "",
    google_site_verification: "",
    bing_site_verification: "",
    registration_enabled: true,
    maintenance_mode: false,
    // Display & format
    currency_format: "1000.00",
    balance_format: "default",
    rates_rounding: "hundredth",
    new_order_search_field: "enabled",
    service_name_format: "ID - Name - Rate per 1000",
    // Homepage feature flags
    live_feed_enabled: true,
    live_feed_show_country: true,
    live_feed_show_toast: true,
    live_feed_speed_ms: 3000,
    free_trial_enabled: false,
    free_trial_label: "",
    free_trial_max_per_ip: safeNumber(process.env.FREE_TRIAL_MAX_PER_IP || 0),
    free_trial_quantity: safeNumber(process.env.FREE_TRIAL_QUANTITY || 0),
    free_trial_service_id: "",
    free_trial_show_on_homepage: true,
    free_trial_disclaimer: "",
    free_trial_button_text: "",
    free_trial_link_placeholder: "",
    free_trial_modal_title: "",
    menu: [],
    dashboard_menu: [],
    new_order_sidebar_note: "",
    new_order_sidebar_note_format: "html",
  };

  const db = await safeGetDb(Number(process.env.SWP_PUBLIC_SETTINGS_DB_TIMEOUT_MS || 5000));
  if (!db) {
    if (localBypass && globalThis.__swpLocalAdminSettings) {
      return res.json({ ...fallback, ...globalThis.__swpLocalAdminSettings });
    }
    return res.json(fallback);
  }

  const doc = await db
    .collection("admin_settings")
    .findOne({}, { sort: { updated_at: -1, _id: -1 } }) || {};

  // Some values may live in nested `exchange_rates`, `rates_last_updated`, etc.
  // Keep only keys the homepage + shared components read.
  return res.json({
    panel_name: doc.panel_name || fallback.panel_name,
    favicon: doc.favicon ?? fallback.favicon,
    favicon_updated_at: doc.favicon_updated_at ?? fallback.favicon_updated_at,
    panel_logo: doc.panel_logo ?? fallback.panel_logo,
    panel_logo_updated_at: doc.panel_logo_updated_at ?? fallback.panel_logo_updated_at,
    panel_logo_light: doc.panel_logo_light ?? fallback.panel_logo_light,
    panel_logo_light_updated_at: doc.panel_logo_light_updated_at ?? fallback.panel_logo_light_updated_at,

    hero_image: doc.hero_image ?? fallback.hero_image,
    hero_image_updated_at: doc.hero_image_updated_at ?? fallback.hero_image_updated_at,
    hero_headline: doc.hero_headline ?? fallback.hero_headline,
    hero_description: doc.hero_description ?? fallback.hero_description,
    hero_glow_color: doc.hero_glow_color ?? fallback.hero_glow_color,

    seo_meta: doc.seo_meta || fallback.seo_meta,
    seo_pages: doc.seo_pages || fallback.seo_pages,
    custom_head_html: doc.custom_head_html ?? fallback.custom_head_html,
    google_site_verification: doc.google_site_verification ?? fallback.google_site_verification,
    bing_site_verification: doc.bing_site_verification ?? fallback.bing_site_verification,

    registration_enabled: doc.registration_enabled ?? fallback.registration_enabled,
    maintenance_mode: doc.maintenance_mode ?? fallback.maintenance_mode,
    // Display & format (used by user dashboard)
    currency_format: doc.currency_format ?? fallback.currency_format,
    balance_format: doc.balance_format ?? fallback.balance_format,
    rates_rounding: doc.rates_rounding ?? fallback.rates_rounding,
    new_order_search_field: doc.new_order_search_field ?? fallback.new_order_search_field,
    service_name_format: doc.service_name_format ?? fallback.service_name_format,

    live_feed_enabled: doc.live_feed_enabled ?? fallback.live_feed_enabled,
    live_feed_show_country: doc.live_feed_show_country ?? fallback.live_feed_show_country,
    live_feed_show_toast: doc.live_feed_show_toast ?? fallback.live_feed_show_toast,
    live_feed_speed_ms: doc.live_feed_speed_ms ?? fallback.live_feed_speed_ms,

    free_trial_enabled: doc.free_trial_enabled ?? fallback.free_trial_enabled,
    free_trial_label: doc.free_trial_label ?? fallback.free_trial_label,
    free_trial_max_per_ip: doc.free_trial_max_per_ip ?? fallback.free_trial_max_per_ip,
    free_trial_quantity: doc.free_trial_quantity ?? fallback.free_trial_quantity,
    free_trial_service_id: doc.free_trial_service_id ?? fallback.free_trial_service_id,
    free_trial_show_on_homepage: doc.free_trial_show_on_homepage ?? fallback.free_trial_show_on_homepage,
    free_trial_disclaimer: doc.free_trial_disclaimer ?? fallback.free_trial_disclaimer,
    free_trial_button_text: doc.free_trial_button_text ?? fallback.free_trial_button_text,
    free_trial_link_placeholder: doc.free_trial_link_placeholder ?? fallback.free_trial_link_placeholder,
    free_trial_modal_title: doc.free_trial_modal_title ?? fallback.free_trial_modal_title,
    menu: Array.isArray(doc.menu) ? doc.menu : fallback.menu,
    dashboard_menu: Array.isArray(doc.dashboard_menu) ? doc.dashboard_menu : fallback.dashboard_menu,

    new_order_sidebar_note: doc.new_order_sidebar_note ?? fallback.new_order_sidebar_note,
    new_order_sidebar_note_format: doc.new_order_sidebar_note_format ?? fallback.new_order_sidebar_note_format,
  });
};

