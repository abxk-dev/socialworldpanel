const { getDb } = require("./_db");
const getUserId = require("../getUserId");
const { levelFromXp, nextLevelFromXp, getLevelTable, BADGE_DEFS } = require("../gamificationService");

const LEVEL_REWARDS = [
  { level: 3, discount_percent: 5, perks: ["5% discount on all orders"] },
  { level: 5, discount_percent: 10, perks: ["10% discount", "Exclusive services"] },
  { level: 7, discount_percent: 15, perks: ["15% discount", "Priority support"] },
  { level: 10, discount_percent: 20, perks: ["20% discount", "Dedicated account manager"] },
];

async function getProfile(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const u = await db.collection("users").findOne({ user_id: userId });
  const xp = Number(u?.gamification_xp || 0);
  const lvl = levelFromXp(xp);
  const next = nextLevelFromXp(xp);
  const nextXp = next ? next.min_xp : null;
  const rank = 1 + (await db.collection("users").countDocuments({ gamification_xp: { $gt: xp } }));

  const events = await db
    .collection("user_xp_events")
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(10)
    .toArray();

  const badges = await db
    .collection("user_achievements")
    .find({ user_id: userId })
    .toArray();

  return res.json({
    success: true,
    xp,
    level: lvl.level,
    level_name: lvl.name,
    next_level: next,
    xp_to_next: nextXp != null ? Math.max(0, nextXp - xp) : 0,
    rank,
    recent_events: events,
    badges,
    level_rewards: LEVEL_REWARDS,
  });
}

async function getLeaderboard(req, res) {
  const db = await getDb();
  const mode = String(req.query?.mode || "month");
  const userId = getUserId(req);
  let enriched = [];

  if (mode === "month") {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const agg = await db
      .collection("user_xp_events")
      .aggregate([
        { $match: { created_at: { $gte: start } } },
        { $group: { _id: "$user_id", xp: { $sum: "$amount" } } },
        { $sort: { xp: -1 } },
        { $limit: 10 },
      ])
      .toArray();
    for (const row of agg) {
      const u = await db.collection("users").findOne({ user_id: row._id }, { projection: { username: 1, email: 1, gamification_level: 1 } });
      enriched.push({
        user_id: row._id,
        username: u?.username || u?.email || row._id,
        xp_month: row.xp,
        level: u?.gamification_level || 1,
        is_me: userId && row._id === userId,
      });
    }
  } else {
    const top = await db
      .collection("users")
      .find({ gamification_xp: { $gt: 0 } })
      .sort({ gamification_xp: -1 })
      .limit(10)
      .project({ user_id: 1, username: 1, email: 1, gamification_xp: 1, gamification_level: 1 })
      .toArray();
    enriched = top.map((u) => ({
      user_id: u.user_id,
      username: u.username || u.email || u.user_id,
      xp_month: u.gamification_xp,
      level: u.gamification_level || 1,
      is_me: userId && u.user_id === userId,
    }));
  }

  return res.json({ success: true, mode, leaderboard: enriched });
}

async function getAchievements(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const earned = await db
    .collection("user_achievements")
    .find({ user_id: userId })
    .toArray();
  const earnedIds = new Set(earned.map((e) => e.badge_id));
  const all = BADGE_DEFS.map((b) => ({
    ...b,
    earned: earnedIds.has(b.id),
    earned_at: earned.find((e) => e.badge_id === b.id)?.earned_at || null,
  }));
  return res.json({ success: true, achievements: all });
}

async function getRewards(req, res) {
  return res.json({ success: true, rewards: LEVEL_REWARDS, levels: getLevelTable().levels });
}

module.exports = {
  getProfile,
  getLeaderboard,
  getAchievements,
  getRewards,
};
