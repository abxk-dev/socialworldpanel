const { randomUUID } = require("crypto");
const { getDb } = require("./_db");
const getUserId = require("../getUserId");

async function requireUser(db, userId) {
  return db.collection("users").findOne({ user_id: userId });
}

async function setup(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const u = await requireUser(db, userId);
  if (!u) return res.status(404).json({ error: "User not found" });

  const body = req.body || {};
  const reseller_id = randomUUID();
  const now = new Date().toISOString();
  const doc = {
    reseller_id,
    user_id: userId,
    panel_name: String(body.panel_name || "My Panel").slice(0, 80),
    panel_subdomain: String(body.panel_subdomain || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 40),
    custom_domain: body.custom_domain || "",
    logo_url: body.logo_url || "",
    primary_color: body.primary_color || "#00d2ff",
    secondary_color: body.secondary_color || "#7b2cbf",
    welcome_message: body.welcome_message || "",
    support_email: body.support_email || u.email || "",
    is_active: true,
    approved: false,
    created_at: now,
    total_clients: 0,
    total_revenue: 0,
    markup_type: body.markup_type === "fixed" ? "fixed" : "percentage",
    default_markup_percent: Math.min(200, Math.max(0, Number(body.default_markup_percent) || 30)),
  };

  const existing = await db.collection("reseller_panels").findOne({ user_id: userId });
  if (existing) {
    await db.collection("reseller_panels").updateOne(
      { user_id: userId },
      {
        $set: {
          panel_name: doc.panel_name,
          panel_subdomain: doc.panel_subdomain,
          custom_domain: doc.custom_domain,
          logo_url: doc.logo_url,
          primary_color: doc.primary_color,
          secondary_color: doc.secondary_color,
          welcome_message: doc.welcome_message,
          support_email: doc.support_email,
          markup_type: doc.markup_type,
          default_markup_percent: doc.default_markup_percent,
          updated_at: now,
        },
      }
    );
    const updated = await db.collection("reseller_panels").findOne({ user_id: userId });
    return res.json({ success: true, panel: updated });
  }

  await db.collection("reseller_panels").insertOne(doc);
  return res.json({ success: true, panel: doc });
}

async function getPanelSettings(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const panel = await db.collection("reseller_panels").findOne({ user_id: userId });
  return res.json({ success: true, panel: panel || null });
}

async function putPanelSettings(req, res) {
  return setup(req, res);
}

async function listClients(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const items = await db
    .collection("reseller_clients")
    .find({ reseller_user_id: userId })
    .sort({ created_at: -1 })
    .limit(200)
    .toArray();
  return res.json({ success: true, clients: items });
}

async function profits(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const panel = await db.collection("reseller_panels").findOne({ user_id: userId });
  const agg = await db
    .collection("reseller_clients")
    .aggregate([
      { $match: { reseller_user_id: userId } },
      { $group: { _id: null, profit: { $sum: { $toDouble: "$total_profit" } } } },
    ])
    .toArray();
  return res.json({
    success: true,
    total_profit: Number(agg[0]?.profit || 0),
    panel_revenue: Number(panel?.total_revenue || 0),
    by_service: [],
  });
}

async function getMarkups(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const rows = await db
    .collection("reseller_markup_prices")
    .find({ user_id: userId })
    .limit(500)
    .toArray();
  return res.json({ success: true, markups: rows });
}

async function putMarkups(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const list = Array.isArray(req.body?.markups) ? req.body.markups : [];
  for (const m of list.slice(0, 200)) {
    const sid = String(m.service_id || "");
    if (!sid) continue;
    await db.collection("reseller_markup_prices").updateOne(
      { user_id: userId, service_id: sid },
      {
        $set: {
          user_id: userId,
          service_id: sid,
          markup_percent: Number(m.markup_percent) || 0,
          updated_at: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  }
  return res.json({ success: true });
}

module.exports = {
  setup,
  getPanelSettings,
  putPanelSettings,
  listClients,
  profits,
  getMarkups,
  putMarkups,
};
