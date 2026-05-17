/**
 * Shared order placement for HTTP handler and background jobs (drip campaigns).
 * Returns a result object instead of sending Express responses.
 */
const { ObjectId } = require("mongodb");
const {
  loadProviderForService,
  resolveProviderServiceId,
  providerAddOrder,
} = require("./providerSmmApi");
const { evaluatePromoCode } = require("./handlers/promocodeHandler");
const { spinFreeViewsServiceAllowed, parseSpinServiceIdList } = require("./serviceIdHelpers");
const { invalidateAllOrderLists } = require("./cache/orderListCache");

function generateNumericOrderId() {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1000);
  return String(ts * 1000 + rand);
}

function formatUserOrderRow(order, nameByServiceId, metaByServiceId) {
  const sid = order.service_id != null ? String(order.service_id) : "";
  const storedServiceName =
    order.service_name != null ? String(order.service_name).trim() : "";
  const lookedUpServiceName = sid ? nameByServiceId[sid] : null;
  const shouldOverrideStoredName =
    !storedServiceName ||
    storedServiceName === sid ||
    storedServiceName.startsWith("srv_");
  const resolvedName = shouldOverrideStoredName
    ? lookedUpServiceName || storedServiceName || null
    : storedServiceName;
  const rawPc = order.provider_charge ?? order.provider_cost;
  let provider_charge = null;
  if (rawPc != null && rawPc !== "") {
    const n = Number(rawPc);
    if (Number.isFinite(n)) provider_charge = n;
  }
  const sm = sid && metaByServiceId ? metaByServiceId[sid] : null;
  const refillMeta = sm
    ? {
        supported: !!(
          sm.refill === true ||
          sm.refill_enabled === true ||
          sm.allow_refill === true ||
          sm.refill === "true"
        ),
        refill_days: sm.refill_days ?? 30,
      }
    : { supported: false, refill_days: 30 };
  return {
    ...order,
    id: order.order_id,
    user: order.user_id,
    service_name: resolvedName || sid || null,
    charge: Number(order.charge ?? order.price ?? 0),
    provider_charge,
    provider_order_id: order.provider_order_id ?? null,
    status: order.status,
    remains: order.remains ?? order.quantity ?? null,
    created_at: order.created_at,
    refill_enabled: refillMeta.supported,
    refill_days: refillMeta.refill_days,
    service_refill_supported: refillMeta.supported,
  };
}

/**
 * @param {import('mongodb').Db} db
 * @param {string} userId
 * @param {object} body - same as POST /api/orders
 * @param {{ skipPromo?: boolean, drip_campaign_id?: string }} [opts]
 */
