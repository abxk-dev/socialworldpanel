const { getDb } = require("../../_db");
const { ObjectId } = require("mongodb");
const { providerFetchOrderStatus } = require("../../../providerSmmApi");
const { getCache, setCache } = require("../../../cache/orderListCache");
const { creditReferralCommissionOnOrderCompleted } = require("../../../referralCommission");

function safeString(v) {
  return v == null ? "" : String(v);
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeDateMinute(value) {
  const d = new Date(value || "");
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

function bundleGroupKey(order) {
  const explicit =
    order.bundle_order_id ||
    order.bundle_group_id ||
    order.bundle_id ||
    order.parent_order_id ||
    order.group_id ||
    order.batch_id ||
    null;
  if (explicit) return `explicit:${String(explicit)}`;

  // Fallback for legacy bundle rows without explicit group id.
  if (order.bundle_name || order.is_bundle) {
    const createdMinute = normalizeDateMinute(order.created_at);
    const link = String(order.link || "").trim();
    const user = String(order.user_id || "").trim();
    const name = String(order.bundle_name || "").trim();
    return `legacy:${user}:${link}:${createdMinute}:${name}`;
  }
  return "";
}

function groupBundleOrders(rows) {
  const grouped = new Map();
  const singles = [];

  for (const row of rows) {
    const key = bundleGroupKey(row);
    if (!key) {
      singles.push(row);
      continue;
    }
    const bucket = grouped.get(key) || [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  const out = [...singles];
  for (const bucket of grouped.values()) {
    if (bucket.length <= 1) {
      out.push(bucket[0]);
      continue;
    }
    const sorted = bucket
      .slice()
      .sort((a, b) => String(a.order_id || "").localeCompare(String(b.order_id || "")));
    const parent =
      sorted.find((o) => o.is_bundle === true) ||
      sorted[0];
    const children = sorted.filter((o) => o.order_id !== parent.order_id);
    out.push({
      ...parent,
      is_bundle: true,
      sub_orders: children.map((c) => c.order_id),
      sub_order_details: children,
    });
  }

  return out.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

async function loadProviderByAnyId(db, providerId) {
  const sid = String(providerId || "").trim();
  if (!sid) return null;
  const or = [{ provider_id: sid }, { _id: sid }];
  if (ObjectId.isValid(sid)) {
    try { or.push({ _id: new ObjectId(sid) }); } catch (_) {}
  }
  return db.collection("providers").findOne({ $or: or });
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

async function backfillProviderData(db, rows) {
  const targets = rows.filter((o) =>
    o &&
    o.provider_order_id &&
    !["completed", "partial", "cancelled", "failed", "error"].includes(String(o.status || "").toLowerCase())
  ).slice(0, 12);
  for (const order of targets) {
    try {
      const last = order.provider_status_synced_at || order.provider_last_sync_at || order.updated_at || null;
      const lastTs = last ? new Date(last).getTime() : 0;
      if (lastTs && Number.isFinite(lastTs) && Date.now() - lastTs < 2 * 60 * 1000) continue;

      const provider = await loadProviderByAnyId(db, order.provider_id);
      if (!provider?.api_url || !provider?.api_key) continue;
      const statusRes = await providerFetchOrderStatus({
        apiUrl: provider.api_url,
        apiKey: provider.api_key,
        providerToken: provider.api_token || provider.token || "",
        providerOrderId: order.provider_order_id,
      });
      if (!statusRes.ok) continue;
      const nextStatus = normalizeProviderOrderStatus(statusRes.provider_status_text, order.status);
      const now = new Date().toISOString();
      const updateSet = { updated_at: now, provider_status_synced_at: now };
      if (statusRes.provider_status_text != null) updateSet.provider_status_text = statusRes.provider_status_text;
      if (statusRes.provider_charge != null) updateSet.provider_charge = statusRes.provider_charge;
      if (statusRes.remains != null) updateSet.remains = statusRes.remains;
      if (statusRes.start_count != null) updateSet.start_count = statusRes.start_count;
      const prevStatus = String(order.status || "");
      if (nextStatus && nextStatus !== String(order.status || "").toLowerCase()) updateSet.status = nextStatus;
      await db.collection("orders").updateOne(
        { order_id: order.order_id },
        { $set: updateSet }
      );
      Object.assign(order, updateSet);
      if (updateSet.status != null) {
        try {
          await creditReferralCommissionOnOrderCompleted(db, {
            order: { ...order },
            previousStatus: prevStatus,
          });
        } catch (refErr) {
          console.warn("[referral] commission (admin list sync):", refErr?.message || refErr);
        }
      }
    } catch (_) {}
  }
}

async function enrichOrders(db, orders) {
  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];
  const serviceIds = [...new Set(orders.map((o) => o.service_id).filter(Boolean))];

  const [usersArr, servicesArr] = await Promise.all([
    userIds.length
      ? db
          .collection("users")
          .find({ user_id: { $in: userIds } })
          .project({ user_id: 1, username: 1, email: 1, full_name: 1, name: 1 })
          .toArray()
      : Promise.resolve([]),
    serviceIds.length
      ? db
          .collection("services")
          .find({ service_id: { $in: serviceIds } })
          .project({
            service_id: 1,
            name: 1,
            refill: 1,
            refill_enabled: 1,
            allow_refill: 1,
          })
          .toArray()
      : Promise.resolve([]),
  ]);

  const userMap = Object.fromEntries(usersArr.map((u) => [String(u.user_id), u]));
  const serviceMap = Object.fromEntries(servicesArr.map((s) => [String(s.service_id), s]));

  return orders.map((order) => {
    const userDoc = order?.user_id != null ? userMap[String(order.user_id)] : null;
    const serviceDoc = order?.service_id != null ? serviceMap[String(order.service_id)] : null;

    const charge = Number(order.charge ?? order.price ?? 0);
    const rawPc = order.provider_charge ?? order.provider_cost;
    let provider_charge = null;
    if (rawPc != null && rawPc !== "") {
      const n = Number(rawPc);
      if (Number.isFinite(n)) provider_charge = n;
    }
    const provider_cost = provider_charge;

    const service_refill_supported = !!(
      serviceDoc &&
      (serviceDoc.refill === true ||
        serviceDoc.refill_enabled === true ||
        serviceDoc.allow_refill === true ||
        serviceDoc.refill === "true")
    );

    return {
      ...order,
      user_username:
        userDoc?.username || userDoc?.email?.split("@")?.[0] || order?.user_id || "—",
      user_email: userDoc?.email || null,
      user_full_name: userDoc?.full_name || userDoc?.name || null,
      service_name: order.service_name || serviceDoc?.name || order?.service_id || "—",
      charge,
      provider_charge,
      provider_cost,
      cost_exceeds_charge:
        provider_charge != null && provider_charge > 0 && provider_charge > charge,
      needs_price_approval: order.needs_price_approval ?? false,
      service_refill_supported,
    };
  });
}

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.json({ orders: [], pages: 1, counts_by_status: {} });
    const cacheKey = `adminOrders:${JSON.stringify(req.query || {})}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.max(1, Number(req.query?.limit || 20));

    const status = safeString(req.query?.status || "all");
    const createdLast = safeString(req.query?.created_last || "0");
    const serviceId = safeString(req.query?.service_id || "");
    const providerId = safeString(req.query?.provider_id || "");
    const search = safeString(req.query?.search || "").trim();

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (serviceId) filter.service_id = serviceId;

    if (createdLast && createdLast !== "0") {
      const days = Number(createdLast);
      if (Number.isFinite(days) && days > 0) {
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        filter.created_at = { ...(filter.created_at || {}), $gte: from.toISOString() };
      }
    }

    if (providerId) {
      const services = await db.collection("services").find({ provider_id: providerId }).project({ service_id: 1 }).toArray();
      const serviceIds = services.map((s) => s.service_id).filter(Boolean);
      filter.service_id = serviceIds.length ? { $in: serviceIds } : "__none__";
    }

    if (search) {
      const r = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ order_id: r }, { link: r }, { user_id: r }, { user_note: r }];
    }

    const rawAll = await db
      .collection("orders")
      .find(filter)
      .sort({ created_at: -1 })
      .toArray();
    const groupedAll = groupBundleOrders(rawAll);
    const total = groupedAll.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const pageRows = groupedAll.slice(skip, skip + limit);

    // Expensive provider status sync is disabled by default to keep list APIs fast.
    // Use explicit query sync_provider=1 (or the manual refresh action) when needed.
    if (String(req.query?.sync_provider || "") === "1") {
      await backfillProviderData(db, pageRows);
    }
    const orders = await enrichOrders(db, pageRows);

    const countsAgg = await db
      .collection("orders")
      .aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray();

    const counts_by_status = Object.fromEntries(countsAgg.map((x) => [x._id, x.count]));

    const payload = { orders, pages, counts_by_status };
    setCache(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
