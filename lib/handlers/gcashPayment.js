const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')
const getUserId = require('../getUserId')
const { sendDepositScreenshot } = require('../sendDepositScreenshot')

const toObjectId = (value) => {
  if (!value) return null
  if (value instanceof ObjectId) return value
  const raw = typeof value === 'object'
    ? (value.$oid || value.oid || value._id || value.id || '')
    : value
  const str = String(raw || '').trim()
  if (!ObjectId.isValid(str)) return null
  return new ObjectId(str)
}

const getGcashSettings = async (req, res) => {
  try {
    const db = await getDb()
    const settings = await db.collection('admin_settings').findOne({ panel_name: { $exists: true } }).catch(() => null)
    const gcash = settings?.gcash || {}

    res.json({
      success: true,
      enabled: gcash.enabled || false,
      display_name: gcash.display_name || 'GCash',
      account_name: gcash.account_name || '',
      account_number: gcash.account_number || '',
      reference_receipt: gcash.reference_receipt || '',
      min_deposit_php: gcash.min_deposit_php ?? 100,
      max_deposit_php: gcash.max_deposit_php ?? 0,
      usd_to_php_rate: gcash.usd_to_php_rate ?? 59,
      instructions: gcash.instructions || '',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const createGcashDeposit = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const amount_php = Number(req.body?.amount_php)
    if (!Number.isFinite(amount_php) || amount_php <= 0) {
      return res.status(400).json({ error: 'Invalid amount_php' })
    }
    const result = await db.collection('deposits').insertOne({
      user_id: userId,
      amount_currency: 'PHP',
      amount_php,
      amount: amount_php,
      status: 'pending',
      payment_type: 'gcash',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.json({ success: true, deposit_id: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const submitGcashDeposit = async (req, res) => {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const deposit_id = req.body?.deposit_id
    const screenshot_base64 = req.body?.screenshot_base64
    if (!deposit_id) return res.status(400).json({ error: 'deposit_id is required' })
    if (!screenshot_base64) return res.status(400).json({ error: 'screenshot_base64 is required' })
    const oid = toObjectId(deposit_id)
    if (!oid) return res.status(400).json({ error: 'Invalid deposit_id' })

    const out = await db.collection('deposits').updateOne(
      { _id: oid, user_id: userId, payment_type: 'gcash' },
      { $set: { screenshot_base64, status: 'pending', updated_at: new Date().toISOString() } }
    )
    if (!out?.matchedCount) {
      return res.status(404).json({ error: 'Deposit not found for this user' })
    }

    res.json({ success: true, message: 'GCash submitted' })
}

// Admin settings + deposits (used by /admin/payments)
const adminGetGcashSettings = async (req, res) => getGcashSettings(req, res)

const adminSaveGcashSettings = async (req, res) => {
  try {
    const db = await getDb()
    const payload = req.body && typeof req.body === 'object' ? req.body : {}
    await db.collection('admin_settings').updateOne(
      { panel_name: { $exists: true } },
      { $set: { gcash: payload } },
      { upsert: true }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const adminGetGcashDeposits = async (req, res) => {
  const db = await getDb()
  const limit = Math.max(1, Math.min(200, parseInt(req.query?.limit, 10) || 50))
  const deposits = await db.collection('deposits')
    .find({ payment_type: { $in: ['gcash', 'gcash_payment'] } })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray()
  res.json({ success: true, deposits })
}

const adminGetGcashScreenshot = async (req, res) => {
  const db = await getDb()
  const { id } = req.params || {}
  if (!id || !ObjectId.isValid(String(id))) {
    return res.status(400).json({ error: 'Invalid id' })
  }
  const deposit = await db.collection('deposits').findOne({ _id: new ObjectId(id) }).catch(() => null)
  const screenshot = deposit?.screenshot_base64 || null
  return sendDepositScreenshot(res, screenshot)
}

const adminApproveGcash = async (req, res) => {
  const db = await getDb()
  const { deposit_id } = req.body || {}
  if (!deposit_id) return res.status(400).json({ error: 'deposit_id is required' })

  const deposit = await db.collection('deposits').findOne({
    _id: new ObjectId(deposit_id),
    payment_type: 'gcash',
  })
  if (!deposit) return res.status(404).json({ error: 'Deposit not found' })

  const amountToCredit = Number(deposit.amount_usd ?? deposit.amount_inr ?? deposit.amount ?? deposit.amount_php ?? 0)

  await db.collection('deposits').updateOne(
    { _id: new ObjectId(deposit_id) },
    { $set: { status: 'completed', updated_at: new Date() } }
  )

  if (amountToCredit > 0 && deposit.user_id) {
    await db.collection('users').updateOne(
      { user_id: deposit.user_id },
      { $inc: { balance: amountToCredit } }
    ).catch(() => {})
  }

  res.json({ success: true })
}

const adminRejectGcash = async (req, res) => {
  const db = await getDb()
  const { deposit_id } = req.body || {}
  if (!deposit_id) return res.status(400).json({ error: 'deposit_id is required' })

  await db.collection('deposits').updateOne(
    { _id: new ObjectId(deposit_id), payment_type: 'gcash' },
    { $set: { status: 'rejected', updated_at: new Date() } }
  )

  res.json({ success: true })
}

module.exports = {
  getGcashSettings,
  createGcashDeposit,
  submitGcashDeposit,
  adminGetGcashSettings,
  adminSaveGcashSettings,
  adminGetGcashDeposits,
  adminGetGcashScreenshot,
  adminApproveGcash,
  adminRejectGcash,
}

