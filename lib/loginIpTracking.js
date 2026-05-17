const { userAgentLooksSuspicious, getClientIp } = require("./clientIp");
const { userIdEqualityFilter, userIdNotSelfFilter, expandUserIdsForIn } = require("./mongoUserId");

/**
 * Persist login IP / UA, maintain known_ips, flag shared-IP clusters and spam_alerts.
 * Never throws — callers wrap in try/catch optional.
 */
async function recordLoginIpAndSpamCheck(db, req, { userId, email }) {
  if (!db || !userId) return;

  const uid = String(userId);
  const clientIp = getClientIp(req);

  const userAgent = req.headers["user-agent"] || "";
  const now = new Date().toISOString();
  const isSuspicious = userAgentLooksSuspicious(userAgent);
  const browser = userAgent.includes("Chrome")
    ? "Chrome"
    : userAgent.includes("Firefox")
      ? "Firefox"
      : userAgent.includes("Safari")
        ? "Safari"
        : "Other";

  await db.collection("user_login_history").insertOne({
    user_id: uid,
    email,
    ip_address: clientIp,
    user_agent: userAgent,
    browser,
    logged_in_at: now,
    is_flagged: false,
    is_suspicious: isSuspicious,
  });

  const userFilter = userIdEqualityFilter(uid);
  if (userFilter) {
    await db.collection("users").updateOne(userFilter, {
      $set: {
        last_login_ip: clientIp,
        last_login_at: now,
        last_user_agent: userAgent,
      },
      $addToSet: { known_ips: clientIp },
    });
  }

  if (!clientIp || clientIp === "unknown") return;

  const sameIpUsers = await db
    .collection("users")
    .find({
      ...userIdNotSelfFilter(uid),
      $or: [{ known_ips: clientIp }, { last_login_ip: clientIp }],
    })
    .project({ user_id: 1, email: 1, username: 1 })
    .toArray();

  if (sameIpUsers.length === 0) return;

  const allAffected = [uid, ...sameIpUsers.map((u) => String(u.user_id))];
  const allEmails = [email, ...sameIpUsers.map((u) => u.email).filter(Boolean)];

  await db.collection("users").updateMany(
    { user_id: { $in: expandUserIdsForIn(allAffected) } },
    {
      $set: {
        ip_flag: true,
        ip_flag_reason: `Shared IP: ${clientIp}`,
        ip_flag_date: now,
        ip_flag_severity:
          allAffected.length >= 5 ? "high" : allAffected.length >= 3 ? "medium" : "low",
      },
    }
  );

  const existingAlert = await db.collection("spam_alerts").findOne({
    alert_type: "shared_ip",
    ip_address: clientIp,
    status: "open",
  });

  if (!existingAlert) {
    await db.collection("spam_alerts").insertOne({
      alert_type: "shared_ip",
      ip_address: clientIp,
      affected_user_ids: allAffected,
      affected_emails: allEmails,
      details: `${allAffected.length} accounts logged in from IP: ${clientIp}`,
      severity: allAffected.length >= 5 ? "high" : allAffected.length >= 3 ? "medium" : "low",
      status: "open",
      created_at: now,
      updated_at: now,
      last_login_at: now,
    });
  } else {
    await db.collection("spam_alerts").updateOne(
      { _id: existingAlert._id },
      {
        $addToSet: {
          affected_user_ids: { $each: allAffected },
          affected_emails: { $each: allEmails },
        },
        $set: {
          updated_at: now,
          last_login_at: now,
          details: `Multiple accounts from IP: ${clientIp}`,
        },
      }
    );
  }
}

module.exports = { recordLoginIpAndSpamCheck };
