import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a unique 3–4 digit display number for a service_id (deterministic).
 * Same service_id always gets the same number everywhere in the app.
 * Range: 100–9999 (3 or 4 digits).
 */
export function getServiceDisplayNumber(serviceId) {
  if (serviceId == null || serviceId === "") return null;
  const s = String(serviceId);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h = ((h << 5) - h) + c;
    h = h | 0;
  }
  return 100 + (Math.abs(h) % 9900); // 100–9999
}

export function getServiceIdBadge(service) {
  if (!service) return "";
  const pidRaw =
    service.provider_service_id ??
    service.api_service_id ??
    service.api_service ??
    service.smm_service_id ??
    null;
  const pid = pidRaw != null ? String(pidRaw).trim() : "";
  if (pid && /^\d+$/.test(pid)) return pid;

  const sidRaw = service.service_id ?? service.id ?? service._id ?? "";
  const sid = String(sidRaw).trim();
  if (sid && /^\d+$/.test(sid)) return sid;
  // Fall back to raw ids without hashing to avoid confusion
  return pid || sid;
}

/**
 * Format raw category/service names for display: replace underscores with spaces,
 * trim leading/trailing junk, and title-case words. Keeps emojis.
 */
/** Admin-entered service id: trim and strip leading # */
export function normalizeAdminServiceId(raw) {
  if (raw == null || raw === "") return "";
  return String(raw).trim().replace(/^#/, "");
}

/** Comma/space/semicolon/| separated service ids from admin settings */
export function parseAdminServiceIdList(raw) {
  if (raw == null || String(raw).trim() === "") return [];
  return String(raw)
    .split(/[\s,;|]+/)
    .map((s) => normalizeAdminServiceId(s))
    .filter(Boolean);
}

/**
 * Spin free views UI: only show bar for services explicitly listed in admin settings.
 * Empty list → do not show the box for any service.
 */
export function spinFreeViewsAllowedForService(settingsSpinRaw, serviceId) {
  const ids = parseAdminServiceIdList(settingsSpinRaw);
  if (ids.length === 0) return false;
  const key = String(serviceId ?? "").trim();
  const norm = normalizeAdminServiceId(key);
  const n = Number(norm);
  return ids.some((id) => {
    const a = String(id);
    const an = normalizeAdminServiceId(a);
    return (
      a === key ||
      an === norm ||
      (Number.isFinite(n) && Number(a) === n)
    );
  });
}

/**
 * Compact order id for tables (Admin, Order History, Dashboard).
 * New panel orders use a long numeric id (`Date.now() * 1000` + random); this shows the
 * same 7-digit tail as the admin orders list. Non-numeric ids are returned as-is.
 * Use the raw `order_id` in tooltips, API calls, and exports.
 */
export function displayOrderId(orderId) {
  if (orderId == null) return "—";
  const raw = String(orderId).trim();
  if (!raw) return "—";
  const digitsOnly = raw.replace(/\D/g, "");
  if (!digitsOnly) return raw;
  if (digitsOnly.length >= 7) return digitsOnly.slice(-7);
  return digitsOnly.padStart(7, "0");
}

export function formatDisplayName(str) {
  if (str == null || str === "") return "";
  let s = String(str)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s_\-\[\]()]+|[\s_\-\[\]()]+$/g, "");
  if (!s) return str;
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const PLATFORM_LABELS = [
  { k: "instagram", l: "Instagram" },
  { k: "youtube", l: "YouTube" },
  { k: "tiktok", l: "TikTok" },
  { k: "twitter", l: "Twitter" },
  { k: "facebook", l: "Facebook" },
  { k: "telegram", l: "Telegram" },
  { k: "linkedin", l: "LinkedIn" },
  { k: "spotify", l: "Spotify" },
];

/** True if string looks like an opaque ID (e.g. Mmq6pri61lq7) */
export function looksLikeId(str) {
  if (str == null || String(str).trim() === "") return false;
  const s = String(str).trim();
  return /^[a-z0-9]{10,}$/i.test(s) || s.length > 12;
}

/**
 * Derive a human-readable platform/category label. Use when category name or category_id
 * is an opaque ID (e.g. Mmq6pri61lq7) so the UI can show "Instagram", "YouTube", etc.
 * Checks name first, then infers from category_id substrings (instagram, youtube, ...).
 */
export function derivePlatformLabel(category) {
  if (!category) return null;
  const raw = category.name || formatDisplayName(category.category_id || "");
  if (raw && !looksLikeId(raw)) {
    const firstWord = (raw.split(/\s+/)[0] || raw).toLowerCase();
    const match = PLATFORM_LABELS.find(({ k }) => firstWord.startsWith(k));
    if (match) return match.l;
    return formatDisplayName(raw);
  }
  const cid = String(category.category_id || "").toLowerCase();
  const match = PLATFORM_LABELS.find(({ k }) => cid.includes(k));
  return match ? match.l : null;
}
