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

/** BSON-safe: Decimal128 / Int32 / strings must not become NaN (JSON turns NaN into null). */
function readFiniteNumber(v) {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const t = v.trim()
    if (t === '') return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }
  if (typeof v === 'object' && v != null) {
    try {
      if (typeof v.valueOf === 'function') {
        const prim = v.valueOf()
        if (typeof prim === 'number' && Number.isFinite(prim)) return prim
        if (typeof prim === 'string') {
          const n = Number(prim.trim())
          if (Number.isFinite(n)) return n
        }
      }
      if (typeof v.toString === 'function') {
        const n = Number(String(v.toString()).trim())
        if (Number.isFinite(n)) return n
      }
    } catch (_) {}
  }
  return null
}

async function loadManualQrSettingsObject(db) {
  const latest = await db.collection('admin_settings').findOne({}, { sort: { updated_at: -1, _id: -1 } }).catch(() => null)
  let block = latest?.manual_qr
  if (block && typeof block === 'object' && Object.keys(block).length > 0) return block
  const panel = await db.collection('admin_settings').findOne({ panel_name: { $exists: true } }).catch(() => null)
  block = panel?.manual_qr
  return block && typeof block === 'object' ? block : {}
}

const getManualQrSettings = async (req, res) => {
  const db = await getDb()
  const manualSettings = await loadManualQrSettingsObject(db)
  let rate = readFiniteNumber(manualSettings.usd_to_inr_rate) ?? readFiniteNumber(manualSettings.inr_per_usd) ?? 93
  if (!(rate > 0)) rate = 93

  const rawMinInr = readFiniteNumber(manualSettings.min_deposit_inr)
  const rawMaxInr = readFiniteNumber(manualSettings.max_deposit_inr)
  const usdMin = readFiniteNumber(manualSettings.min_deposit_usd)
  const usdMax = readFiniteNumber(manualSettings.max_deposit_usd)

  const legacyMinInr = Math.max(1, Math.round((usdMin != null && usdMin > 0 ? usdMin : 1) * rate))
  const legacyMaxInr = Math.max(legacyMinInr, Math.round((usdMax != null && usdMax > 0 ? usdMax : 10000) * rate))

  const min_deposit_inr = rawMinInr != null && rawMinInr > 0 ? rawMinInr : legacyMinInr
  const max_deposit_inr =
    rawMaxInr != null && rawMaxInr >= min_deposit_inr ? rawMaxInr : legacyMaxInr

  // Manual QR is INR-only; min_deposit_usd/max_deposit_usd kept for legacy admin docs only
  res.json({
    success: true,
    enabled: manualSettings.enabled ?? false,
    display_name: manualSettings.display_name || 'Manual QR',
    qr_code_url: manualSettings.qr_code_url || '',
    min_deposit_inr,
    max_deposit_inr,
    min_deposit_usd: manualSettings.min_deposit_usd ?? 1,
    max_deposit_usd: manualSettings.max_deposit_usd ?? 10000,
    /** INR per 1 USD — used to credit panel balance (USD) on approval */
    usd_to_inr_rate: rate,
    instructions: manualSettings.instructions || '',
  })
}

const createManualDeposit = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    const amount_currency = String(req.body?.amount_currency || 'INR').toUpperCase()
    const amount_inr = req.body?.amount_inr

    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    if (amount_currency !== 'INR') {
      return res.status(400).json({ error: 'Manual QR deposits only accept INR' })
    }

    const amount = Number(amount_inr)
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    const user = await db.collection('users').findOne({ user_id: userId })
    const deposit = {
      user_id: userId,
      user_email: user?.email || null,
      amount_currency: 'INR',
      amount_inr: amount,
      amount_usd: null,
      amount: amount,
      status: 'pending',
      payment_type: 'manual_qr',
      screenshot_base64: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const result = await db.collection('deposits').insertOne(deposit)
    res.json({ success: true, deposit_id: result.insertedId, message: 'Manual QR request created' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const submitManualDeposit = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)

  const deposit_id = req.body?.deposit_id
  const screenshot_base64 = req.body?.screenshot_base64

  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  if (!deposit_id) return res.status(400).json({ error: 'deposit_id is required' })
  if (!screenshot_base64) return res.status(400).json({ error: 'screenshot_base64 is required' })
  const oid = toObjectId(deposit_id)
  if (!oid) return res.status(400).json({ error: 'Invalid deposit_id' })

  const out = await db.collection('deposits').updateOne(
    { _id: oid, user_id: userId, payment_type: 'manual_qr' },
    {
      $set: {
        screenshot_base64,
        status: 'pending',
        updated_at: new Date().toISOString(),
      },
    }
  )
  if (!out?.matchedCount) {
    return res.status(404).json({ error: 'Deposit not found for this user' })
  }

  res.json({ success: true, message: 'Payment submitted. Waiting for admin approval.' })
}

const getManualHistory = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)

  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20))
  const skip = (page - 1) * limit

  const filter = { user_id: userId, payment_type: 'manual_qr' }
  const total = await db.collection('deposits').countDocuments(filter)
  const pages = Math.max(1, Math.ceil(total / limit))

  const deposits = await db.collection('deposits')
    .find(filter)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()

  res.json({ success: true, deposits, total, page, pages })
}

