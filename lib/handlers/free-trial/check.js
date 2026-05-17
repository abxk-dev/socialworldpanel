const { getDb } = require("../_db");
const getUserId = require("../../getUserId");
const {
  normalizeAdminServiceId,
  serviceByConfiguredIdQuery,
} = require("../../serviceIdHelpers");

module.exports = async (req, res) => {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const user = await db.collection("users").findOne({ user_id: userId });

  const settings =
    (await db
      .collection("admin_settings")
      .findOne({ panel_name: { $exists: true } }, { projection: { _id: 0 } })
      .catch(() => null)) || {};

  const hasUsedTrial = !!user?.free_trial_used;
  const trialOrder = hasUsedTrial
    ? await db
        .collection("orders")
        .findOne({ user_id: userId, is_free_trial: true }, { sort: { created_at: -1 } })
    : null;

  const enabled = settings.free_trial_enabled === true;
  const configuredId = normalizeAdminServiceId(settings.free_trial_service_id);
  const q = configuredId ? serviceByConfiguredIdQuery(configuredId) : null;
  const trialService = q ? await db.collection("services").findOne(q) : null;

  let reason = null;
  if (hasUsedTrial) reason = "Already used";
  else if (!enabled) reason = "disabled";
  else if (!configuredId) reason = "not_configured";
  else if (!trialService) reason = "service_missing";

  const eligible = !hasUsedTrial && enabled && !!configuredId && !!trialService;
  const quantity = Math.max(1, parseInt(settings.free_trial_quantity, 10) || 50);
  const serviceName =
    trialService?.name || trialService?.service_name || settings.free_trial_label || "Free trial";

  res.json({
    success: true,
    eligible,
    available: eligible,
    has_used: hasUsedTrial,
    reason,
    order_id: trialOrder?.order_id ?? null,
    trial_order: trialOrder,
    service_name: serviceName,
    quantity,
    link_placeholder: settings.free_trial_link_placeholder || "Paste your link",
    disclaimer: settings.free_trial_disclaimer || "One per account. Results typically in 1–6 hours.",
    modal_title: settings.free_trial_modal_title || "Claim Your Free Trial",
    button_text: settings.free_trial_button_text || "Claim Now — It's Free!",
  });
};
