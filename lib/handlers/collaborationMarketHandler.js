const { randomUUID } = require("crypto");
const { getDb } = require("./_db");
const getUserId = require("../getUserId");

async function canPostListing(db, userId) {
  const n = await db.collection("orders").countDocuments({ user_id: userId });
  return n >= 1;
}

async function listListings(req, res) {
  const db = await getDb();
  const q = req.query || {};
  const filter = { is_active: true };
  if (q.platform) filter.platform = String(q.platform);
  if (q.niche) filter.niche = String(q.niche);
  if (q.collab_type) filter.collab_type = String(q.collab_type);
  if (q.search) {
    filter.$or = [
      { title: { $regex: String(q.search), $options: "i" } },
      { description: { $regex: String(q.search), $options: "i" } },
    ];
  }
  const items = await db
    .collection("collab_listings")
    .find(filter)
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();
  return res.json({ success: true, listings: items });
}

async function createListing(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await canPostListing(db, userId))) {
    return res.status(403).json({ error: "Place at least one order before posting a listing." });
  }
  const u = await db.collection("users").findOne({ user_id: userId });
  const b = req.body || {};
  const listing_id = randomUUID();
  const now = new Date().toISOString();
  const doc = {
    listing_id,
    user_id: userId,
    username: u?.username || u?.email || userId,
    title: String(b.title || "").slice(0, 120),
    description: String(b.description || "").slice(0, 4000),
    collab_type: b.collab_type || "shoutout_exchange",
    platform: b.platform || "instagram",
    niche: b.niche || "general",
    my_follower_count: Number(b.my_follower_count) || 0,
    requirement_min_followers: Number(b.requirement_min_followers) || 0,
    compensation_type: b.compensation_type || "free_exchange",
    compensation_amount: Number(b.compensation_amount) || 0,
    slots_available: Math.max(1, parseInt(b.slots_available, 10) || 1),
    slots_filled: 0,
    profile_link: String(b.profile_link || ""),
    sample_content_url: String(b.sample_content_url || ""),
    tags: Array.isArray(b.tags) ? b.tags : [],
    is_active: true,
    is_verified: false,
    views_count: 0,
    applications_count: 0,
    created_at: now,
    expires_at: b.expires_at || new Date(Date.now() + 30 * 86400000).toISOString(),
  };
  if (!doc.title) return res.status(400).json({ error: "title required" });
  await db.collection("collab_listings").insertOne(doc);
  return res.json({ success: true, listing: doc });
}

async function getListing(req, res) {
  const db = await getDb();
  const id = String(req.params.id || "");
  const doc = await db.collection("collab_listings").findOne({ listing_id: id });
  if (!doc) return res.status(404).json({ error: "Not found" });
  await db.collection("collab_listings").updateOne({ listing_id: id }, { $inc: { views_count: 1 } });
  return res.json({ success: true, listing: doc });
}

async function updateListing(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  const cur = await db.collection("collab_listings").findOne({ listing_id: id, user_id: userId });
  if (!cur) return res.status(404).json({ error: "Not found" });
  const b = req.body || {};
  const $set = {
    updated_at: new Date().toISOString(),
  };
  for (const k of [
    "title",
    "description",
    "collab_type",
    "platform",
    "niche",
    "profile_link",
    "sample_content_url",
    "slots_available",
    "expires_at",
  ]) {
    if (b[k] != null) $set[k] = b[k];
  }
  await db.collection("collab_listings").updateOne({ listing_id: id }, { $set });
  return res.json({ success: true });
}

async function deleteListing(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  const r = await db.collection("collab_listings").deleteOne({ listing_id: id, user_id: userId });
  if (!r.deletedCount) return res.status(404).json({ error: "Not found" });
  return res.json({ success: true });
}

async function applyListing(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  const listing = await db.collection("collab_listings").findOne({ listing_id: id, is_active: true });
  if (!listing) return res.status(404).json({ error: "Not found" });
  const u = await db.collection("users").findOne({ user_id: userId });
  const b = req.body || {};
  const application_id = randomUUID();
  const now = new Date().toISOString();
  const app = {
    application_id,
    listing_id: id,
    applicant_user_id: userId,
    applicant_username: u?.username || u?.email || userId,
    applicant_profile_link: String(b.applicant_profile_link || ""),
    applicant_follower_count: Number(b.applicant_follower_count) || 0,
    message: String(b.message || "").slice(0, 2000),
    status: "pending",
    created_at: now,
  };
  await db.collection("collab_applications").insertOne(app);
  await db.collection("collab_listings").updateOne({ listing_id: id }, { $inc: { applications_count: 1 } });
  return res.json({ success: true, application: app });
}

async function myListings(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const items = await db
    .collection("collab_listings")
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray();
  return res.json({ success: true, listings: items });
}

async function myApplications(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const items = await db
    .collection("collab_applications")
    .find({ applicant_user_id: userId })
    .sort({ created_at: -1 })
    .toArray();
  return res.json({ success: true, applications: items });
}

async function acceptApplication(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const appId = String(req.params.id || "");
  const app = await db.collection("collab_applications").findOne({ application_id: appId });
  if (!app) return res.status(404).json({ error: "Not found" });
  const listing = await db.collection("collab_listings").findOne({ listing_id: app.listing_id, user_id: userId });
  if (!listing) return res.status(403).json({ error: "Forbidden" });
  await db.collection("collab_applications").updateOne(
    { application_id: appId },
    { $set: { status: "accepted", updated_at: new Date().toISOString() } }
  );
  await db.collection("collab_listings").updateOne({ listing_id: app.listing_id }, { $inc: { slots_filled: 1 } });
  return res.json({ success: true });
}

async function rejectApplication(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const appId = String(req.params.id || "");
  const app = await db.collection("collab_applications").findOne({ application_id: appId });
  if (!app) return res.status(404).json({ error: "Not found" });
  const listing = await db.collection("collab_listings").findOne({ listing_id: app.listing_id, user_id: userId });
  if (!listing) return res.status(403).json({ error: "Forbidden" });
  await db.collection("collab_applications").updateOne(
    { application_id: appId },
    { $set: { status: "rejected", updated_at: new Date().toISOString() } }
  );
  return res.json({ success: true });
}

async function reportListing(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.params.id || "");
  await db.collection("collab_reports").insertOne({
    listing_id: id,
    reporter_user_id: userId,
    reason: String(req.body?.reason || "").slice(0, 500),
    created_at: new Date().toISOString(),
  });
  return res.json({ success: true });
}

module.exports = {
  listListings,
  createListing,
  getListing,
  updateListing,
  deleteListing,
  applyListing,
  myListings,
  myApplications,
  acceptApplication,
  rejectApplication,
  reportListing,
};
