const { getDb } = require('./_db');
const { parseAuth } = require('./_auth');

const DEFAULT_THEME = 'dark';
const ALLOWED = new Set(['dark', 'light']);

function normalizeTheme(value) {
  if (!value) return DEFAULT_THEME;
  const v = String(value);
  if (v === 'light' || v === 'day') return 'light';
  if (v === 'dark' || v === 'night' || v === 'midnight' || v === 'sunrise' || v === 'sunset' || v === 'ocean') return 'dark';
  return ALLOWED.has(v) ? v : DEFAULT_THEME;
}

async function requireMainAdmin(req, db) {
  const claims = parseAuth(req);
  if (!claims) return null;

  const localBypass =
    process.env.NODE_ENV !== "production" || process.env.LOCAL_BYPASS_AUTH === "1";
  if (localBypass) {
    const role = claims.role || "user";
    if (role === "main_admin" || role === "admin") {
      return { role: role || "main_admin" };
    }
    return null;
  }

  // Validate role from DB to avoid token mismatch
  if (!db) return null;
  const user = await db.collection('users').findOne(
    { user_id: claims.sub },
    { projection: { _id: 0, role: 1 } }
  );
  if (!user || user.role !== 'main_admin') return null;
  return user;
}

const getActiveTheme = async (req, res) => {
  try {
    const localBypass =
      process.env.NODE_ENV !== "production" || process.env.LOCAL_BYPASS_AUTH === "1";
    if (localBypass && globalThis.__swpLocalActiveTheme) {
      return res.json({ theme: normalizeTheme(globalThis.__swpLocalActiveTheme) });
    }

    const db = await getDb();
    const setting = await db.collection('site_settings').findOne({ key: 'active_theme' });
    res.json({ theme: normalizeTheme(setting?.value) });
  } catch (err) {
    res.json({ theme: DEFAULT_THEME });
  }
};

const updateTheme = async (req, res) => {
  try {
    const localBypass =
      process.env.NODE_ENV !== "production" || process.env.LOCAL_BYPASS_AUTH === "1";
    const db = await getDb();
    const claims = parseAuth(req);

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const theme = normalizeTheme(body.theme);

    if (!ALLOWED.has(theme)) {
      return res.status(400).json({ success: false, error: 'Invalid theme. Use dark or light' });
    }

    // Local-dev: trust JWT role + keep theme in memory.
    if (localBypass) {
      const role = claims?.role || "user";
      if (role === "main_admin" || role === "admin") {
        globalThis.__swpLocalActiveTheme = theme;
        return res.json({ success: true, theme });
      }
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const admin = await requireMainAdmin(req, db);
    if (!admin) return res.status(403).json({ success: false, error: "Forbidden" });

    await db.collection('site_settings').updateOne(
      { key: 'active_theme' },
      {
        $set: {
          key: 'active_theme',
          value: theme,
          updated_at: new Date(),
          updated_by: claims?.sub || null,
        },
      },
      { upsert: true }
    );

    return res.json({ success: true, theme });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getActiveTheme, updateTheme };

