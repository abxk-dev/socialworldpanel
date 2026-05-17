const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getDb } = require("../../db");
const { recordLoginIpAndSpamCheck } = require("../../loginIpTracking");

function getUserId(u) {
  return (
    u?.user_id ||
    u?.userId ||
    u?.id ||
    (typeof u?._id?.toString === "function" ? u._id.toString() : u?._id) ||
    u?.email
  );
}

function getUserPasswordHash(u) {
  // Support different possible field names across snapshots.
  const candidates = ["password_hash", "passwordHash", "password", "password_hash_bcrypt"];
  for (const k of candidates) {
    if (typeof u?.[k] === "string" && u[k].length >= 20) return u[k];
  }
  return null;
}

function isSuspended(u) {
  return (
    u?.is_active === false ||
    u?.suspended === true ||
    u?.is_suspended === true ||
    u?.status === "suspended"
  );
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

function sanitizeUser(u) {
  if (!u || typeof u !== "object") return u;
  // Return a safe subset; frontend mainly needs role + identifiers.
  const {
    password_hash,
    passwordHash,
    password,
    ...rest
  } = u;
  return {
    ...rest,
    user_id: rest.user_id || rest.userId || getUserId(rest),
    email: rest.email,
    role: rest.role || "user",
  };
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function login(req, res) {
  const db = await getDb();
  const localBypass = process.env.LOCAL_BYPASS_AUTH === "1";
  if (!db) {
    if (!localBypass) return res.status(503).json({ detail: "Database unavailable" });

    const body = req?.body && typeof req.body === "object" ? req.body : {};
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ detail: "Email and password are required" });

    // Local-dev fallback when Mongo isn't reachable.
    const userId = `stub_${Buffer.from(email).toString("base64").replace(/=+/g, "")}`;
    const token = signAccessToken({ userId, email, role: "main_admin" });
    return res.json({
      access_token: token,
      user: sanitizeUser({
        user_id: userId,
        email,
        role: "main_admin",
        is_active: true,
        name: email.split("@")[0],
      }),
    });
  }

  const body = req?.body && typeof req.body === "object" ? req.body : {};
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!email || !password) {
    return res.status(400).json({ detail: "Email and password are required" });
  }

  // Email field may vary by snapshot and may have original casing.
  // Use case-insensitive exact match across common keys.
  const emailRe = new RegExp(`^${escapeRegex(email)}$`, "i");
  const user = await db.collection("users").findOne({
    $or: [
      { email: emailRe },
      { user_email: emailRe },
      { userEmail: emailRe },
      { username: emailRe },
      // Support secondary logins stored as an array.
      { email_aliases: email },
      { email_aliases: emailRe },
    ],
  });
  if (!user) {
    if (!localBypass) return res.status(401).json({ detail: "Invalid credentials" });

    // Local-dev fallback: issue token even if user doc isn't present/mapped.
    const userId = `stub_${Buffer.from(email).toString("base64").replace(/=+/g, "")}`;
    const token = signAccessToken({ userId, email, role: "main_admin" });
    return res.json({
      access_token: token,
      user: sanitizeUser({
        user_id: userId,
        email,
        role: "main_admin",
        is_active: true,
        name: email.split("@")[0],
      }),
    });
  }
  if (isSuspended(user)) {
    return res.status(403).json({ detail: "Your account is suspended." });
  }

  const hash = getUserPasswordHash(user);
  if (!hash && !localBypass) {
    return res.status(401).json({ detail: "Invalid credentials" });
  }
  if (hash) {
    const ok = await bcrypt.compare(password, hash);
    if (!ok && !localBypass) {
      return res.status(401).json({ detail: "Invalid credentials" });
    }
  }

  const userId = String(getUserId(user));
  const token = signAccessToken({ userId, email, role: user.role });

  try {
    await recordLoginIpAndSpamCheck(db, req, {
      userId,
      email: user.email || email,
    });
  } catch (ipTrackErr) {
    console.error("IP tracking error:", ipTrackErr.message);
  }

  try {
    const gam = require("../../gamificationService");
    await gam.recordDailyLogin(db, userId);
  } catch (gErr) {
    console.warn("gamification login hook:", gErr?.message || gErr);
  }

  return res.json({
    access_token: token,
    user: sanitizeUser(user),
  });
}

module.exports = login;

