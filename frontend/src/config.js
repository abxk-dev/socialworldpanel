const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

function computeApi() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local");

    if (isLocal) {
      return "http://localhost:4000/api";
    }
    // Production: always use same origin + /api so requests never go to /dashboard/api
    return `${window.location.origin}/api`;
  }

  if (BACKEND_URL) {
    return BACKEND_URL.endsWith("/api")
      ? BACKEND_URL
      : `${BACKEND_URL}/api`;
  }

  return "/api";
}

export const API = computeApi();

/** Base URL for assets (logo, favicon). Must match API server so image requests succeed. */
function computeAssetBase() {
  if (typeof window === "undefined") return BACKEND_URL || "";
  if (BACKEND_URL) return BACKEND_URL.endsWith("/api") ? BACKEND_URL.slice(0, -4) : BACKEND_URL;
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
  if (isLocal) return "http://localhost:4000";
  return window.location.origin;
}
export const ASSET_BASE = computeAssetBase();

/** Build asset URL with cache-busting for logo/favicon updates. Use public uploads path so <img> works without auth. */
export function assetUrl(path, updatedAt) {
  if (!path) return "";
  let p = path;
  if (!p.startsWith("http") && typeof p === "string" && p.includes("/admin/uploads/")) {
    p = p.replace("/api/admin/uploads/", "/api/public/uploads/");
  }
  const base = ASSET_BASE || "";
  const url = p.startsWith("http") ? p : base + (p.startsWith("/") ? p : "/" + p);
  const sep = url.includes("?") ? "&" : "?";
  return url + (updatedAt ? `${sep}v=${updatedAt}` : `${sep}v=${Date.now()}`);
}

export { BACKEND_URL };