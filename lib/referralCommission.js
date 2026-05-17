const { findUserByReferralCode } = require("./referralCode");
const { randomUUID } = require("crypto");

function isCompletedStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "completed" || s === "complete";
}

function wasCompletedStatus(status) {
  return isCompletedStatus(status);
}

/**
 * When a referee's order reaches completed, credit the referrer's wallet.
 * Idempotent per order_id via referral_earnings + order.referral_commission_credited.
 */
async function creditReferralCommissionOnOrderCompleted(db, { order, previousStatus }) {
  if (!db || !order?.order_id || !order.user_id) return { credited: false, reason: "bad_order" };

  const prev = String(previousStatus || "");
  const next = String(order.status || "");
  if (!isCompletedStatus(next)) return { credited: false, reason: "not_completed" };
  if (wasCompletedStatus(prev)) return { credited: false, reason: "already_completed" };
  if (order.referral_commission_credited === true) return { credited: false, reason: "already_credited" };

  const dup = await db.collection("referral_earnings").findOne({ order_id: String(order.order_id) });
  if (dup) {
    await db.collection("orders").updateOne(
      { order_id: String(order.order_id) },
      { $set: { referral_commission_credited: true, updated_at: new Date().toISOString() } }
    );
    return { credited: false, reason: "duplicate_earning" };
  }

  const settings = await db
    .collection("admin_settings")
    .findOne({}, { projection: { referral_commission_percent: 1, referral_system_enabled: 1 } })
    .catch(() => null);

  if (settings && settings.referral_system_enabled === false) {
    return { credited: false, reason: "system_disabled" };
  }

  const percent = Number(settings?.referral_commission_percent);
  const commissionPct = Number.isFinite(percent) && percent >= 0 ? percent : 5;

  const charge = Number(order.charge ?? order.price ?? 0);
  if (!Number.isFinite(charge) || charge <= 0) return { credited: false, reason: "zero_charge" };

  const referee = await db.collection("users").findOne({ user_id: String(order.user_id) });
  if (!referee?.referred_by) return { credited: false, reason: "no_referrer" };

  const referrer = await findUserByReferralCode(db, referee.referred_by);
  if (!referrer?.user_id) return { credited: false, reason: "referrer_not_found" };
  if (String(referrer.user_id) === String(referee.user_id)) return { credited: false, reason: "self_referral" };

  const amount = Number(((charge * commissionPct) / 100).toFixed(6));
  if (!Number.isFinite(amount) || amount <= 0) return { credited: false, reason: "zero_commission" };

  const now = new Date().toISOString();
  const earningId = randomUUID();

  await db.collection("referral_earnings").insertOne({
    earning_id: earningId,
    referrer_id: String(referrer.user_id),
    referee_user_id: String(referee.user_id),
    order_id: String(order.order_id),
    amount,
    commission_percent: commissionPct,
    order_charge: charge,
    source: "order_completed",
    created_at: now,
  });

  await db.collection("users").updateOne(
    { user_id: String(referrer.user_id) },
    { $inc: { referral_balance: amount } }
  );

  await db.collection("orders").updateOne(
    { order_id: String(order.order_id) },
    {
      $set: {
        referral_commission_credited: true,
        referral_commission_amount: amount,
        referral_commission_referrer_id: String(referrer.user_id),
        updated_at: now,
      },
    }
  );

  return { credited: true, amount, referrer_id: referrer.user_id };
}

module.exports = {
  creditReferralCommissionOnOrderCompleted,
  isCompletedStatus,
};
