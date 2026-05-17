const { ObjectId } = require("mongodb");
const { getDb } = require("../../_db");
const { providerFetchOrderCharge } = require("../../../providerSmmApi");
const { invalidateAllOrderLists } = require("../../../cache/orderListCache");

function safeString(v) {
  return v == null ? "" : String(v);
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.json({ success: true, attempted: 0, updated: 0, failed: 0 });

    const q = req.body && typeof req.body === "object" ? req.body : req.query || {};
    const status = safeString(q.status || "all");
    const createdLast = safeString(q.created_last || "0");
    const serviceId = safeString(q.service_id || "");
    const providerId = safeString(q.provider_id || "");
    const search = safeString(q.search || "").trim();
    const maxRows = Math.max(1, Math.min(300, Number(q.max_rows || 120)));

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (serviceId && serviceId !== "all") filter.service_id = serviceId;

    if (createdLast && createdLast !== "0") {
      const days = Number(createdLast);
      if (Number.isFinite(days) && days > 0) {
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        filter.created_at = { ...(filter.created_at || {}), $gte: from.toISOString() };
      }
    }

    if (providerId && providerId !== "all") {
      const services = await db
        .collection("services")
        .find({ provider_id: providerId })
        .project({ service_id: 1 })
        .toArray();
      const serviceIds = services.map((s) => s.service_id).filter(Boolean);
      filter.service_id = serviceIds.length ? { $in: serviceIds } : "__none__";
    }

    if (search) {
      const r = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ order_id: r }, { link: r }, { user_id: r }, { user_note: r }];
    }

    const rows = await db
      .collection("orders")
      .find({
        ...filter,
        provider_order_id: { $nin: [null, ""] },
        $or: [{ provider_charge: { $exists: false } }, { provider_charge: null }, { provider_charge: "" }],
      })
      .sort({ created_at: -1 })
      .limit(maxRows)
      .toArray();

    let updated = 0;
    let failed = 0;
    for (const order of rows) {
      try {
        const provider = await loadProviderByAnyId(db, order.provider_id);
        if (!provider?.api_url || !provider?.api_key) {
          failed += 1;
          continue;
        }
        const result = await providerFetchOrderCharge({
          apiUrl: provider.api_url,
          apiKey: provider.api_key,
          providerToken: provider.api_token || provider.token || "",
          providerOrderId: order.provider_order_id,
        });
        if (!result.ok || result.provider_charge == null) {
          failed += 1;
          continue;
        }
        await db.collection("orders").updateOne(
          { order_id: order.order_id },
          { $set: { provider_charge: result.provider_charge, updated_at: new Date().toISOString() } }
        );
        updated += 1;
      } catch (_) {
        failed += 1;
      }
    }

    if (updated > 0) invalidateAllOrderLists();
    return res.json({
      success: true,
      attempted: rows.length,
      updated,
      failed,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
