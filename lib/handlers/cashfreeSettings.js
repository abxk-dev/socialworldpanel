const { getDb } = require('./_db')

async function getPublicCashfreeSettings(req, res) {
  try {
    const db = await getDb()
    const settings = await db.collection("admin_settings").findOne({
      panel_name: { $exists: true },
    })

    const cashfreeSettings = settings?.cashfree || {}

    res.json({
      success: true,
      enabled: cashfreeSettings.enabled || false,
      display_name: cashfreeSettings.display_name || "Cashfree",
      min_deposit_usd: cashfreeSettings.min_deposit_usd ?? 1,
      max_deposit_usd: cashfreeSettings.max_deposit_usd ?? 10000,
      min_deposit_inr: cashfreeSettings.min_deposit_inr ?? 100,
      max_deposit_inr: cashfreeSettings.max_deposit_inr ?? 0,
      fee_percent: cashfreeSettings.fee_percent ?? 0,
      usd_to_inr_rate: cashfreeSettings.usd_to_inr_rate ?? 95,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function adminGetCashfreeSettings(req, res) {
  return getPublicCashfreeSettings(req, res)
}

async function adminSaveCashfreeSettings(req, res) {
  try {
    const db = await getDb()
    const payload = req.body && typeof req.body === "object" ? req.body : {}

    await db.collection("admin_settings").updateOne(
      { panel_name: { $exists: true } },
      { $set: { cashfree: payload } },
      { upsert: true }
    )

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = {
  getPublicCashfreeSettings,
  adminGetCashfreeSettings,
  adminSaveCashfreeSettings,
}

