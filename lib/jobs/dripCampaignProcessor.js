const { getDb } = require("../db");
const { placeOrderForUser } = require("../orderPlacementInternal");
const { runPostOrderHooks } = require("../postOrderHooks");
const { insertNotification } = require("../postOrderHooks");

function hourInPreferred(utcHour, preferred) {
  if (!preferred?.length) return true;
  return preferred.includes(utcHour);
}

async function processTick() {
  const db = await getDb();
  const now = new Date();
  const utcHour = now.getUTCHours();

  const campaigns = await db
    .collection("drip_campaigns")
    .find({ status: "active" })
    .limit(100)
    .toArray();

  for (const c of campaigns) {
    try {
      if (new Date(c.end_date) < now) {
        await db
          .collection("drip_campaigns")
          .updateOne({ campaign_id: c.campaign_id }, { $set: { status: "completed", updated_at: now.toISOString() } });
        await insertNotification(
          db,
          c.user_id,
          "Drip campaign completed",
          `Your drip campaign for ${c.service_name} has finished.`,
          "announcement"
        );
        continue;
      }

      if (!hourInPreferred(utcHour, c.preferred_hours)) continue;

      const delivered = Number(c.delivered_quantity || 0);
      const total = Number(c.total_quantity || 0);
      if (delivered >= total) {
        await db
          .collection("drip_campaigns")
          .updateOne({ campaign_id: c.campaign_id }, { $set: { status: "completed", updated_at: now.toISOString() } });
        continue;
      }

      const end = new Date(c.end_date);
      const msLeft = end - now;
      const daysLeft = Math.max(1, Math.ceil(msLeft / 86400000));
      const remaining = total - delivered;
      let chunk = Math.min(c.daily_limit || Math.ceil(remaining / daysLeft), remaining);
      chunk = Math.max(1, Math.floor(chunk));

      const placed = await placeOrderForUser(
        db,
        c.user_id,
        {
          service_id: c.service_id,
          quantity: chunk,
          link: c.link,
        },
        { skipPromo: true, drip_campaign_id: c.campaign_id }
      );

      if (!placed.ok) {
        console.warn("[drip] order failed", c.campaign_id, placed.error);
        continue;
      }

      await db.collection("drip_campaign_orders").insertOne({
        campaign_id: c.campaign_id,
        user_id: c.user_id,
        order_id: placed.order_id,
        quantity: chunk,
        charge: placed.charge,
        created_at: now.toISOString(),
      });

      await db.collection("drip_campaigns").updateOne(
        { campaign_id: c.campaign_id },
        {
          $inc: { delivered_quantity: chunk },
          $push: { orders_placed: placed.order_id },
          $set: { updated_at: now.toISOString() },
        }
      );

      try {
        await runPostOrderHooks(db, c.user_id, placed.order, placed.user, placed.service);
      } catch (e) {
        console.warn("[drip] post hooks", e?.message);
      }

      const updated = await db.collection("drip_campaigns").findOne({ campaign_id: c.campaign_id });
      if (updated && Number(updated.delivered_quantity) >= Number(updated.total_quantity)) {
        await db
          .collection("drip_campaigns")
          .updateOne({ campaign_id: c.campaign_id }, { $set: { status: "completed", updated_at: now.toISOString() } });
        await insertNotification(
          db,
          c.user_id,
          "Drip campaign completed",
          `All units for ${c.service_name} have been scheduled.`,
          "announcement"
        );
      }
    } catch (e) {
      console.error("[drip] campaign error", c.campaign_id, e);
    }
  }
}

module.exports = { processTick };
