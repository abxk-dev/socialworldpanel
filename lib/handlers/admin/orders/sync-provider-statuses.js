const { ObjectId } = require("mongodb");
const { getDb } = require("../../_db");
const { providerFetchOrderStatus } = require("../../../providerSmmApi");
const { invalidateAllOrderLists } = require("../../../cache/orderListCache");
const { creditReferralCommissionOnOrderCompleted } = require("../../../referralCommission");

function safeString(v) {
  return v == null ? "" : String(v);
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

function buildOrderFilter(body) {
  const status = safeString(body?.status || "all");
  const createdLast = safeString(body?.created_last || "0");
  const providerId = safeString(body?.provider_id || "");
  const serviceId = safeString(body?.service_id || "");
  const mode = safeString(body?.mode || "all");
  const search = safeString(body?.search || "").trim();
  const searchBy = safeString(body?.search_by || "all");

  const filter = {};
  if (status && status !== "all") filter.status = status;
  if (serviceId && serviceId !== "all") filter.service_id = serviceId;
  if (mode && mode !== "all") filter.mode = mode;

  if (createdLast && createdLast !== "0") {
    const days = Number(createdLast);
    if (Number.isFinite(days) && days > 0) {
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      filter.created_at = { ...(filter.created_at || {}), $gte: from.toISOString() };
    }
  }

  if (search) {
    const r = new RegExp(escapeRegex(search), "i");
    if (searchBy === "order_id") filter.order_id = r;
    else if (searchBy === "user_id") filter.user_id = r;
    else if (searchBy === "link") filter.link = r;
    else {
      filter.$or = [{ order_id: r }, { link: r }, { user_id: r }, { user_note: r }];
    }
  }

  if (providerId && providerId !== "all") filter.provider_id = providerId;
  return filter;
}

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ success: false, error: "Database unavailable" });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const limit = Math.max(1, Math.min(100, Number(body.limit || 50)));
    const minAgeMs = Math.max(0, Number(body.min_age_ms ?? 0));
    const onlyPending = body.only_pending !== false;

    const base = buildOrderFilter(body);

    const notFinal = onlyPending
      ? { $nin: ["completed", "partial", "cancelled", "failed", "error"] }
      : undefined;

    const ageCutoffIso = new Date(Date.now() - minAgeMs).toISOString();
    const syncGate = minAgeMs > 0
      ? { $or: [{ provider_status_synced_at: { $exists: false } }, { provider_status_synced_at: { $lt: ageCutoffIso } }] }
      : {};

    const filter = {
      ...base,
      provider_order_id: { $ne: null },
      ...(notFinal ? { status: notFinal } : {}),
      ...syncGate,
    };

    const candidates = await db
      .collection("orders")
      .find(filter)
      .sort({ provider_status_synced_at: 1, updated_at: 1, created_at: 1 })
      .limit(limit + 1)
      .toArray();

    const has_more = candidates.length > limit;
    const targets = candidates.slice(0, limit);

    let attempted = 0;
    let updated = 0;
    let status_updated = 0;
    let failed = 0;

    for (const order of targets) {
      attempted += 1;
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
        if (nextStatus && nextStatus !== String(order.status || "").toLowerCase()) {
          updateSet.status = nextStatus;
        }

        await db.collection("orders").updateOne({ order_id: order.order_id }, { $set: updateSet });
        updated += 1;
        if (updateSet.status != null) status_updated += 1;

        if (updateSet.status != null) {
          try {
            await creditReferralCommissionOnOrderCompleted(db, {
              order: { ...order, ...updateSet },
              previousStatus: prevStatus,
            });
          } catch (_) {}
        }
      } catch (_) {
        failed += 1;
      }
    }

    if (updated > 0) invalidateAllOrderLists();

    return res.json({
      success: true,
      attempted,
      updated,
      status_updated,
      failed,
      has_more,
      limit,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || "Failed to sync provider statuses" });
  }
};

