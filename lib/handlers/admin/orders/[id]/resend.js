const { getDb } = require("../../../_db");
const { ObjectId } = require("mongodb");
const { providerAddOrder } = require("../../../../providerSmmApi");
const { fetchProviderServices } = require("../../importServices");
const { invalidateAllOrderLists } = require("../../../../cache/orderListCache");

async function loadProvider(db, providerId) {
  const sid = String(providerId || "").trim();
  if (!sid) return null;
  const or = [{ provider_id: sid }, { _id: sid }];
  if (ObjectId.isValid(sid)) {
    try { or.push({ _id: new ObjectId(sid) }); } catch (_) {}
  }
  return db.collection("providers").findOne({ $or: or });
}

async function resolveResendTarget(db, order, body) {
  const mode = String(body.resend_mode || "").trim();
  const useAttached = body.use_attached_service_mapping === true || mode === "attached";
  if (!useAttached) {
    return {
      selectedProviderId: String(body.provider_id || order.provider_id || "").trim(),
      selectedApiServiceId: String(body.api_service_id || "").trim(),
    };
  }

  const orderSid = String(order.service_id || "").trim();
  if (!orderSid) {
    return { selectedProviderId: "", selectedApiServiceId: "", attachedError: "Order has no service_id" };
  }
  const service = await db.collection("services").findOne({
    $or: [{ service_id: orderSid }, { _id: orderSid }],
  });
  if (!service) {
    return { selectedProviderId: "", selectedApiServiceId: "", attachedError: "Service mapping not found for this order" };
  }
  const selectedProviderId = String(service.provider_id || "").trim();
  const selectedApiServiceId = String(
    service.provider_service_id ??
      service.api_service_id ??
      service.api_service ??
      service.smm_service_id ??
      ""
  ).trim();
  if (!selectedProviderId || !selectedApiServiceId) {
    return {
      selectedProviderId: "",
      selectedApiServiceId: "",
      attachedError: "Attached service has no provider_id or provider service id",
    };
  }
  return { selectedProviderId, selectedApiServiceId };
}

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.json({ success: true });

    const { id } = req.params;
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const order = await db.collection("orders").findOne({ order_id: id });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const target = await resolveResendTarget(db, order, body);
    const selectedProviderId = target.selectedProviderId;
    const selectedApiServiceId = target.selectedApiServiceId;
    if (target.attachedError) {
      return res.status(400).json({ success: false, error: target.attachedError });
    }

    // Restriction: once already sent to provider, explicit approval is required to resend.
    const forceApprove = !!body.force_approval;
    if (order.provider_order_id && !forceApprove) {
      return res.status(409).json({
        success: false,
        requires_approval: true,
        error: "Order already sent to provider. Check approval to resend.",
      });
    }

    if (selectedProviderId && selectedApiServiceId) {
      const provider = await loadProvider(db, selectedProviderId);
      if (!provider) {
        return res.status(400).json({ success: false, error: "Selected provider not found" });
      }
      if (!provider.api_url || !provider.api_key) {
        return res.status(400).json({ success: false, error: "Selected provider API config missing" });
      }
      const userCharge = Number(order.charge ?? order.price ?? 0);
      let estimatedProviderCharge = null;
      try {
        const services = await fetchProviderServices(
          provider.api_url,
          provider.api_key,
          provider.api_token || provider.token || ""
        );
        const svc = Array.isArray(services)
          ? services.find((x) => String(x?.service ?? x?.service_id ?? x?.id ?? "") === selectedApiServiceId)
          : null;
        const rate = Number(svc?.rate);
        if (Number.isFinite(rate) && Number.isFinite(Number(order.quantity))) {
          estimatedProviderCharge = Number(((rate / 1000) * Number(order.quantity)).toFixed(5));
        }
      } catch (_) {}
      if (
        estimatedProviderCharge != null &&
        Number.isFinite(userCharge) &&
        estimatedProviderCharge > userCharge &&
        !forceApprove
      ) {
        await db.collection("orders").updateOne(
          { order_id: id },
          {
            $set: {
              status: "pending_manual",
              mode: "Manual",
              needs_price_approval: true,
              provider_id: String(provider.provider_id || provider._id),
              provider_service_id: selectedApiServiceId,
              provider_charge: estimatedProviderCharge,
              updated_at: new Date().toISOString(),
            },
          }
        );
        return res.status(409).json({
          success: false,
          requires_approval: true,
          error: "Provider charge is higher than user charge. Waiting for admin approval.",
          user_charge: userCharge,
          provider_charge: estimatedProviderCharge,
        });
      }

      const addResult = await providerAddOrder({
        apiUrl: provider.api_url,
        apiKey: provider.api_key,
        providerToken: provider.api_token || provider.token || "",
        providerServiceId: selectedApiServiceId,
        link: order.link,
        quantity: order.quantity,
      });
      if (!addResult.ok) {
        return res.status(502).json({
          success: false,
          error: addResult.error || "Provider resend failed",
          provider_response: addResult.raw,
        });
      }

      await db.collection("orders").updateOne(
        { order_id: id },
        {
          $set: {
            status: "pending",
            provider_id: String(provider.provider_id || provider._id),
            provider_order_id: addResult.provider_order_id || order.provider_order_id || null,
            provider_charge: addResult.provider_charge ?? order.provider_charge ?? null,
            provider_service_id: selectedApiServiceId,
            needs_price_approval: false,
            updated_at: new Date().toISOString(),
          },
        }
      );
      invalidateAllOrderLists();
      return res.json({
        success: true,
        message: "Order resent to selected provider",
        provider_order_id: addResult.provider_order_id || null,
      });
    }

    return res.status(400).json({
      success: false,
      error: "Provider/API service id is required to resend order",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

