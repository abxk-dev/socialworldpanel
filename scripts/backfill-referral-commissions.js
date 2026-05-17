/**
 * One-time: credit referrers for completed orders that never received commission
 * (e.g. completed before referral payout was implemented).
 *
 * Usage: node scripts/backfill-referral-commissions.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { connectDb, getDb } = require("../lib/db");
const { creditReferralCommissionOnOrderCompleted } = require("../lib/referralCommission");

async function main() {
  await connectDb();
  const db = await getDb();
  const cursor = db.collection("orders").find({
    referral_commission_credited: { $ne: true },
    $or: [
      { status: { $regex: /^completed$/i } },
      { status: { $regex: /^complete$/i } },
    ],
  });
  let n = 0;
  for await (const order of cursor) {
    const r = await creditReferralCommissionOnOrderCompleted(db, {
      order,
      previousStatus: "pending",
    });
    if (r.credited) {
      console.log("Credited", order.order_id, r.amount, "->", r.referrer_id);
      n += 1;
    }
  }
  console.log("Done. Credited", n, "orders.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
