const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", "..", ".env") });
const bcrypt = require("bcryptjs");
const { getDb } = require("../_db");
const { allocateNextNumericUserId } = require("../../allocateUserId");

module.exports = async function bootstrapSuperAdmin(req, res) {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required in JSON body" });
    }

    const now = new Date();
    const existing = await db.collection("users").findOne({ email });
    const password_hash = await bcrypt.hash(password, 10);

    if (existing) {
      await db.collection("users").updateOne(
        { _id: existing._id },
        {
          $set: {
            role: "main_admin",
            is_active: true,
            password_hash,
            updated_at: now.toISOString(),
          },
        }
      );
      return res.json({ success: true, updated: true, user_id: existing.user_id || existing._id, email, role: "main_admin" });
    }

    let user_id;
    try {
      user_id = await allocateNextNumericUserId(db);
    } catch (_) {
      // Fallback: timestamp id
      user_id = String(Date.now());
    }
    const doc = {
      user_id,
      email,
      username: email.split("@")[0],
      name: "Super Admin",
      role: "main_admin",
      is_active: true,
      password_hash,
      balance: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    await db.collection("users").insertOne(doc);
    return res.json({ success: true, created: true, user_id, email, role: "main_admin" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to create admin" });
  }
};

