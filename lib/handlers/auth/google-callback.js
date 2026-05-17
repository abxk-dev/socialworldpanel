const jwt = require("jsonwebtoken");
const axios = require("axios");
const crypto = require("crypto");
const { getDb } = require("../../db");
const {
  resolveGoogleRedirectUri,
  resolveFrontendOrigin,
} = require("../../googleOAuthEnv");
const {
  generateUniqueReferralCode,
  normalizeRefCode,
  findUserByReferralCode,
  canonicalReferrerCode,
} = require("../../referralCode");
const { getClientIp } = require("../../clientIp");
const { validateReferralForNewUser } = require("../../referralSignupSecurity");

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function signAccessToken({ userId, email, role }) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = "7d";
  return jwt.sign(
    {
      sub: userId,
      user_id: userId,
      email,
      role: role || "user",
      token_type: "bearer",
    },
    secret,
    { algorithm: "HS256", expiresIn }
  );
}

function redirectLogin(res, frontend, errorCode) {
  return res.redirect(302, `${frontend}/login?error=${encodeURIComponent(errorCode)}`);
}

function isSuspended(u) {
  return (
    u?.is_active === false ||
    u?.suspended === true ||
    u?.is_suspended === true ||
    u?.status === "suspended"
  );
}

function isBanned(u) {
  return u?.is_banned === true;
}

