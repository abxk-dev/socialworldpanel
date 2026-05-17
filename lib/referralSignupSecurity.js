const { normalizeIp } = require("./clientIp");

async function recordReferralMassIpAlert(db, { ip, referrer, refereeUserId, refereeEmail }) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const ipNorm = normalizeIp(ip);
  if (ipNorm === "unknown") return;

  const sameIpLogins = await db.collection("user_login_history").countDocuments({
    $or: [{ ip_address: ipNorm }, { ip_address: ip }],
    logged_in_at: { $gte: weekAgo },
  });

  if (sameIpLogins < 3) return;

  await db.collection("spam_alerts").insertOne({
    alert_type: "referral_fraud_mass_ip",
    ip_address: ipNorm,
    referrer_user_id: String(referrer.user_id),
    referred_user_id: String(refereeUserId),
    referred_email: refereeEmail || null,
    details: `${sameIpLogins} login events from same IP in 7 days near referral signup`,
    severity: "high",
    status: "open",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });
}

/**
 * @param {string|null} intendedReferredBy — canonical referral code to store (or null).
 * @returns {{ ok: boolean, referred_by: string|null, error?: string, code?: string, flagReferralFraud?: boolean }}
 */
async function validateReferralForNewUser(db, {
  clientIp,
  referrer,
  refereeUserId,
  refereeEmail,
  strictBlockSameIp,
  intendedReferredBy,
}) {
  if (!intendedReferredBy || !referrer || !refereeUserId) {
    return { ok: true, referred_by: null };
  }

  const ip = normalizeIp(clientIp);
  const now = new Date().toISOString();

  const refKnown = Array.isArray(referrer.known_ips)
    ? referrer.known_ips.map((x) => normalizeIp(x))
    : [];
  const refLast = normalizeIp(referrer.last_login_ip || "");

  const sharesIpWithReferrer =
    ip !== "unknown" &&
    (refKnown.includes(ip) || (refLast && refLast === ip));

  if (sharesIpWithReferrer) {
    await db.collection("spam_alerts").insertOne({
      alert_type: "referral_fraud_same_ip",
      ip_address: ip,
      shared_ips: [ip],
      referrer_user_id: String(referrer.user_id),
      referrer_email: referrer.email || null,
      referred_user_id: String(refereeUserId),
      referred_email: refereeEmail || null,
      details: `Referral signup: referrer and referee share IP ${ip}`,
      severity: "high",
      status: "open",
      created_at: now,
      updated_at: now,
    });

    if (strictBlockSameIp) {
      return {
        ok: false,
        referred_by: null,
        error:
          "This referral link cannot be used from the same network as the person who shared it.",
        code: "referral_same_ip",
      };
    }

    return { ok: true, referred_by: null, flagReferralFraud: true };
  }

  await recordReferralMassIpAlert(db, {
    ip,
    referrer,
    refereeUserId,
    refereeEmail,
  });

  return { ok: true, referred_by: intendedReferredBy };
}

module.exports = {
  validateReferralForNewUser,
  recordReferralMassIpAlert,
};
