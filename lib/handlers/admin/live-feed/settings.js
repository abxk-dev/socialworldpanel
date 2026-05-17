const { getDb } = require("../../_db");

function clampSpeed(ms) {
  const n = parseInt(ms, 10);
  if (!Number.isFinite(n)) return 3000;
  return Math.min(60000, Math.max(1000, n));
}

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    if (req.method === "GET") {
      const doc =
        (await db
          .collection("admin_settings")
          .findOne({}, { sort: { updated_at: -1, _id: -1 }, projection: { _id: 0 } })
          .catch(() => null)) || {};

      return res.json({
        live_feed_enabled: doc.live_feed_enabled !== false,
        live_feed_show_country: doc.live_feed_show_country !== false,
        live_feed_speed_ms: clampSpeed(doc.live_feed_speed_ms ?? 3000),
        live_feed_show_toast: doc.live_feed_show_toast !== false,
      });
    }

    if (req.method === "POST") {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const $set = {
        live_feed_enabled: body.enabled !== false,
        live_feed_show_country: body.show_country !== false,
        live_feed_speed_ms: clampSpeed(body.speed_ms ?? 3000),
        live_feed_show_toast: body.show_toast !== false,
        updated_at: new Date().toISOString(),
      };

      await db.collection("admin_settings").updateOne(
        {},
        { $set: $set, $setOnInsert: { panel_name: "Social World Panel" } },
        { upsert: true }
      );

      return res.json({ ok: true, success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
