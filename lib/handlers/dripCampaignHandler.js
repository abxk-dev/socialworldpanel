const { randomUUID } = require("crypto");
const { getDb } = require("./_db");
const getUserId = require("../getUserId");

function parseHours(body) {
  const ph = body?.preferred_hours;
  if (Array.isArray(ph) && ph.length) return ph.map((h) => Math.min(23, Math.max(0, parseInt(h, 10) || 9)));
  const start = parseInt(body?.preferred_hour_start ?? 9, 10);
  const end = parseInt(body?.preferred_hour_end ?? 17, 10);
  const out = [];
  for (let h = start; h <= end; h++) out.push(h);
  return out.length ? out : [9, 10, 11, 12, 13, 14, 15, 16, 17];
}

async function createCampaign(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const body = req.body || {};
  const {
    service_id,
    link,
    total_quantity,
    duration_days,
    interval_hours,
    service_name: bodyServiceName,
  } = body;
  if (!service_id || !link || !total_quantity || !duration_days) {
    return res.status(400).json({ error: "service_id, link, total_quantity, duration_days required" });
  }

  const total = Math.max(1, parseInt(total_quantity, 10));
  const days = Math.min(90, Math.max(3, parseInt(duration_days, 10)));
  const daily_limit = Math.max(1, Math.ceil(total / days));
  const hours = parseHours(body);
  const iv = Math.max(1, parseInt(interval_hours || 24, 10));

  const svc = await db.collection("services").findOne({
    $or: [{ service_id: String(service_id) }, { service_id: Number(service_id) }],
  });
  const service_name = bodyServiceName || svc?.name || svc?.service_name || String(service_id);

  const start_date = new Date().toISOString();
  const end = new Date();
  end.setDate(end.getDate() + days);
  const campaign_id = randomUUID();

  const doc = {
    campaign_id,
    user_id: userId,
    service_id: String(service_id),
    service_name,
    total_quantity: total,
    delivered_quantity: 0,
    daily_limit,
    interval_hours: iv,
    preferred_hours: hours,
    start_date,
    end_date: end.toISOString(),
    status: "active",
    link: String(link).trim(),
    orders_placed: [],
    created_at: start_date,
    updated_at: start_date,
  };

  await db.collection("drip_campaigns").insertOne(doc);
  return res.json({ success: true, campaign: doc });
}

async function listCampaigns(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const items = await db
    .collection("drip_campaigns")
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray();
  return res.json({ success: true, campaigns: items });
}

async function pauseCampaign(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  const r = await db.collection("drip_campaigns").updateOne(
    { campaign_id: id, user_id: userId },
    { $set: { status: "paused", updated_at: new Date().toISOString() } }
  );
  if (!r.matchedCount) return res.status(404).json({ error: "Not found" });
  return res.json({ success: true });
}

async function resumeCampaign(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  const r = await db.collection("drip_campaigns").updateOne(
    { campaign_id: id, user_id: userId, status: "paused" },
    { $set: { status: "active", updated_at: new Date().toISOString() } }
  );
  if (!r.matchedCount) return res.status(404).json({ error: "Not found" });
  return res.json({ success: true });
}

async function deleteCampaign(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  const r = await db.collection("drip_campaigns").updateOne(
    { campaign_id: id, user_id: userId },
    { $set: { status: "cancelled", updated_at: new Date().toISOString() } }
  );
  if (!r.matchedCount) return res.status(404).json({ error: "Not found" });
  return res.json({ success: true });
}

async function campaignStats(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  const c = await db.collection("drip_campaigns").findOne({ campaign_id: id, user_id: userId });
  if (!c) return res.status(404).json({ error: "Not found" });
  const orders = await db
    .collection("drip_campaign_orders")
    .find({ campaign_id: id })
    .sort({ created_at: -1 })
    .toArray();
  return res.json({
    success: true,
    campaign: c,
    chunk_orders: orders,
    total_chunks: orders.length,
    total_spent: orders.reduce((s, o) => s + Number(o.charge || 0), 0),
  });
}

module.exports = {
  createCampaign,
  listCampaigns,
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
  campaignStats,
};
