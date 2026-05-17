/**
 * XP, levels, achievements — used by order hooks, login, reviews, admin.
 */
const LEVELS = [
  { level: 1, name: "Starter", min_xp: 0 },
  { level: 2, name: "Beginner", min_xp: 200 },
  { level: 3, name: "Creator", min_xp: 500 },
  { level: 4, name: "Rising Star", min_xp: 1000 },
  { level: 5, name: "Influencer", min_xp: 2000 },
  { level: 6, name: "Pro Creator", min_xp: 4000 },
  { level: 7, name: "Elite", min_xp: 7500 },
  { level: 8, name: "Legend", min_xp: 15000 },
  { level: 9, name: "Icon", min_xp: 30000 },
  { level: 10, name: "God Mode", min_xp: 50000 },
];

const BADGE_DEFS = [
  { id: "first_order", title: "First Order", description: "Place your first service order" },
  { id: "big_spender", title: "Big Spender", description: "Spend over $100 total on orders" },
  { id: "loyal_creator", title: "Loyal Creator", description: "30 consecutive login days" },
  { id: "referral_king", title: "Referral King", description: "Refer 10 friends who signed up" },
  { id: "review_hero", title: "Review Hero", description: "Write 5 reviews" },
  { id: "speed_runner", title: "Speed Runner", description: "Place 10 orders in one day" },
  { id: "youtube_master", title: "YouTube Master", description: "Order YouTube services 20 times" },
  { id: "instagram_pro", title: "Instagram Pro", description: "Order Instagram services 20 times" },
];

function levelFromXp(totalXp) {
  const xp = Math.max(0, Number(totalXp) || 0);
  let cur = LEVELS[0];
  for (const L of LEVELS) {
    if (xp >= L.min_xp) cur = L;
  }
  return cur;
}

function nextLevelFromXp(totalXp) {
  const xp = Math.max(0, Number(totalXp) || 0);
  for (const L of LEVELS) {
    if (xp < L.min_xp) return L;
  }
  return null;
}

async function appendXpEvent(db, userId, amount, reason, meta = {}) {
  const uid = String(userId);
  const amt = Math.round(Number(amount) || 0);
  if (!amt) return null;
  const now = new Date().toISOString();
  await db.collection("user_xp_events").insertOne({
    user_id: uid,
    amount: amt,
    reason,
    meta,
    created_at: now,
  });
  await db.collection("users").updateOne(
    { user_id: uid },
    { $inc: { gamification_xp: amt }, $set: { gamification_updated_at: now } }
  );
  const u = await db.collection("users").findOne({ user_id: uid }, { projection: { gamification_xp: 1 } });
  const total = Number(u?.gamification_xp || 0);
  const lvl = levelFromXp(total);
  await db.collection("users").updateOne(
    { user_id: uid },
    { $set: { gamification_level: lvl.level, gamification_level_name: lvl.name } }
  );
  return { total_xp: total, level: lvl };
}

async function ensureBadge(db, userId, badgeId) {
  const uid = String(userId);
  const def = BADGE_DEFS.find((b) => b.id === badgeId);
  if (!def) return;
  const now = new Date().toISOString();
  await db.collection("user_achievements").updateOne(
    { user_id: uid, badge_id: badgeId },
    {
      $setOnInsert: {
        user_id: uid,
        badge_id: badgeId,
        title: def.title,
        description: def.description,
        earned_at: now,
      },
    },
    { upsert: true }
  );
}

async function awardOrderXp(db, userId, order) {
  const uid = String(userId);
  const charge = Number(order?.charge ?? order?.price ?? 0);
  const prevCount = await db.collection("orders").countDocuments({ user_id: uid });
  let xp = 50;
  if (prevCount <= 1) xp += 100;
  if (charge > 10) xp += 50;
  if (charge > 50) xp += 200;
  await appendXpEvent(db, uid, xp, "place_order", { order_id: order?.order_id });
  if (prevCount <= 1) await ensureBadge(db, uid, "first_order");

  const totalSpentAgg = await db
    .collection("orders")
    .aggregate([
      { $match: { user_id: uid } },
      { $group: { _id: null, s: { $sum: { $toDouble: { $ifNull: ["$charge", "$price"] } } } } },
    ])
    .toArray();
  const spent = Number(totalSpentAgg[0]?.s || 0);
  if (spent >= 100) await ensureBadge(db, uid, "big_spender");

  const sn = String(order?.service_name || "").toLowerCase();
  if (sn.includes("youtube") || sn.includes("yt ")) {
    const n = await db
      .collection("orders")
      .countDocuments({ user_id: uid, service_name: { $regex: /youtube|yt /i } });
    if (n >= 20) await ensureBadge(db, uid, "youtube_master");
  }
  if (sn.includes("instagram") || sn.includes("insta")) {
    const n = await db
      .collection("orders")
      .countDocuments({ user_id: uid, service_name: { $regex: /instagram|insta/i } });
    if (n >= 20) await ensureBadge(db, uid, "instagram_pro");
  }

  const startDay = new Date();
  startDay.setHours(0, 0, 0, 0);
  const dayOrders = await db.collection("orders").countDocuments({
    user_id: uid,
    created_at: { $gte: startDay.toISOString() },
  });
  if (dayOrders >= 10) await ensureBadge(db, uid, "speed_runner");
}

async function recordDailyLogin(db, userId) {
  const uid = String(userId);
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const u = await db
    .collection("users")
    .findOne({ user_id: uid }, { projection: { last_gamification_login_day: 1, gamification_login_streak: 1 } });
  if (u?.last_gamification_login_day === dayKey) return;

  const prev = u?.last_gamification_login_day;
  let streak = 1;
  if (prev) {
    const p = new Date(prev + "T12:00:00Z");
    const diff = Math.round((now - p) / 86400000);
    if (diff === 1) streak = (u.gamification_login_streak || 0) + 1;
    else if (diff === 0) streak = u.gamification_login_streak || 1;
    else streak = 1;
  }

  await db.collection("users").updateOne(
    { user_id: uid },
    {
      $set: {
        last_gamification_login_day: dayKey,
        gamification_login_streak: streak,
      },
    }
  );

  await appendXpEvent(db, uid, 10, "daily_login", { day: dayKey });
  if (streak === 7) await appendXpEvent(db, uid, 150, "login_streak_7", {});
  if (streak === 30) {
    await appendXpEvent(db, uid, 500, "login_streak_30", {});
    await ensureBadge(db, uid, "loyal_creator");
  }
}

async function awardReviewXp(db, userId) {
  await appendXpEvent(db, uid, 30, "write_review", {});
  const n = await db.collection("reviews").countDocuments({ user_id: userId });
  if (n >= 5) await ensureBadge(db, uid, "review_hero");
}

async function awardAddFundsXp(db, userId, amount) {
  const a = Number(amount);
  if (a > 0) await appendXpEvent(db, uid, 20, "add_funds", { amount: a });
}

function getLevelTable() {
  return { levels: LEVELS, badges: BADGE_DEFS, levelFromXp, nextLevelFromXp };
}

module.exports = {
  LEVELS,
  BADGE_DEFS,
  levelFromXp,
  nextLevelFromXp,
  appendXpEvent,
  ensureBadge,
  awardOrderXp,
  recordDailyLogin,
  awardReviewXp,
  awardAddFundsXp,
  getLevelTable,
};
