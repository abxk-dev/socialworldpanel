const { parseAuth } = require("./auth");

module.exports = function getUserId(req) {
  // Prefer already-decoded middleware claims.
  const direct =
    req?.user?.user_id ||
    req?.user?.sub ||
    req?.user?.id ||
    req?.user?._id?.toString?.() ||
    null;

  if (direct) return direct;

  // Fallback: decode JWT from Authorization header (some routes don't populate `req.user`).
  const claims = parseAuth(req);
  return (
    claims?.user_id ||
    claims?.sub ||
    claims?.id ||
    claims?._id?.toString?.() ||
    null
  );
};

