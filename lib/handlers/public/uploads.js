/** GET /api/public/uploads/:id — serve logo, favicon, hero without auth so <img> tags work. */
const { getDb } = require("../_db");

const ALLOWED_IDS = ["logo", "logo_light", "favicon", "hero"];

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ detail: "Method Not Allowed" });
  }
  const id = req.params?.id || (req.url || "").split("?")[0].split("/").filter(Boolean).pop();
  if (!id || !ALLOWED_IDS.includes(id)) {
    return res.status(404).json({ detail: "Not Found" });
  }
  try {
    const db = await getDb();
    if (!db) {
      return res.status(404).json({ detail: "Not Found" });
    }
    const doc = await db.collection("uploads").findOne({ id });
    if (!doc || !doc.data) {
      return res.status(404).json({ detail: "Not Found" });
    }
    const buf = Buffer.from(doc.data, "base64");
    res.setHeader("Content-Type", doc.contentType || "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, must-revalidate");
    res.end(buf);
  } catch (e) {
    console.error("Public uploads serve error:", e.message, req.params?.id);
    if (!res.headersSent) res.status(404).json({ detail: "Not Found" });
  }
};
