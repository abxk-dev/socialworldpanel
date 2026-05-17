const { ObjectId } = require("mongodb");
const { connectDb, getDb } = require("../db");
const { providerFetchOrderStatus } = require("../providerSmmApi");
const { creditReferralCommissionOnOrderCompleted } = require("../referralCommission");
const { invalidateAllOrderLists } = require("../cache/orderListCache");

function normalizeProviderOrderStatus(statusText, currentStatus) {
  const cur = String(currentStatus || "").toLowerCase();
  const s = String(statusText || "").toLowerCase();
  if (!s) return cur;
  if (s.includes("complete") || s.includes("success") || s === "done" || s.includes("finished")) return "completed";
  if (s.includes("partial")) return "partial";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("fail") || s.includes("error")) return "failed";
  if (s.includes("process") || s.includes("progress") || s.includes("running")) return "in_progress";
  if (s.includes("pend") || s.includes("queue") || s.includes("waiting")) return "pending";
  return cur;
}

async function loadProviderByAnyId(db, providerId) {
  const sid = String(providerId || "").trim();
  if (!sid) return null;
  const or = [{ provider_id: sid }, { _id: sid }];
  if (ObjectId.isValid(sid)) {
    try {
      or.push({ _id: new ObjectId(sid) });
    } catch (_) {}
  }
  return db.collection("providers").findOne({ $or: or });
}

function shouldSyncOrder(order, minAgeMs) {
  if (!order?.provider_order_id) return false;
  const s = String(order.status || "").toLowerCase();
  if (["completed", "partial", "cancelled", "failed", "error"].includes(s)) return false;
  const last = order.provider_status_synced_at || order.provider_last_sync_at || order.updated_at || null;
  if (!last) return true;
  const ts = new Date(last).getTime();
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts >= minAgeMs;
}

async function runTick({
  limit = 20,
  minAgeMs = 5 * 60 * 1000,
} = {}) {
  await connectDb();
  const db = await getDb();
  if (!db) return { ok: false, updated: 0, checked: 0 };

  const candidates = await db
    .collection("orders")
    .find({
      provider_order_id: { $ne: null },
      status: { $nin: ["completed", "partial", "cancelled", "failed", "error"] },
    })
    .sort({ updated_at: 1, created_at: 1 })
    .limit(Math.max(1, Math.min(100, limit * 3)))
    .toArray();

  const targets = candidates.filter((o) => shouldSyncOrder(o, minAgeMs)).slice(0, Math.max(1, limit));

  let updated = 0;
  let checked = 0;
  for (const order of targets) {
    checked += 1;
    try {
      const provider = await loadProviderByAnyId(db, order.provider_id);
      if (!provider?.api_url || !provider?.api_key) continue;

      const statusRes = await providerFetchOrderStatus({
        apiUrl: provider.api_url,
        apiKey: provider.api_key,
        providerToken: provider.api_token || provider.token || "",
        providerOrderId: order.provider_order_id,
      });
      if (!statusRes.ok) continue;

      const prevStatus = String(order.status || "");
      const nextStatus = normalizeProviderOrderStatus(statusRes.provider_status_text, order.status);
      const now = new Date().toISOString();
      const updateSet = {
        updated_at: now,
        provider_status_synced_at: now,
      };
      if (statusRes.provider_status_text != null) updateSet.provider_status_text = statusRes.provider_status_text;
      if (statusRes.provider_charge != null) updateSet.provider_charge = statusRes.provider_charge;
      if (statusRes.remains != null) updateSet.remains = statusRes.remains;
      if (statusRes.start_count != null) updateSet.start_count = statusRes.start_count;
      if (nextStatus && nextStatus !== String(order.status || "").toLowerCase()) updateSet.status = nextStatus;

      await db.collection("orders").updateOne({ order_id: order.order_id }, { $set: updateSet });
      updated += 1;

      if (updateSet.status != null) {
        try {
          await creditReferralCommissionOnOrderCompleted(db, {
            order: { ...order, ...updateSet },
            previousStatus: prevStatus,
          });
        } catch (_) {}
      }
    } catch (_) {}
  }

  if (updated > 0) invalidateAllOrderLists();
  return { ok: true, updated, checked };
}

module.exports = { runTick };

