const { getDb } = require("../../db");
const { parseAuth } = require("../_auth");
const { buildInvoicePdfBuffer } = require("../../invoiceService");
const gamification = require("../../gamificationService");

async function requireAdmin(req) {
  const db = await getDb();
  const claims = parseAuth(req);
  if (!claims) return { db, ok: false };
  const uid = claims.user_id || claims.sub;
  const u = await db.collection("users").findOne({ user_id: uid }, { projection: { role: 1 } });
  const role = u?.role || "user";
  if (!["admin", "main_admin"].includes(role)) return { db, ok: false };
  return { db, ok: true };
}

async function aiConversations(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const items = await db
    .collection("ai_order_conversations")
    .find({})
    .sort({ created_at: -1 })
    .limit(200)
    .toArray();
  const popular = await db
    .collection("ai_order_conversations")
    .aggregate([{ $group: { _id: "$message", c: { $sum: 1 } } }, { $sort: { c: -1 } }, { $limit: 20 }])
    .toArray();
  return res.json({ success: true, conversations: items, popular_queries: popular });
}

async function healthScoresAdmin(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const items = await db
    .collection("health_scores")
    .find({})
    .sort({ analyzed_at: -1 })
    .limit(200)
    .toArray();
  const byPlatform = await db
    .collection("health_scores")
    .aggregate([{ $group: { _id: "$platform", n: { $sum: 1 } } }])
    .toArray();
  return res.json({ success: true, analyses: items, by_platform: byPlatform });
}

async function dripCampaignsAdmin(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const all = await db.collection("drip_campaigns").find({}).limit(500).toArray();
  const stats = {
    total: all.length,
    active: all.filter((c) => c.status === "active").length,
    completed: all.filter((c) => c.status === "completed").length,
  };
  return res.json({ success: true, campaigns: all, stats });
}

async function resellerPanelsAdmin(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const panels = await db.collection("reseller_panels").find({}).limit(500).toArray();
  return res.json({ success: true, resellers: panels });
}

async function approveReseller(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  await db.collection("reseller_panels").updateOne(
    { $or: [{ reseller_id: id }, { user_id: id }] },
    { $set: { approved: true, updated_at: new Date().toISOString() } }
  );
  return res.json({ success: true });
}

async function suspendReseller(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  await db.collection("reseller_panels").updateOne(
    { $or: [{ reseller_id: id }, { user_id: id }] },
    { $set: { is_active: false, updated_at: new Date().toISOString() } }
  );
  return res.json({ success: true });
}

async function reorderAlertsAdmin(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const items = await db.collection("reorder_alerts").find({}).sort({ created_at: -1 }).limit(300).toArray();
  const byType = await db
    .collection("reorder_alerts")
    .aggregate([{ $group: { _id: "$alert_type", n: { $sum: 1 } } }])
    .toArray();
  return res.json({ success: true, alerts: items, by_type: byType });
}

async function gamificationAdminGet(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const xpConfig = await db.collection("gamification_levels").findOne({ _id: "xp_config" });
  return res.json({
    success: true,
    xp_actions: xpConfig?.actions || {},
    table: gamification.getLevelTable(),
  });
}

async function gamificationAdminPut(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  await db.collection("gamification_levels").updateOne(
    { _id: "xp_config" },
    { $set: { actions: req.body?.actions || {}, updated_at: new Date().toISOString() } },
    { upsert: true }
  );
  return res.json({ success: true });
}

async function gamificationLeaderboardAdmin(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const top = await db
    .collection("users")
    .find({})
    .sort({ gamification_xp: -1 })
    .limit(50)
    .project({ user_id: 1, username: 1, email: 1, gamification_xp: 1, gamification_level: 1 })
    .toArray();
  return res.json({ success: true, leaderboard: top });
}

async function gamificationAward(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const userId = String(req.body?.user_id || "");
  const amount = Number(req.body?.amount || 0);
  const reason = String(req.body?.reason || "admin_award");
  if (!userId || !amount) return res.status(400).json({ error: "user_id and amount required" });
  const r = await gamification.appendXpEvent(db, userId, amount, reason, { admin: true });
  return res.json({ success: true, result: r });
}

async function gamificationBadge(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const userId = String(req.body?.user_id || "");
  const badgeId = String(req.body?.badge_id || "");
  if (!userId || !badgeId) return res.status(400).json({ error: "user_id and badge_id required" });
  await gamification.ensureBadge(db, userId, badgeId);
  return res.json({ success: true });
}

async function collabListingsAdmin(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const items = await db.collection("collab_listings").find({}).sort({ created_at: -1 }).limit(300).toArray();
  const byNiche = await db
    .collection("collab_listings")
    .aggregate([{ $group: { _id: "$niche", n: { $sum: 1 } } }])
    .toArray();
  return res.json({ success: true, listings: items, by_niche: byNiche });
}

async function collabApprove(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  await db.collection("collab_listings").updateOne(
    { listing_id: id },
    { $set: { is_verified: true, updated_at: new Date().toISOString() } }
  );
  return res.json({ success: true });
}

async function collabRemove(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  await db.collection("collab_listings").updateOne(
    { listing_id: id },
    { $set: { is_active: false, updated_at: new Date().toISOString() } }
  );
  return res.json({ success: true });
}

async function invoicesAdmin(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const items = await db.collection("invoices").find({}).sort({ issued_date: -1 }).limit(500).toArray();
  const revenue = items.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  return res.json({ success: true, invoices: items, revenue_total: revenue });
}

async function invoiceAdminDownload(req, res) {
  const { db, ok } = await requireAdmin(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  const invoiceId = String(req.params.invoiceId || "");
  const inv = await db.collection("invoices").findOne({
    $or: [{ invoice_id: invoiceId }, { invoice_number: invoiceId }],
  });
  if (!inv) return res.status(404).json({ error: "Not found" });
  const pdf = await buildInvoicePdfBuffer(inv);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${inv.invoice_number}.pdf"`);
  return res.send(pdf);
}

module.exports = {
  aiConversations,
  healthScoresAdmin,
  dripCampaignsAdmin,
  resellerPanelsAdmin,
  approveReseller,
  suspendReseller,
  reorderAlertsAdmin,
  gamificationAdminGet,
  gamificationAdminPut,
  gamificationLeaderboardAdmin,
  gamificationAward,
  gamificationBadge,
  collabListingsAdmin,
  collabApprove,
  collabRemove,
  invoicesAdmin,
  invoiceAdminDownload,
};
