const { randomUUID } = require("crypto");
const { getDb } = require("../db");
const { insertNotification } = require("../postOrderHooks");

function daysBetween(isoA, isoB) {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.floor((b - a) / 86400000);
}

async function createAlert(db, row) {
  const alert_id = randomUUID();
  const now = new Date().toISOString();
  await db.collection("reorder_alerts").insertOne({
    alert_id,
    user_id: row.user_id,
    order_id: row.order_id,
    original_quantity: row.quantity,
    alert_type: row.alert_type,
    message: row.message,
    suggested_action: row.suggested_action || "reorder",
    suggested_quantity: row.suggested_quantity,
    estimated_cost: row.estimated_cost,
    is_read: false,
    is_dismissed: false,
    created_at: now,
  });
  await insertNotification(db, row.user_id, "Smart reorder", row.message, "announcement");
}

async function runDaily() {
  const db = await getDb();
  const now = new Date();
  const orders = await db
    .collection("orders")
    .find({
      status: { $in: ["completed", "Completed", "partial", "Partial"] },
    })
    .limit(500)
    .toArray();

  for (const o of orders) {
    const uid = o.user_id;
    if (!uid) continue;
    const settings = await db.collection("alert_settings").findOne({ user_id: uid });
    const def = {
      remind_7: true,
      remind_30: true,
      drop_detection: true,
      milestone: true,
      email: false,
    };
    const pref = { ...def, ...(settings || {}) };

    const age = daysBetween(o.created_at || o.updated_at, now.toISOString());
    const dup = async (type) =>
      db.collection("reorder_alerts").findOne({
        user_id: uid,
        order_id: o.order_id,
        alert_type: type,
      });

    if (pref.remind_14 && age >= 14 && age < 15 && !(await dup("scheduled_14day"))) {
      await createAlert(db, {
        user_id: uid,
        order_id: o.order_id,
        quantity: o.quantity,
        alert_type: "scheduled_14day",
        message: `Your ${o.service_name || "order"} from two weeks ago may need a refresh.`,
        suggested_quantity: o.quantity,
        estimated_cost: Number(o.charge || o.price || 0),
      });
    }
    if (pref.remind_7 && age >= 7 && age < 8 && !(await dup("scheduled_7day"))) {
      await createAlert(db, {
        user_id: uid,
        order_id: o.order_id,
        quantity: o.quantity,
        alert_type: "scheduled_7day",
        message: `Your ${o.service_name || "order"} from 7 days ago is settling. Want to boost again?`,
        suggested_quantity: o.quantity,
        estimated_cost: Number(o.charge || o.price || 0),
      });
    }
    if (pref.remind_30 && age >= 30 && age < 31 && !(await dup("scheduled_30day"))) {
      await createAlert(db, {
        user_id: uid,
        order_id: o.order_id,
        quantity: o.quantity,
        alert_type: "scheduled_30day",
        message: `It's been a month since your ${o.service_name || "order"}. Ready for another boost?`,
        suggested_quantity: o.quantity,
        estimated_cost: Number(o.charge || o.price || 0),
      });
    }
    if (pref.drop_detection && age >= 3 && !(await dup("drop_detected"))) {
      const maybeDrop = Number(o.remains || 0) > 0 && Number(o.remains) < Number(o.quantity) * 0.5;
      if (maybeDrop) {
        await createAlert(db, {
          user_id: uid,
          order_id: o.order_id,
          quantity: o.quantity,
          alert_type: "drop_detected",
          message: "Your metrics may have dropped. Request a refill or place a new order.",
          suggested_quantity: Math.max(100, Math.floor(Number(o.quantity) * 0.2)),
          estimated_cost: null,
        });
      }
    }
    if (pref.milestone && age <= 2 && !(await dup("milestone"))) {
      const sn = String(o.service_name || "").toLowerCase();
      if (sn.includes("follow")) {
        await createAlert(db, {
          user_id: uid,
          order_id: o.order_id,
          quantity: o.quantity,
          alert_type: "milestone",
          message: "You're close to your next follower milestone — finish strong with a quick order.",
          suggested_quantity: 500,
          estimated_cost: null,
        });
      }
    }
  }
}

module.exports = { runDaily };