module.exports = {
  getManualQrSettings,
  createManualDeposit,
  submitManualDeposit,
  getManualHistory,

  // Admin payment settings + deposits
  adminGetManualSettings: getManualQrSettings,
  adminSaveManualSettings: async (req, res) => {
    const db = await getDb()
    const raw = req.body && typeof req.body === 'object' ? req.body : {}
    const payload = { ...raw }
    delete payload.success
    for (const k of ['min_deposit_inr', 'max_deposit_inr']) {
      if (payload[k] !== undefined && payload[k] !== null && payload[k] !== '') {
        const n = readFiniteNumber(payload[k])
        if (n != null) payload[k] = n
      }
    }
    const now = new Date().toISOString()
    const latest = await db.collection('admin_settings').findOne({}, { sort: { updated_at: -1, _id: -1 } }).catch(() => null)
    const prev = latest?.manual_qr && typeof latest.manual_qr === 'object' ? latest.manual_qr : {}
    const merged = { ...prev, ...payload }
    if (latest?._id) {
      await db.collection('admin_settings').updateOne(
        { _id: latest._id },
        { $set: { manual_qr: merged, updated_at: now } }
      )
    } else {
      await db.collection('admin_settings').insertOne({
        panel_name: 'Social World Panel',
        manual_qr: merged,
        updated_at: now,
      })
    }
    res.json({ success: true })
  },

  adminGetManualDeposits: async (req, res) => {
    const db = await getDb()
    const limit = Math.max(1, Math.min(200, parseInt(req.query?.limit, 10) || 50))
    const deposits = await db.collection('deposits')
      .find({ payment_type: { $in: ['manual_qr', 'manual', 'manual_qr_payment'] } })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray()
    res.json({ success: true, deposits })
  },

  adminGetManualScreenshot: async (req, res) => {
    const db = await getDb()
    const { id } = req.params
    const oid = toObjectId(id)
    if (!oid) return res.status(400).json({ error: 'Invalid id' })
    const deposit = await db.collection('deposits').findOne({ _id: oid })
    const screenshot = deposit?.screenshot_base64 || null
    return sendDepositScreenshot(res, screenshot)
  },

  adminApproveManual: async (req, res) => {
    const db = await getDb()
    const { deposit_id } = req.body || {}
    if (!deposit_id) return res.status(400).json({ error: 'deposit_id is required' })
    const deposit = await db.collection('deposits')
      .findOne({ _id: new ObjectId(deposit_id), payment_type: 'manual_qr' })
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' })

    const st = String(deposit.status || '').toLowerCase()
    if (st === 'completed' || st === 'success') {
      return res.status(400).json({ error: 'Deposit already completed' })
    }

    const manualSettings = await loadManualQrSettingsObject(db)
    let rate = readFiniteNumber(manualSettings.usd_to_inr_rate) ?? readFiniteNumber(manualSettings.inr_per_usd) ?? 93
    if (!(rate > 0)) rate = 93

    const amountInr =
      readFiniteNumber(deposit.amount_inr) ??
      readFiniteNumber(deposit.amount) ??
      0
    if (!(amountInr > 0)) {
      return res.status(400).json({ error: 'Invalid INR amount on deposit' })
    }

    const amountUsd = Math.round((amountInr / rate) * 10000) / 10000
    const now = new Date().toISOString()

    await db.collection('deposits').updateOne(
      { _id: new ObjectId(deposit_id) },
      {
        $set: {
          status: 'completed',
          amount_currency: 'INR',
          amount_inr: amountInr,
          amount_usd: amountUsd,
          amount_credited_usd: amountUsd,
          usd_to_inr_rate_used: rate,
          updated_at: now,
        },
      }
    )
    if (amountUsd > 0 && deposit.user_id) {
      await db.collection('users').updateOne(
        { user_id: deposit.user_id },
        { $inc: { balance: amountUsd }, $set: { updated_at: now } }
      ).catch(() => {})
    }
    res.json({ success: true, amount_usd: amountUsd, amount_inr: amountInr, usd_to_inr_rate_used: rate })
  },

  adminRejectManual: async (req, res) => {
    const db = await getDb()
    const { deposit_id } = req.body || {}
    if (!deposit_id) return res.status(400).json({ error: 'deposit_id is required' })
    await db.collection('deposits').updateOne(
      { _id: new ObjectId(deposit_id), payment_type: 'manual_qr' },
      { $set: { status: 'rejected', updated_at: new Date().toISOString() } }
    )
    res.json({ success: true })
  },
}