module.exports = async function googleCallback(req, res) {
  const frontend = resolveFrontendOrigin(req);

  if (req.query.error) {
    return redirectLogin(res, frontend, "google_denied");
  }

  const code = req.query.code;
  const state = req.query.state;
  if (!code || !state) {
    return redirectLogin(res, frontend, "missing_code");
  }

  let oauthState;
  try {
    oauthState = jwt.verify(state, process.env.JWT_SECRET);
  } catch {
    return redirectLogin(res, frontend, "invalid_state");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectLogin(res, frontend, "google_not_configured");
  }

  const redirectUri = resolveGoogleRedirectUri(req);

  let accessToken;
  try {
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 20000 }
    );
    accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      return redirectLogin(res, frontend, "token_exchange_failed");
    }
  } catch (err) {
    console.error("[google-callback] token exchange:", err.response?.data || err.message);
    return redirectLogin(res, frontend, "token_exchange_failed");
  }

  let g;
  try {
    const userinfoRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 15000,
    });
    g = userinfoRes.data || {};
  } catch (err) {
    console.error("[google-callback] userinfo:", err.response?.data || err.message);
    return redirectLogin(res, frontend, "server_error");
  }

  const email = String(g.email || "")
    .trim()
    .toLowerCase();
  if (!email) {
    return redirectLogin(res, frontend, "no_email");
  }
  const verified = g.email_verified === true || g.email_verified === "true";
  if (!verified) {
    return redirectLogin(res, frontend, "no_email");
  }

  const db = await getDb();
  if (!db) {
    return redirectLogin(res, frontend, "db_unavailable");
  }

  const emailRe = new RegExp(`^${escapeRegex(email)}$`, "i");
  let user = await db.collection("users").findOne({
    $or: [
      { email: emailRe },
      { user_email: emailRe },
      { google_id: g.sub },
      { google_sub: g.sub },
    ],
  });

  const refFromOAuth = normalizeRefCode(oauthState?.ref);

  if (!user) {
    const settings = await db
      .collection("admin_settings")
      .findOne({}, { sort: { updated_at: -1, _id: -1 } });
    if (settings && settings.registration_enabled === false) {
      return redirectLogin(res, frontend, "registration_disabled");
    }

    let userId;
    try {
      const { allocateNextNumericUserId } = require("../../allocateUserId");
      userId = await allocateNextNumericUserId(db);
    } catch (e) {
      console.error("[google-callback] allocate user_id:", e.message);
      return redirectLogin(res, frontend, "server_error");
    }
    let baseUsername = String(email.split("@")[0] || "user")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 40) || "user";
    let username = baseUsername;
    for (let n = 0; n < 50; n++) {
      const taken = await db.collection("users").findOne({
        username: new RegExp(`^${escapeRegex(username)}$`, "i"),
      });
      if (!taken) break;
      username = `${baseUsername}${n + 1}`;
    }

    let referred_by = null;
    let referralFraudFlagAfterInsert = false;
    if (refFromOAuth) {
      const refUser = await findUserByReferralCode(db, refFromOAuth);
      if (refUser && refUser.user_id !== userId) {
        const intended = canonicalReferrerCode(refUser) || refFromOAuth;
        const sec = await validateReferralForNewUser(db, {
          clientIp: getClientIp(req),
          referrer: refUser,
          refereeUserId: userId,
          refereeEmail: email,
          strictBlockSameIp: false,
          intendedReferredBy: intended,
        });
        if (sec.ok) {
          referred_by = sec.referred_by;
          referralFraudFlagAfterInsert = !!sec.flagReferralFraud;
        }
      }
    }

    const referral_code = await generateUniqueReferralCode(db);

    const doc = {
      user_id: userId,
      name: String(g.name || "").trim() || username,
      email,
      username,
      google_id: g.sub,
      google_sub: g.sub,
      picture: g.picture || null,
      role: "user",
      is_active: true,
      balance: Number(settings?.free_balance_new_users) || 0,
      referral_code,
      referred_by,
      created_at: new Date(),
    };

    try {
      await db.collection("users").insertOne(doc);
      user = doc;
      if (referralFraudFlagAfterInsert && user.user_id) {
        const ts = new Date().toISOString();
        await db.collection("users").updateOne(
          { user_id: String(user.user_id) },
          {
            $set: {
              is_flagged: true,
              referral_fraud_flag: true,
              flag_reason: "Referral fraud risk — same IP as referrer (Google signup)",
              flag_date: ts,
            },
          }
        );
      }
    } catch (e) {
      if (e && e.code === 11000) {
        user = await db.collection("users").findOne({ email: emailRe });
      } else {
        console.error("[google-callback] insert user:", e.message);
        return redirectLogin(res, frontend, "server_error");
      }
    }
  } else {
    if (isBanned(user)) {
      return redirectLogin(res, frontend, "account_suspended");
    }
    if (isSuspended(user)) {
      return redirectLogin(res, frontend, "account_suspended");
    }
    if (!user.referral_code) {
      try {
        const code = await generateUniqueReferralCode(db);
        await db.collection("users").updateOne({ _id: user._id }, { $set: { referral_code: code } });
        user = { ...user, referral_code: code };
      } catch (e) {
        console.error("[google-callback] referral_code:", e.message);
      }
    }
    const updates = {};
    if (g.sub && !user.google_id && !user.google_sub) {
      updates.google_id = g.sub;
      updates.google_sub = g.sub;
    }
    if (g.picture && !user.picture) updates.picture = g.picture;
    if (Object.keys(updates).length) {
      try {
        await db.collection("users").updateOne({ _id: user._id }, { $set: updates });
        user = { ...user, ...updates };
      } catch (e) {
        console.error("[google-callback] link google:", e.message);
      }
    }
  }

  if (!user || isSuspended(user)) {
    return redirectLogin(res, frontend, "account_suspended");
  }

  const userId =
    user.user_id ||
    user.userId ||
    (typeof user._id?.toString === "function" ? user._id.toString() : user._id);
  const token = signAccessToken({
    userId,
    email: user.email || email,
    role: user.role || "user",
  });

  try {
    const { recordLoginIpAndSpamCheck } = require("../../loginIpTracking");
    await recordLoginIpAndSpamCheck(db, req, {
      userId: String(userId),
      email: user.email || email,
    });
  } catch (ipErr) {
    console.error("[google-callback] IP tracking:", ipErr.message);
  }

  const hash = `token=${encodeURIComponent(token)}`;
  return res.redirect(302, `${frontend}/auth/callback#${hash}`);
};
