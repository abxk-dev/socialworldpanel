const axios = require("axios");
const { getDb } = require("./_db");
const getUserId = require("../getUserId");

const SYSTEM_PROMPT = `You are an SMM panel order assistant. Extract platform (instagram/youtube/tiktok/facebook/twitter),
service type (followers/likes/views/comments/watchtime), quantity, and budget from the user message.
Return JSON only with these fields:
platform, service_type, quantity, budget, confidence_score
Use lowercase for platform. quantity and budget are numbers or null if unknown. confidence_score 0-1.`;

function parseJsonFromClaude(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function scoreService(doc, intent) {
  const name = `${doc.name || ""} ${doc.service_name || ""} ${doc.title || ""}`.toLowerCase();
  let s = 0;
  const p = (intent.platform || "").toLowerCase();
  const t = (intent.service_type || "").toLowerCase();
  if (p && name.includes(p)) s += 3;
  if (t && name.includes(t)) s += 4;
  if (intent.quantity && doc.max && Number(intent.quantity) <= Number(doc.max)) s += 0.5;
  return s;
}

async function orderAssist(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ error: "message is required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI assistant is not configured (ANTHROPIC_API_KEY)" });
  }

  let intent = {
    platform: null,
    service_type: null,
    quantity: null,
    budget: null,
    confidence_score: 0,
  };

  try {
    const { data } = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022",
        max_tokens: 512,
        messages: [{ role: "user", content: `${SYSTEM_PROMPT}\n\nUser: ${message}` }],
      },
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        timeout: 45000,
      }
    );
    const block = data?.content?.find((c) => c.type === "text");
    const parsed = parseJsonFromClaude(block?.text || "");
    if (parsed) intent = { ...intent, ...parsed };
  } catch (e) {
    console.error("[aiOrderAssistant]", e?.response?.data || e.message);
    return res.status(502).json({ error: "AI request failed", detail: e.message });
  }

  const services = await db
    .collection("services")
    .find({})
    .project({ name: 1, service_name: 1, service_id: 1, rate: 1, price: 1, min: 1, max: 1, category: 1 })
    .limit(400)
    .toArray();

  const ranked = services
    .map((s) => ({ s, score: scoreService(s, intent) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const fallback =
    ranked.length > 0
      ? ranked
      : services.slice(0, 3).map((s) => ({ s, score: 0 }));

  const qty =
    intent.quantity != null && Number.isFinite(Number(intent.quantity))
      ? Math.max(1, Math.floor(Number(intent.quantity)))
      : 1000;

  const matches = fallback.map(({ s }) => {
    const rate = parseFloat(s.rate ?? s.price ?? 0);
    const est = parseFloat(((rate / 1000) * qty).toFixed(2));
    return {
      service_id: s.service_id,
      name: s.name || s.service_name || String(s.service_id),
      rate,
      suggested_quantity: qty,
      estimated_cost: est,
      estimated_delivery: "Varies by service",
      prefill: {
        service_id: s.service_id,
        quantity: qty,
      },
    };
  });

  const now = new Date().toISOString();
  await db.collection("ai_order_conversations").insertOne({
    user_id: userId,
    message,
    intent,
    matches: matches.map((m) => m.service_id),
    created_at: now,
  });

  return res.json({
    success: true,
    intent,
    matches,
    reply:
      matches.length > 0
        ? "Here are the best matching services. Tap a card to pre-fill your order."
        : "I could not match services strongly; showing popular options.",
  });
}

module.exports = { orderAssist };
