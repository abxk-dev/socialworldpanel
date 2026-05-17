const { ObjectId } = require("mongodb");
const { getDb } = require("../_db");
const getUserId = require("../../getUserId");
const {
  normalizeAdminServiceId,
  serviceByConfiguredIdQuery,
} = require("../../serviceIdHelpers");
const {
  loadProviderForService,
  resolveProviderServiceId,
  providerAddOrder,
} = require("../../providerSmmApi");
const { invalidateAllOrderLists } = require("../../cache/orderListCache");

function generateNumericOrderId() {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1000);
  return String(ts * 1000 + rand);
}

module.exports = async (req, res) => {
  const db = await getDb();
  const userId = getUserId(req);
  const link = req.body?.link;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!link || !String(link).trim()) return res.status(400).json({ error: "Link required" });

  const user = await db.collection("users").findOne({ user_id: userId });
  if (user?.free_trial_used) {
    return res.status(400).json({ error: "Already used" });
  }

  const settings =
    (await db
      .collection("admin_settings")
      .findOne({ panel_name: { $exists: true } }, { projection: { _id: 0 } })
      .catch(() => null)) || {};

  if (settings.free_trial_enabled !== true) {
    return res.status(400).json({ error: "Free trial is not enabled" });
  }

  const configuredId = normalizeAdminServiceId(settings.free_trial_service_id);
  if (!configuredId) {
    return res.status(400).json({
      error: "Free trial service is not configured. Set the service ID in Admin → Settings → Free Trial.",
    });
  }

  const q = serviceByConfiguredIdQuery(configuredId);
  const trialService = q ? await db.collection("services").findOne(q) : null;

  if (!trialService) {
    return res.status(404).json({
      error: `No active service found for ID "${configuredId}". Check the service ID in admin settings.`,
    });
  }

  const qtySetting = Math.max(1, parseInt(settings.free_trial_quantity, 10) || 50);
  const min = parseInt(trialService.min_order ?? trialService.min ?? 1, 10) || 1;
  const max = parseInt(trialService.max_order ?? trialService.max ?? 1000000, 10) || 1000000;
  let quantity = qtySetting;
  if (quantity < min) quantity = min;
  if (quantity > max) quantity = max;

  const linkStr = String(link).trim();
  const order_id = generateNumericOrderId();

  let category = null;
  if (trialService?.category_id) {
    const categoryId = String(trialService.category_id);
    const categoryFilter = [{ category_id: categoryId }];
    if (ObjectId.isValid(categoryId)) {
      try {
        categoryFilter.push({ _id: new ObjectId(categoryId) });
      } catch (_) {}
    }
    category = await db.collection("categories").findOne({ $or: categoryFilter });
  }

  const rate = parseFloat(trialService.rate ?? trialService.price ?? 0);
  const serviceIdStored = trialService.service_id ?? configuredId;

  const provider_id_val =
    trialService.provider_id != null && trialService.provider_id !== ""
      ? String(trialService.provider_id)
      : null;

  const provider = await loadProviderForService(db, trialService);
  const psid = resolveProviderServiceId(trialService);

  let provider_order_id = null;
  let provider_charge = null;
  let status = "pending_manual";
  let mode = "Manual";

  // User pays $0 — do not block API send with "provider cost > user charge" (that would skip every free order).
  if (provider?.api_url && provider?.api_key && psid) {
    const pr = await providerAddOrder({
      apiUrl: provider.api_url,
      apiKey: provider.api_key,
      providerToken: provider.api_token || provider.token || "",
      providerServiceId: psid,
      link: linkStr,
      quantity,
    });
    console.log("[free-trial] provider add (trunc)", JSON.stringify(pr.raw || {}).slice(0, 1200));
    if (!pr.ok) {
      return res.status(502).json({
        error: pr.error || "Provider could not start this free trial order",
        details: pr.raw,
      });
    }
    provider_order_id = pr.provider_order_id;
    provider_charge = pr.provider_charge;
    status = "in_progress";
    mode = "Auto";
  } else if (provider && !psid) {
    console.warn(
      "[free-trial] provider linked but service missing provider_service_id:",
      trialService.service_id
    );
  }

  const order = {
    user_id: userId,
    order_id,
    service_id: serviceIdStored,
    service_name: trialService.name || trialService.service_name || "Free trial",
    category_id: trialService.category_id ? String(trialService.category_id) : null,
    category: category?.name ?? trialService.category_name ?? trialService.category ?? null,
    link: linkStr,
    quantity,
    charge: 0,
    price: 0,
    rate,
    start_count: 0,
    remains: quantity,
    is_free_trial: true,
    status,
    mode,
    provider_id: provider_id_val,
    provider_order_id,
    provider_charge,
    needs_price_approval: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db.collection("orders").insertOne(order);

  await db.collection("users").updateOne(
    { user_id: userId },
    { $set: { free_trial_used: true, free_trial_used_at: new Date().toISOString() } }
  );

  invalidateAllOrderLists();

  res.json({
    success: true,
    order_id,
    message:
      status === "in_progress"
        ? "Free trial started — your order was sent to the provider."
        : "Free trial claimed — an admin will process your order shortly.",
  });
};
