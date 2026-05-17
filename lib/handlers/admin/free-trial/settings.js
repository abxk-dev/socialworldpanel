const { getDb } = require("../../_db");

function normalizeServiceId(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/^#/, "");
}

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    if (req.method === "GET") {
      const doc =
        (await db
          .collection("admin_settings")
          .findOne({ panel_name: { $exists: true } }, { projection: { _id: 0 } })
          .catch(() => null)) || {};

      return res.json({
        free_trial_enabled: doc.free_trial_enabled === true,
        free_trial_service_id: doc.free_trial_service_id ?? "",
        free_trial_quantity: Number(doc.free_trial_quantity) || 50,
        free_trial_label: doc.free_trial_label ?? "50 YouTube Views",
        free_trial_show_on_homepage: doc.free_trial_show_on_homepage !== false,
        free_trial_link_placeholder: doc.free_trial_link_placeholder ?? "Paste your link",
        free_trial_disclaimer: doc.free_trial_disclaimer ?? "One per account. Results typically in 1–6 hours.",
        free_trial_modal_title: doc.free_trial_modal_title ?? "Claim Your Free Trial",
        free_trial_button_text: doc.free_trial_button_text ?? "Claim Now — It's Free!",
      });
    }

    if (req.method === "POST") {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const sid = normalizeServiceId(body.service_id);

      const $set = {
        free_trial_enabled: !!body.enabled,
        free_trial_service_id: sid,
        free_trial_quantity: Math.max(1, parseInt(body.quantity, 10) || 50),
        free_trial_label: String(body.label ?? "").trim() || "50 YouTube Views",
        free_trial_show_on_homepage: body.show_on_homepage !== false,
        free_trial_link_placeholder: String(body.link_placeholder ?? "").trim() || "Paste your link",
        free_trial_disclaimer: String(body.disclaimer ?? "").trim(),
        free_trial_modal_title: String(body.modal_title ?? "").trim() || "Claim Your Free Trial",
        free_trial_button_text: String(body.button_text ?? "").trim() || "Claim Now — It's Free!",
        updated_at: new Date().toISOString(),
      };

      await db.collection("admin_settings").updateOne(
        { panel_name: { $exists: true } },
        { $set: $set, $setOnInsert: { panel_name: "Social World Panel" } },
        { upsert: true }
      );

      return res.json({ ok: true, success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
