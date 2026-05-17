/**
 * Shared OAuth URL resolution for Google sign-in.
 * Prefer explicit env vars over request headers (Vercel / proxies can vary).
 *
 * Env (any of):
 * - FRONTEND_URL / SITE_URL / PUBLIC_SITE_URL — site origin, e.g. https://socialworldpanel.com
 * - GOOGLE_REDIRECT_URI — full callback URL (must match Google Cloud Console exactly)
 */

function trimEnvValue(v) {
  if (v == null || v === "") return "";
  return String(v).trim().replace(/^["']|["']$/g, "");
}

function getConfiguredSiteOrigin() {
  const raw =
    trimEnvValue(process.env.FRONTEND_URL) ||
    trimEnvValue(process.env.SITE_URL) ||
    trimEnvValue(process.env.PUBLIC_SITE_URL) ||
    "";
  return raw.replace(/\/$/, "");
}

function resolveGoogleRedirectUri(req) {
  const explicit = trimEnvValue(process.env.GOOGLE_REDIRECT_URI);
  if (explicit) return explicit;

  const origin = getConfiguredSiteOrigin();
  if (origin) return `${origin}/api/auth/google/callback`;

  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https")
    .split(",")[0]
    .trim();
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}/api/auth/google/callback`;
}

function resolveFrontendOrigin(req) {
  const origin = getConfiguredSiteOrigin();
  if (origin) return origin;

  const callbackUrl = trimEnvValue(process.env.GOOGLE_REDIRECT_URI);
  if (callbackUrl) {
    try {
      const u = new URL(callbackUrl);
      return `${u.protocol}//${u.host}`;
    } catch (_) {}
  }

  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https")
    .split(",")[0]
    .trim();
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

module.exports = {
  resolveGoogleRedirectUri,
  resolveFrontendOrigin,
  getConfiguredSiteOrigin,
};
