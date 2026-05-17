const { getDb } = require("../../db");
const { parseAuth } = require("../_auth");

function sanitizeUser(u) {
  if (!u || typeof u !== "object") return u;
  const { password_hash, passwordHash, password, ...rest } = u;
  return rest;
}

async function me(req, res) {
  const claims = parseAuth(req);
  if (!claims) return res.status(401).json({ detail: "Unauthorized" });

  const db = await getDb();
  const localBypass = process.env.NODE_ENV !== "production" || process.env.LOCAL_BYPASS_AUTH === "1";
  if (!db) {
    if (!localBypass) return res.status(503).json({ detail: "Database unavailable" });
    return res.json({
      user_id: claims.sub || claims.user_id,
      email: claims.email,
      role: claims.role || "user",
      is_active: true,
      name: (claims.email || "").split("@")[0],
    });
  }

  const user = await db.collection("users").findOne(
    { user_id: claims.sub || claims.user_id },
    { projection: { password_hash: 0 } }
  );

  if (!user) {
    if (!localBypass) return res.status(401).json({ detail: "Unauthorized" });
    return res.json({
      user_id: claims.sub || claims.user_id,
      email: claims.email,
      role: claims.role || "user",
      is_active: true,
      name: (claims.email || "").split("@")[0],
    });
  }

  if (user.is_banned === true) {
    return res.status(403).json({
      detail: "Your account has been suspended.",
      suspended: true,
      ban_reason: user.ban_reason || "Account suspended",
    });
  }

  const suspended =
    user.is_active === false ||
    user.suspended === true ||
    user.is_suspended === true;

  if (suspended) {
    return res.status(403).json({ detail: "Account suspended" });
  }

  return res.json(sanitizeUser(user));
}

module.exports = me;