async function placeOrderForUser(db, userId, body, opts = {}) {
  const {
    service_id,
    quantity,
    link,
    custom_comments,
    promo_code,
    use_free_views,
  } = body || {};

  if (!service_id || !quantity || !link) {
    return { ok: false, status: 400, error: "service_id, quantity and link are required" };
  }

  const rawSid = String(service_id).trim();
  const serviceOr = [{ service_id: rawSid }];
  const sidNum = Number(rawSid);
  if (Number.isFinite(sidNum)) {
    serviceOr.push({ service_id: sidNum }, { service_id: String(sidNum) });
  }
  if (ObjectId.isValid(rawSid)) {
    try {
      serviceOr.push({ _id: new ObjectId(rawSid) });
    } catch (_) {}
  }
  const service = await db.collection("services").findOne({ $or: serviceOr });
  if (!service) return { ok: false, status: 404, error: "Service not found" };

  let category = null;
  if (service?.category_id) {
    const categoryId = String(service.category_id);
    const categoryFilter = [{ category_id: categoryId }];
    if (ObjectId.isValid(categoryId)) categoryFilter.push({ _id: new ObjectId(categoryId) });
    category = await db.collection("categories").findOne({ $or: categoryFilter });
  }

  const user = await db.collection("users").findOne({ user_id: userId });
  if (!user) return { ok: false, status: 404, error: "User not found" };

  const qty = parseInt(quantity, 10);
  const min = parseInt(service.min ?? service.min_order ?? service.min_quantity ?? 0, 10);
  const max = parseInt(service.max ?? service.max_order ?? service.max_quantity ?? 1000000, 10);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, status: 400, error: "Invalid quantity" };
  }
  if (min && qty < min) {
    return { ok: false, status: 400, error: `Quantity must be at least ${min}` };
  }
  if (max && qty > max) {
    return { ok: false, status: 400, error: `Quantity must be at most ${max}` };
  }

  const rate = parseFloat(service.rate ?? service.price ?? 0);
  const cost = parseFloat(((rate / 1000) * qty).toFixed(5));

  const settings = await db
    .collection("admin_settings")
    .findOne({ panel_name: { $exists: true } }, { projection: { spin_free_views_service_id: 1 } })
    .catch(() => null);

  const spinRaw = settings?.spin_free_views_service_id;
  const spinIds = parseSpinServiceIdList(spinRaw);

  const useFree =
    use_free_views === true ||
    use_free_views === "true" ||
    use_free_views === 1 ||
    use_free_views === "1";

  let finalCost = cost;
  let usedFreeViews = false;
  let promoDoc = null;

  if (useFree) {
    const freeBal = Number(user.spin_free_views || 0);
    if (freeBal < qty) {
      return { ok: false, status: 400, error: "Not enough free views for this quantity." };
    }
    const sid = service.service_id ?? service_id;
    if (spinIds.length > 0 && !spinFreeViewsServiceAllowed(sid, spinRaw)) {
      return {
        ok: false,
        status: 400,
        error: "Free views can only be redeemed on services configured for spin rewards.",
      };
    }
    finalCost = 0;
    usedFreeViews = true;
  } else if (!opts.skipPromo && promo_code && String(promo_code).trim()) {
    const pr = await evaluatePromoCode(db, {
      userId,
      code: promo_code,
      orderAmount: cost,
      serviceIdRaw: service.service_id ?? service_id,
    });
    if (!pr.valid) {
      return { ok: false, status: 400, error: pr.message || "Invalid promo code" };
    }
    const disc = Number(pr.discount_amount || 0);
    finalCost = Math.max(0, parseFloat((cost - disc).toFixed(5)));
    if (pr.doc) promoDoc = pr.doc;
  }

  if ((user.balance ?? 0) < finalCost) {
    return {
      ok: false,
      status: 400,
      error: `Insufficient balance. Required: ₹${finalCost.toFixed(2)}, Available: ₹${(user.balance ?? 0).toFixed(2)}`,
    };
  }

  const order_id = generateNumericOrderId();
  const provider_id_val =
    service.provider_id != null && service.provider_id !== "" ? String(service.provider_id) : null;

  let provider_order_id = null;
  let provider_charge = null;

  const provider = await loadProviderForService(db, service);
  const psid = resolveProviderServiceId(service);
  const providerRate = Number(
    service.provider_rate ?? service.base_rate ?? service.original_rate ?? NaN
  );
  const estimatedProviderCharge =
    Number.isFinite(providerRate) && providerRate > 0
      ? Number(((providerRate / 1000) * qty).toFixed(5))
      : null;
  const needsPriceApprovalByEstimate =
    estimatedProviderCharge != null && estimatedProviderCharge > finalCost;
  if (provider?.api_url && provider?.api_key && psid) {
    if (!needsPriceApprovalByEstimate) {
      const pr = await providerAddOrder({
        apiUrl: provider.api_url,
        apiKey: provider.api_key,
        providerToken: provider.api_token || provider.token || "",
        providerServiceId: psid,
        link,
        quantity: qty,
      });
      if (!pr.ok) {
        return {
          ok: false,
          status: 502,
          error: pr.error || "Provider order failed",
          details: pr.raw,
        };
      }
      provider_order_id = pr.provider_order_id;
      provider_charge = pr.provider_charge;
    } else {
      provider_charge = estimatedProviderCharge;
    }
  }

  const order = {
    order_id,
    user_id: userId,
    service_id: service.service_id ?? service_id,
    service_name: service.name ?? service.service_name ?? "",
    category_id: service.category_id ? String(service.category_id) : null,
    category: category?.name ?? service.category_name ?? service.category ?? null,
    link,
    quantity: qty,
    custom_comments: custom_comments || null,
    price: finalCost,
    charge: finalCost,
    rate,
    ...(promoDoc && !usedFreeViews
      ? {
          promo_code: String(promo_code).trim().toUpperCase(),
          promo_discount: Math.round((cost - finalCost) * 10000) / 10000,
        }
      : {}),
    ...(usedFreeViews ? { paid_with_spin_free_views: true, list_price: cost } : {}),
    start_count: 0,
    remains: qty,
    status: needsPriceApprovalByEstimate ? "pending_manual" : "in_progress",
    mode: provider?.api_url && psid && !needsPriceApprovalByEstimate ? "Auto" : "Manual",
    provider_id: provider_id_val,
    provider_order_id,
    provider_charge,
    needs_price_approval: needsPriceApprovalByEstimate,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...(opts.drip_campaign_id ? { drip_campaign_id: String(opts.drip_campaign_id) } : {}),
  };

  await db.collection("orders").insertOne(order);

  const userInc = {};
  if (finalCost > 0) userInc.balance = -finalCost;
  if (usedFreeViews) userInc.spin_free_views = -qty;
  if (Object.keys(userInc).length) {
    await db.collection("users").updateOne({ user_id: userId }, { $inc: userInc });
  }

  if (promoDoc?._id && !usedFreeViews) {
    try {
      await db.collection("promocodes").updateOne(
        { _id: promoDoc._id },
        {
          $inc: { used_count: 1 },
          $push: { used_by: { user_id: userId, at: new Date().toISOString() } },
        }
      );
    } catch (e) {
      console.warn("[order] promo usage update failed", e?.message || e);
    }
  }

  invalidateAllOrderLists();

  const shaped = formatUserOrderRow(
    order,
    { [String(order.service_id)]: order.service_name },
    { [String(service.service_id ?? service_id)]: service }
  );

  return {
    ok: true,
    order_id,
    charge: finalCost,
    order,
    shaped,
    service,
    user,
  };
}

module.exports = { placeOrderForUser, formatUserOrderRow };
