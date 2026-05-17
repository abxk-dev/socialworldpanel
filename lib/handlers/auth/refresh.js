const jwt = require("jsonwebtoken");
const { getDb } = require("../../db");
const { parseAuth } = require("../_auth");

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
  const { password_hash, passwordHash, password, ...rest } = u;
  return rest;
}

async function refresh(req, res) {
  const claims = parseAuth(req);
  if (!claims) return res.status(401).json({ detail: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.status(503).json({ detail: "Database unavailable" });

  const user = await db.collection("users").findOne({ user_id: claims.sub || claims.user_id });
  if (!user) return res.status(401).json({ detail: "Unauthorized" });

  const userId = user.user_id || user.userId || user._id?.toString?.() || claims.sub;
  const token = signAccessToken({ userId, email: user.email, role: user.role });
  return res.json({ access_token: token, user: sanitizeUser(user) });
}

module.exports = refresh;

