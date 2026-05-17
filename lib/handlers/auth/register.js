const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getDb } = require("../../db");
const {
  generateUniqueReferralCode,
  normalizeRefCode,
  findUserByReferralCode,
  canonicalReferrerCode,
} = require("../../referralCode");
const { getClientIp } = require("../../clientIp");
const { validateReferralForNewUser } = require("../../referralSignupSecurity");
const { allocateNextNumericUserId } = require("../../allocateUserId");

function signAccessToken({ userId, email, role }) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = "7d";
  return jwt.sign(
    { sub: userId, user_id: userId, email, role: role || "user", token_type: "bearer" },
    secret,
    { algorithm: "HS256", expiresIn }
  );
}

async function register(req, res) {
  const db = await getDb();
  if (!db) return res.status(503).json({ detail: "Database unavailable" });

  const body = req?.body && typeof req.body === "object" ? req.body : {};
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const username = String(body?.username || "").trim();
  const whatsapp = String(body?.whatsapp || "").trim();

  if (!email || !password) {
    return res.status(400).json({ detail: "Email and password are required" });
  }

  const exists = await db.collection("users").findOne({ email });
  if (exists) return res.status(409).json({ detail: "Email already registered" });

  let userId;
  try {
    userId = await allocateNextNumericUserId(db);
  } catch (e) {
    console.error("[register] allocate user_id:", e.message);
    return res.status(503).json({ detail: "Could not allocate user id. Try again." });
  }
  const password_hash = await bcrypt.hash(password, 10);

  const referral_code = await generateUniqueReferralCode(db);

  let referred_by = null;
  const refRaw = body.ref ?? body.referral ?? body.referral_code ?? body.invite;
  if (refRaw != null && String(refRaw).trim()) {
    const refUser = await findUserByReferralCode(db, refRaw);
    if (refUser && refUser.user_id !== userId) {
      const intended =
        canonicalReferrerCode(refUser) || normalizeRefCode(String(refRaw).trim());
      const sec = await validateReferralForNewUser(db, {
        clientIp: getClientIp(req),
        referrer: refUser,
        refereeUserId: userId,
        refereeEmail: email,
        strictBlockSameIp: true,
        intendedReferredBy: intended,
      });
      if (!sec.ok) {
        return res.status(403).json({
          detail: sec.error || "Referral not eligible",
          code: sec.code || "referral_security",
        });
      }
      referred_by = sec.referred_by;
    }
  }

  const user = {
    user_id: userId,
    name: name || username || email.split("@")[0],
    email,
    username: username || email.split("@")[0],
    whatsapp: whatsapp || null,
    role: "user",
    is_active: true,
    balance: 0,
    referral_code,
    referred_by,
    password_hash,
    created_at: new Date(),
  };

  await db.collection("users").insertOne(user);
  const token = signAccessToken({ userId, email, role: user.role });

  try {
    const { recordLoginIpAndSpamCheck } = require("../../loginIpTracking");
    await recordLoginIpAndSpamCheck(db, req, { userId: String(userId), email });
  } catch (_) {
    /* never block signup */
  }

  // Do not return password_hash
  const { password_hash: _, ...safeUser } = user;
  return res.json({ access_token: token, user: safeUser });
}

module.exports = register;

