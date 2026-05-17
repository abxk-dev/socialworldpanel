const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')
const getUserId = require('../getUserId')

// Minimal compatibility layer for UPI.
// Routes expect these named exports:
// - getUpiPaymentSettings
// - submitUpiDeposit
// - getUpiHistory
// Plus admin helper exports (kept as safe no-ops).

async function getUpiPaymentSettings(req, res) {
  try {
    const db = await getDb()

    const settings = await db.collection("admin_settings").findOne({
      panel_name: { $exists: true },
    })

    const upiSettings = settings?.paytm_upi || {}

    res.json({
      success: true,
      enabled: upiSettings.enabled || false,
      display_name: upiSettings.display_name || "Paytm UPI",
      upi_id: upiSettings.upi_id || "",
      qr_code_url: upiSettings.qr_code_url || "",
      min_deposit_inr: upiSettings.min_deposit_inr || 10,
      max_deposit_inr: upiSettings.max_deposit_inr || 0,
      usd_to_inr_rate: upiSettings.usd_to_inr_rate || 95,
      merchant_mid: upiSettings.merchant_mid || "",
      instructions: upiSettings.instructions || "",
      new_users_allowed: upiSettings.new_users_allowed !== false,
      charge_fee: upiSettings.charge_fee || false,
      fee_percent: upiSettings.fee_percent || 0,
      amount_tolerance_inr: upiSettings.amount_tolerance_inr || 0,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const submitUpiDeposit = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    const order_id = req.body?.order_id
    const amount_inr = req.body?.amount_inr
    const amount = Number(amount_inr)

    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    if (!order_id || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid order_id or amount_inr' })
    }

    const user = await db.collection('users').findOne({ user_id: userId }).catch(() => null)
    const deposit = {
      user_id: userId,
      username: user?.username || '',
      email: user?.email || null,
      amount,
      amount_inr: amount,
      order_id: String(order_id),
      status: 'pending',
      payment_type: 'upi',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const result = await db.collection('deposits').insertOne(deposit)
    await db.collection('users').updateOne(
      { user_id: userId },
      { $inc: { balance: amount } }
    ).catch(() => {})

    res.json({
      success: true,
      message: 'Balance added!',
      deposit_id: result.insertedId,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getUpiHistory = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20))
    const skip = (page - 1) * limit

    const filter = { user_id: userId, payment_type: 'upi' }
    const total = await db.collection('deposits').countDocuments(filter)
    const pages = Math.max(1, Math.ceil(total / limit))

    const deposits = await db.collection('deposits')
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    res.json({ success: true, deposits, transactions: deposits, total, page, pages })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Admin helpers (safe no-ops)
async function adminGetDeposits(req, res) {
  return res.json({ deposits: [] })
}

async function adminSaveUpiSettings(req, res) {
  try {
    const db = await getDb()
    const payload = req.body && typeof req.body === "object" ? req.body : {}

    await db.collection("admin_settings").updateOne(
      { panel_name: { $exists: true } },
      { $set: { paytm_upi: payload } },
      { upsert: true }
    )

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function adminGetUpiSettings(req, res) {
  try {
    const db = await getDb()

    const settings = await db.collection("admin_settings").findOne({
      panel_name: { $exists: true },
    })

    const upiSettings = settings?.paytm_upi || {}

    res.json({
      success: true,
      enabled: upiSettings.enabled || false,
      display_name: upiSettings.display_name || "Paytm UPI",
      upi_id: upiSettings.upi_id || "",
      qr_code_url: upiSettings.qr_code_url || "",
      min_deposit_inr: upiSettings.min_deposit_inr || 10,
      max_deposit_inr: upiSettings.max_deposit_inr || 0,
      usd_to_inr_rate: upiSettings.usd_to_inr_rate || 95,
      merchant_mid: upiSettings.merchant_mid || "",
      instructions: upiSettings.instructions || "",
      new_users_allowed: upiSettings.new_users_allowed !== false,
      charge_fee: upiSettings.charge_fee || false,
      fee_percent: upiSettings.fee_percent || 0,
      amount_tolerance_inr: upiSettings.amount_tolerance_inr || 0,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = {
  getUpiPaymentSettings,
  submitUpiDeposit,
  getUpiHistory,
  adminGetDeposits,
  adminSaveUpiSettings,
  adminGetUpiSettings,
}

