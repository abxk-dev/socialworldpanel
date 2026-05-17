// Minimal auth helper used by handlers for RBAC checks.
// Many handlers expect `parseAuth(req)` to return decoded JWT claims.

const jwt = require("jsonwebtoken");

function getBearerToken(req) {
  const header = req?.headers?.authorization || req?.headers?.Authorization;
  if (!header || typeof header !== "string") return null;
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

function normalizeClaims(payload) {
  if (!payload || typeof payload !== "object") return payload;
  // Some code expects `claims.sub` to contain the user's id.
  if (!payload.sub && payload.user_id) payload.sub = payload.user_id;
  // Normalize role so RBAC checks are consistent across legacy tokens.
  // Common variants we accept:
  // - role, user_role, userRole, user.role
  // - super_admin/superadmin/owner -> main_admin
  const rawRole =
    payload.role ??
    payload.user_role ??
    payload.userRole ??
    payload.user?.role ??
    null;
  if (rawRole != null) {
    const r = String(rawRole).trim().toLowerCase();
    const mapped =
      r === "super_admin" || r === "superadmin" || r === "owner"
        ? "main_admin"
        : r === "administrator"
          ? "admin"
          : r;
    payload.role = mapped;
  }
  return payload;
}

function parseAuth(req) {
  const token = getBearerToken(req);
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  try {
    if (secret) {
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
      return normalizeClaims(payload);
    }
    const payload = jwt.decode(token);
    return normalizeClaims(payload);
  } catch (e) {
    return null;
  }
}

module.exports = { parseAuth };
