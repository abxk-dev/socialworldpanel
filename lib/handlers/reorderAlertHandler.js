const { getDb } = require("./_db");
const getUserId = require("../getUserId");
const { placeOrderForUser } = require("../orderPlacementInternal");
const { runPostOrderHooks } = require("../postOrderHooks");

async function listAlerts(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const items = await db
    .collection("reorder_alerts")
    .find({ user_id: userId, is_dismissed: { $ne: true } })
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();
  return res.json({ success: true, alerts: items });
}

async function dismissAlert(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  const r = await db.collection("reorder_alerts").updateOne(
    { alert_id: id, user_id: userId },
    { $set: { is_dismissed: true, updated_at: new Date().toISOString() } }
  );
  if (!r.matchedCount) return res.status(404).json({ error: "Not found" });
  return res.json({ success: true });
}

async function reorderFromAlert(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  const alert = await db.collection("reorder_alerts").findOne({ alert_id: id, user_id: userId });
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  const orig = await db.collection("orders").findOne({ order_id: alert.order_id, user_id: userId });
  if (!orig) return res.status(404).json({ error: "Original order not found" });
  const qty = Math.max(1, parseInt(alert.suggested_quantity || orig.quantity, 10));
  const placed = await placeOrderForUser(db, userId, {
    service_id: orig.service_id,
    quantity: qty,
    link: orig.link,
  });
  if (!placed.ok) {
    return res.status(placed.status || 400).json({ error: placed.error });
  }
  await runPostOrderHooks(db, userId, placed.order, placed.user, placed.service);
  await db.collection("reorder_alerts").updateOne(
    { alert_id: id },
    { $set: { is_dismissed: true, reordered_order_id: placed.order_id } }
  );
  return res.json({ success: true, order: placed.shaped });
}

async function getSettings(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const s = await db.collection("alert_settings").findOne({ user_id: userId });
  return res.json({
    success: true,
    settings: {
      remind_7: s?.remind_7 !== false,
      remind_30: s?.remind_30 !== false,
      remind_14: s?.remind_14 !== false,
      drop_detection: s?.drop_detection !== false,
      milestone: s?.milestone !== false,
      email: !!s?.email,
    },
  });
}

async function putSettings(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const b = req.body || {};
  const doc = {
    user_id: userId,
    remind_7: b.remind_7 !== false,
    remind_14: b.remind_14 !== false,
    remind_30: b.remind_30 !== false,
    drop_detection: b.drop_detection !== false,
    milestone: b.milestone !== false,
    email: !!b.email,
    updated_at: new Date().toISOString(),
  };
  await db.collection("alert_settings").updateOne({ user_id: userId }, { $set: doc }, { upsert: true });
  return res.json({ success: true, settings: doc });
}

async function unreadCount(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const n = await db.collection("reorder_alerts").countDocuments({
    user_id: userId,
    is_dismissed: { $ne: true },
    is_read: false,
  });
  return res.json({ success: true, count: n });
}

module.exports = {
  listAlerts,
  dismissAlert,
  reorderFromAlert,
  getSettings,
  putSettings,
  unreadCount,
};
