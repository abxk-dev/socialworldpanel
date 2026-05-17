const bcrypt = require("bcryptjs");
const { connectDb, getDb } = require("../lib/db");

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return "";
  return process.argv[idx + 1] || "";
}

(async () => {
  const email = String(getArg("email") || "").trim().toLowerCase();
  const password = String(getArg("password") || "");
  if (!email || !password) {
    throw new Error("Usage: node scripts/create-super-admin.js --email <email> --password <password>");
  }

  await connectDb();
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const now = new Date().toISOString();
  const password_hash = await bcrypt.hash(password, 10);

  const existing = await db.collection("users").findOne({ email });
  if (existing) {
    await db.collection("users").updateOne(
      { _id: existing._id },
      {
        $set: {
          role: "main_admin",
          is_active: true,
          is_admin: true,
          password_hash,
          password: password_hash,
          updated_at: now,
        },
      }
    );
    process.stdout.write(`UPDATED main_admin ${email} user_id=${existing.user_id || existing._id}\n`);
    return;
  }

  const user_id = String(Date.now());
  await db.collection("users").insertOne({
    user_id,
    email,
    username: email.split("@")[0],
    name: "Super Admin",
    role: "main_admin",
    is_active: true,
    is_admin: true,
    balance: 0,
    password_hash,
    password: password_hash,
    created_at: now,
    updated_at: now,
  });
  process.stdout.write(`CREATED main_admin ${email} user_id=${user_id}\n`);
})().catch((err) => {
  process.stderr.write(`FAILED: ${err.message || err}\n`);
  process.exit(1);
});

