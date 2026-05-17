const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')

// Public routes (see routes/payment.js)
const getCryptomusSettings = async (req, res) => {
  try {
    const db = await getDb()
    const settings = await db.collection("admin_settings").findOne({
      panel_name: { $exists: true },
    })

    const cryptoSettings = settings?.cryptomus || {}

    // Return public settings only (no api_key).
    res.json({
      success: true,
      enabled: cryptoSettings.enabled || false,
      display_name: cryptoSettings.display_name || "Crypto",
      min_deposit_usd: cryptoSettings.min_deposit_usd ?? 5,
      max_deposit_usd: cryptoSettings.max_deposit_usd ?? 50000,
      supported_currencies: cryptoSettings.supported_currencies || ["USDT"],
      merchant_id: cryptoSettings.merchant_id || "",
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const createCryptomusInvoice = async (req, res) => {
  res.json({ success: false, error: 'Crypto payments not configured' })
}

const cryptomusWebhook = async (req, res) => {
  // Acknowledge webhook (stub).
  res.json({ success: true })
}

const getUserCryptoDeposits = async (req, res) => {
  const db = await getDb()
  const userId = req.user?._id
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const deposits = await db.collection('deposits')
    .find({ user_id: new ObjectId(userId), payment_type: 'cryptomus' })
    .sort({ created_at: -1 })
    .limit(50)
    .toArray()

  res.json({ success: true, deposits })
}

const adminGetCryptoSettings = async (req, res) => {
  return getCryptomusSettings(req, res)
}

const adminSaveCryptoSettings = async (req, res) => {
  try {
    const db = await getDb()
    const payload = req.body && typeof req.body === "object" ? req.body : {}

    await db.collection("admin_settings").updateOne(
      { panel_name: { $exists: true } },
      { $set: { cryptomus: payload } },
      { upsert: true }
    )

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const adminGetCryptoDeposits = async (req, res) => {
  const db = await getDb()
  const limit = Math.max(1, Math.min(200, parseInt(req.query?.limit, 10) || 50))

  const deposits = await db.collection("deposits")
    .find({ payment_type: "cryptomus" })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray()

  res.json({ success: true, deposits, total: deposits.length })
}

// Backward compat aliases (older stub names)
const createCryptoPayment = createCryptomusInvoice
const cryptoWebhook = cryptomusWebhook

module.exports = {
  getCryptomusSettings,
  createCryptomusInvoice,
  cryptomusWebhook,
  getUserCryptoDeposits,

  // Admin settings + deposits
  adminGetCryptoSettings,
  adminSaveCryptoSettings,
  adminGetCryptoDeposits,

  // backward compat
  createCryptoPayment,
  cryptoWebhook,
}

