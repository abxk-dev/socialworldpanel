const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { resolveGoogleRedirectUri } = require("../../googleOAuthEnv");
const { normalizeRefCode } = require("../../referralCode");

/**
 * Start Google OAuth2 (Authorization Code flow).
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET
 * Optional: GOOGLE_REDIRECT_URI, FRONTEND_URL, SITE_URL (see lib/googleOAuthEnv.js)
 */
module.exports = async function googleAuth(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(503).json({
      detail:
        "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment.",
      error: "google_not_configured",
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(503).json({ detail: "Server misconfiguration (JWT_SECRET missing)." });
  }

  const ref = normalizeRefCode(req.query?.ref);
  const statePayload = {
    typ: "google_oauth",
    rnd: crypto.randomBytes(16).toString("hex"),
  };
  if (ref) statePayload.ref = ref;

  const state = jwt.sign(statePayload, secret, { expiresIn: "10m" });

  const redirectUri = resolveGoogleRedirectUri(req);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  return res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};
