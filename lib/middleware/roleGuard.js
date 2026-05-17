const jwt = require("jsonwebtoken");

function roleGuard(allowedRoles = []) {
  const allowedList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const allowed = allowedList
    .map((r) => String(r || "").trim().toLowerCase())
    .filter(Boolean);

  return (req, res, next) => {
    try {
      // Allow local dev to browse admin UI without real auth enforcement.
      const localBypass =
        process.env.NODE_ENV !== "production" ||
        process.env.LOCAL_BYPASS_AUTH === "1";
      if (localBypass) return next();

      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ error: "Unauthorized" });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const rawRole = decoded?.role ?? decoded?.user_role ?? decoded?.userRole ?? decoded?.user?.role ?? "user";
      const role = String(rawRole || "user").trim().toLowerCase();
      req.user = req.user || decoded;

      if (allowed.includes(role)) return next();
      return res.status(403).json({ error: "Forbidden", role });
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

module.exports = { roleGuard };
