const { getDb } = require("../_db");
const { parseAuth } = require("../_auth");

async function requireAdmin(req, db) {
  const claims = parseAuth(req);
  if (!claims) return null;
  const user = await db.collection("users").findOne({ user_id: claims.sub }, { projection: { _id: 0 } });
  const role = user?.role || "user";
  if (!user || !["admin", "main_admin"].includes(role)) return null;
  return user;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Method Not Allowed" });
  }
  const db = await getDb();
  const admin = await requireAdmin(req, db);
  if (!admin) {
    return res.status(401).json({ detail: "Unauthorized" });
  }
  try {
    const body = req.body || {};
    const base64 = body.base64 || body.file;
    const logoType = body.logo_type || body.logoType || body.target || "";
    const isLightLogo =
      logoType === "light" ||
      logoType === "white" ||
      logoType === "panel_logo_light" ||
      logoType === "logo_light";
    const uploadId = isLightLogo ? "logo_light" : "logo";
    const settingsField = isLightLogo ? "panel_logo_light" : "panel_logo";
    if (!base64 || typeof base64 !== "string") {
      return res.status(400).json({ detail: "base64 or file (data URL) required" });
    }
    let data = base64;
    let contentType = "image/png";
    if (base64.startsWith("data:")) {
      const base64Idx = base64.indexOf(";base64,");
      if (base64Idx !== -1) {
        contentType = base64.slice(5, base64.indexOf(";", 5));
        if (!contentType) contentType = "image/png";
        data = base64.slice(base64Idx + 8);
      }
    }
    if (!data || data.length < 10) {
      return res.status(400).json({ detail: "Invalid or empty image data" });
    }
    await db.collection("uploads").updateOne(
      { id: uploadId },
      { $set: { id: uploadId, data, contentType, updated_at: new Date().toISOString() } },
      { upsert: true }
    );
    const url = `/api/public/uploads/${uploadId}`;
    const ts = Date.now();
    await db.collection("admin_settings").updateOne(
      {},
      {
        $set: {
          [settingsField]: url,
          [`${settingsField}_updated_at`]: ts,
        },
      },
      { upsert: true }
    );
    res.status(200).json({ url, [`${settingsField}_updated_at`]: ts });
  } catch (e) {
    console.error("Upload logo error:", e);
    res.status(500).json({ detail: e.message || "Upload failed" });
  }
};
