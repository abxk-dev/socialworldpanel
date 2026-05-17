const { getDb } = require("./_db");
const getUserId = require("../getUserId");

function band(score) {
  const s = Number(score) || 0;
  if (s <= 30) return { label: "Poor", color: "red" };
  if (s <= 60) return { label: "Average", color: "yellow" };
  if (s <= 80) return { label: "Good", color: "blue" };
  return { label: "Excellent", color: "green" };
}

function buildRecommendations(platform, scores, serviceSamples) {
  const rec = [];
  const p = platform.toLowerCase();
  const pick = (kw) =>
    serviceSamples.find((s) => {
      const n = `${s.name || ""} ${s.service_name || ""}`.toLowerCase();
      return n.includes(kw) || n.includes(p);
    });

  if (scores.engagement < 20) {
    const s = pick("like") || pick("comment") || serviceSamples[0];
    if (s)
      rec.push({
        reason: "Engagement rate is low — boost likes or comments.",
        service_id: s.service_id,
        service_name: s.name || s.service_name,
        action: "order_likes_comments",
      });
  }
  if (scores.profile < 50) {
    const s = pick("follower") || serviceSamples[1] || serviceSamples[0];
    if (s)
      rec.push({
        reason: "Grow your follower base for stronger social proof.",
        service_id: s.service_id,
        service_name: s.name || s.service_name,
        action: "order_followers",
      });
  }
  if (scores.content < 40) {
    const s = pick("view") || serviceSamples[2] || serviceSamples[0];
    if (s)
      rec.push({
        reason: "Increase reach with more views.",
        service_id: s.service_id,
        service_name: s.name || s.service_name,
        action: "order_views",
      });
  }
  return rec.slice(0, 5);
}

async function analyze(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const platform = String(req.body?.platform || "instagram").toLowerCase();
  const username = String(req.body?.username || "").replace(/^@/, "").trim();
  const profile_url = String(req.body?.profile_url || "").trim();
  if (!username && !profile_url) {
    return res.status(400).json({ error: "username or profile_url required" });
  }

  let followers = 1000,
    posts = 12,
    engagement_proxy = 0.02;
  if (platform === "instagram") {
    const u = username || profile_url.split("/").filter(Boolean).pop() || "user";
    followers = 500 + (u.length * 37) % 50000;
    posts = 5 + (u.length % 40);
    engagement_proxy = 0.01 + (u.length % 5) / 100;
  } else {
    followers = 800 + Math.floor(Math.random() * 20000);
    posts = 8 + Math.floor(Math.random() * 30);
    engagement_proxy = 0.008 + Math.random() * 0.04;
  }

  const engagementScore = Math.min(100, Math.round(engagement_proxy * 100 * 4));
  const growthScore = Math.min(100, Math.round((posts / 30) * 100));
  const profileScore = username || profile_url ? 72 : 40;
  const contentScore = Math.min(100, Math.round((posts / 50) * 100));
  const overall = Math.round(
    engagementScore * 0.35 + growthScore * 0.2 + profileScore * 0.25 + contentScore * 0.2
  );

  const scores = {
    engagement: engagementScore,
    growth: growthScore,
    profile: profileScore,
    content: contentScore,
    overall,
  };

  const services = await db
    .collection("services")
    .find({})
    .project({ name: 1, service_name: 1, service_id: 1, rate: 1 })
    .limit(80)
    .toArray();

  const recommendations = buildRecommendations(platform, scores, services);
  const now = new Date().toISOString();

  const record = {
    user_id: userId,
    platform,
    username: username || null,
    profile_url: profile_url || null,
    scores,
    score_bands: {
      overall: band(overall),
      engagement: band(engagementScore),
      growth: band(growthScore),
      profile: band(profileScore),
      content: band(contentScore),
    },
    recommendations,
    analyzed_at: now,
    conversion_order_id: null,
  };

  await db.collection("health_scores").insertOne(record);

  return res.json({
    success: true,
    ...record,
    history: await db
      .collection("health_scores")
      .find({ user_id: userId })
      .sort({ analyzed_at: -1 })
      .limit(10)
      .project({ analyzed_at: 1, platform: 1, username: 1, "scores.overall": 1 })
      .toArray(),
  });
}

module.exports = { analyze };
