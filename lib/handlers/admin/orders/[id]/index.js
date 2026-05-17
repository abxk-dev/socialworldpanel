const { getDb } = require("../../../_db");
const { invalidateAllOrderLists } = require("../../../../cache/orderListCache");
const { creditReferralCommissionOnOrderCompleted } = require("../../../../referralCommission");

async function enrichOne(db, order) {
  if (!order) return order;

  const [user, service] = await Promise.all([
    order.user_id
      ? db
          .collection("users")
          .findOne({ user_id: order.user_id }, { projection: { user_id: 1, username: 1, email: 1, full_name: 1, name: 1 } })
      : Promise.resolve(null),
    order.service_id
      ? db.collection("services").findOne({ service_id: order.service_id }, { projection: { service_id: 1, name: 1 } })
      : Promise.resolve(null),
  ]);

  const charge = Number(order.charge ?? order.price ?? 0);
  const provider_charge = Number(order.provider_charge ?? order.provider_cost ?? 0);

  return {
    ...order,
    user_username: user?.username || user?.email?.split("@")?.[0] || order?.user_id || "—",
    user_email: user?.email || null,
    user_full_name: user?.full_name || user?.name || null,
    service_name: order.service_name || service?.name || order?.service_id || "—",
    charge,
    provider_charge,
    provider_cost: provider_charge,
    cost_exceeds_charge: provider_charge > 0 && provider_charge > charge,
    needs_price_approval: order.needs_price_approval ?? false,
  };
}

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.json({});

    const id = req.params?.id || req.params?.orderId;

    if (["PUT", "PATCH"].includes(req.method)) {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const order = await db.collection("orders").findOne({ order_id: id });
      if (!order) return res.status(404).json({ success: false, error: "Order not found" });

      // Cancel + refund: set order cancelled, zero the charge, and refund user's current charge once.
      const prevStatusForReferral = String(order.status || "");

      if (body.cancel_and_refund) {
        const statusNow = String(order.status || "").toLowerCase();
        const alreadyDone = !!order.cancel_refund_done || statusNow === "cancelled";
        const refundable = Number(order.charge ?? order.price ?? 0);
        const refundAmount = !alreadyDone && Number.isFinite(refundable) && refundable > 0 ? refundable : 0;

        if (refundAmount > 0 && order.user_id) {
          await db.collection("users").updateOne(
            { user_id: order.user_id },
            { $inc: { balance: refundAmount } }
          );
        }

        await db.collection("orders").updateOne(
          { order_id: id },
          {
            $set: {
              status: "cancelled",
              remains: 0,
              charge: 0,
              price: 0,
              cancel_refund_done: true,
              cancelled_at: new Date().toISOString(),
              refunded_amount: Number((Number(order.refunded_amount || 0) + refundAmount).toFixed(6)),
              updated_at: new Date().toISOString(),
            },
          }
        );
        invalidateAllOrderLists();
        return res.json({ success: true, refunded_amount: refundAmount, status: "cancelled" });
      }

      // Set partial: recalculate charge by delivered qty and refund the difference.
      if (body.set_partial) {
        if (order.partial_set_at) {
          return res.status(409).json({
            success: false,
            error: "Partial already applied for this order",
          });
        }
        const totalQty = Number(order.quantity ?? 0);
        const remainsRaw = Number(body.remains);
        if (!Number.isFinite(remainsRaw) || remainsRaw < 0 || remainsRaw > totalQty) {
          return res.status(400).json({ success: false, error: "Invalid remains value" });
        }

        const remains = Math.floor(remainsRaw);
        const delivered = Math.max(0, totalQty - remains);
        const baseOriginal = Number(order.original_charge ?? order.charge ?? order.price ?? 0);
        const originalCharge = Number.isFinite(baseOriginal) ? baseOriginal : 0;
        const newCharge = totalQty > 0 ? Number(((originalCharge * delivered) / totalQty).toFixed(6)) : 0;
        const currentCharge = Number(order.charge ?? order.price ?? 0);
        const refundAmount = Math.max(0, Number((currentCharge - newCharge).toFixed(6)));
        const nextStatus = remains > 0 ? "partial" : "completed";

        if (refundAmount > 0 && order.user_id) {
          await db.collection("users").updateOne(
            { user_id: order.user_id },
            { $inc: { balance: refundAmount } }
          );
        }

        await db.collection("orders").updateOne(
          { order_id: id },
          {
            $set: {
              status: nextStatus,
              remains,
              charge: newCharge,
              price: newCharge,
              original_charge: originalCharge,
              partial_refunded_amount: Number((Number(order.partial_refunded_amount || 0) + refundAmount).toFixed(6)),
              partial_set_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          }
        );
        invalidateAllOrderLists();
        return res.json({ success: true, status: nextStatus, new_charge: newCharge, refunded_amount: refundAmount });
      }

      const updates = { ...body };
      delete updates._id;
      delete updates.cancel_and_refund;
      delete updates.set_partial;
      delete updates.remains;
      const wantsProviderCostUpdate =
        Object.prototype.hasOwnProperty.call(updates, "provider_cost") ||
        Object.prototype.hasOwnProperty.call(updates, "provider_charge");
      if (wantsProviderCostUpdate) {
        const isManual =
          String(order.mode || "").toLowerCase() === "manual" ||
          String(order.status || "").toLowerCase() === "pending_manual";
        if (!isManual) {
          return res.status(400).json({ success: false, error: "Provider cost can only be edited for manual orders" });
        }
        const raw = updates.provider_cost ?? updates.provider_charge;
        const num = Number(raw);
        if (!Number.isFinite(num) || num < 0) {
          return res.status(400).json({ success: false, error: "Invalid provider cost" });
        }
        updates.provider_cost = num;
        updates.provider_charge = num;
        updates.provider_cost_override = true;
        updates.provider_cost_override_at = new Date().toISOString();
      }
      updates.updated_at = new Date().toISOString();

      await db.collection("orders").updateOne({ order_id: id }, { $set: updates });
      invalidateAllOrderLists();
      try {
        const fresh = await db.collection("orders").findOne({ order_id: id });
        if (fresh) {
          await creditReferralCommissionOnOrderCompleted(db, {
            order: fresh,
            previousStatus: prevStatusForReferral,
          });
        }
      } catch (refErr) {
        console.warn("[referral] commission (admin order update):", refErr?.message || refErr);
      }
      return res.json({ success: true });
    }

    const order = await db.collection("orders").findOne({ order_id: id });
    res.json(await enrichOne(db, order));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
