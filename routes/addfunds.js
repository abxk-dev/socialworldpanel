const express = require("express");
const router = express.Router();
const { connectDb, getDb } = require("../lib/db");

router.post("/", async (req, res) => {
  try {
    // Accept API key from Authorization or x-api-key for compatibility
    const authHeader = req.headers.authorization;
    const headerKey = req.headers["x-api-key"] || req.headers["x-api_key"];
    let token = null;
    if (headerKey) {
      token = String(headerKey).trim();
    } else if (authHeader) {
      token = authHeader.replace("Bearer ", "").trim();
    }

    if (!token || token !== process.env.PANEL_API_KEY) {
      console.warn("[addfunds] Unauthorized: missing or invalid API key");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { user_id, username, amount, amount_inr, order_id, currency } = req.body || {};

    if ((!user_id && !username) || !order_id) {
      console.warn("[addfunds] Bad request: missing user reference or order_id", { has_user_id: !!user_id, has_username: !!username, has_order_id: !!order_id });
      return res.status(400).json({ error: "Missing user_id/username and order_id" });
    }

    // Resolve amount in USD: accept amount (USD) or amount_inr (INR) and convert
    const amountUsdRaw = amount != null ? Number(amount) : NaN;
    const amountInrRaw = amount_inr != null ? Number(amount_inr) : NaN;
    const rate = Number(process.env.USD_TO_INR_RATE) || 92;
    let amountUsd;
    if (Number.isFinite(amountUsdRaw) && amountUsdRaw > 0) {
      amountUsd = amountUsdRaw;
    } else if (Number.isFinite(amountInrRaw) && amountInrRaw > 0) {
      amountUsd = amountInrRaw / rate;
    } else {
      console.warn("[addfunds] Bad request: invalid amount", { amount, amount_inr });
      return res.status(400).json({ error: "Missing or invalid amount (send amount in USD or amount_inr in INR)" });
    }

    // Round to 4 decimals for balance
    amountUsd = Math.round(amountUsd * 10000) / 10000;

    await connectDb();
    const db = await getDb();
    if (!db) {
      console.error("[addfunds] Database not available");
      return res.status(503).json({ error: "Service unavailable" });
    }

    let userIdStr = user_id ? String(user_id) : null;

    if (username && !userIdStr) {
      const uname = String(username).trim().toLowerCase();
      const userDoc = await db.collection("users").findOne(
        { username: uname },
        { projection: { _id: 0, user_id: 1 } }
      );
      if (!userDoc) {
        console.warn("[addfunds] User not found for username", uname);
        return res.status(404).json({ error: "User not found for username" });
      }
      userIdStr = String(userDoc.user_id);
    }

    if (!userIdStr) {
      return res.status(400).json({ error: "Invalid user reference" });
    }

    const orderIdStr = String(order_id);
    const existing = await db.collection("deposits").findOne({
      order_id: orderIdStr
    });

    if (existing) {
      console.log("[addfunds] Already processed", orderIdStr);
      return res.json({ status: "already_processed" });
    }

    const updateResult = await db.collection("users").updateOne(
      { user_id: userIdStr },
      { $inc: { balance: amountUsd }, $set: { updated_at: new Date().toISOString() } }
    );

    if (!updateResult.matchedCount) {
      console.warn("[addfunds] User not found for user_id", userIdStr);
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const deposit_id = `dep_cashfree_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const deposit = {
      deposit_id,
      user_id: userIdStr,
      amount: amountUsd,
      amount_usd: amountUsd,
      order_id: orderIdStr,
      invoice_id: `INV_${Date.now()}_${orderIdStr}`,
      method: "cashfree",
      status: "completed",
      credited: true,
      created_at: now,
      updated_at: nowIso
    };

    await db.collection("deposits").insertOne(deposit);

    console.log("[addfunds] Credited", { user_id: userIdStr, amount_usd: amountUsd, order_id: orderIdStr });
    return res.json({
      status: "success",
      message: "Balance added",
      amount_usd: amountUsd
    });
  } catch (err) {
    console.error("[addfunds] Error:", err.message, err.stack);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
});

module.exports = router;