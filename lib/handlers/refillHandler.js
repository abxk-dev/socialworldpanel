const { getDb } = require('./_db')
const getUserId = require('../getUserId')
const { executeOrderRefill } = require('../orders/refillExecute')

const getUserRefills = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 20
  const skip = (page - 1) * limit

  const filter = { user_id: userId }

  const total = await db.collection('refill_requests').countDocuments(filter)
  const refills = await db.collection('refill_requests')
    .find(filter)
    .sort({ created_at: -1, updated_at: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()

  res.json({
    success: true,
    refills,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  })
}

const requestRefill = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.params
  const result = await executeOrderRefill(db, {
    panelOrderId: id,
    requesterUserId: userId,
    allowAdmin: false,
  })
  return res.status(result.httpStatus).json(result.body)
}

// Admin endpoints expected by `routes/admin.js`.
const adminListRefills = async (req, res) => {
  try {
    const db = await getDb()
    const page = parseInt(req.query?.page, 10) || 1
    const limit = parseInt(req.query?.limit, 10) || 50
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query?.status && req.query?.status !== 'all') {
      filter.status = req.query.status
    }
    if (req.query?.search) {
      const s = String(req.query.search).trim()
      filter.$or = [{ order_id: s }, { provider_refill_id: s }, { user_id: s }]
    }

    const total = await db.collection('refill_requests').countDocuments(filter)
    const refills = await db.collection('refill_requests')
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    res.json({
      success: true,
      refills,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const adminRetryRefill = async (req, res) => {
  try {
    const db = await getDb()
    const { refillId } = req.params
    if (!refillId) return res.status(400).json({ error: 'refillId missing' })

    // Support either refill request _id or an order_id string.
    const { ObjectId } = require('mongodb')
    let updated = false
    try {
      const oid = new ObjectId(refillId)
      const r = await db.collection('refill_requests').updateOne(
        { _id: oid },
        { $set: { status: 'pending', updated_at: new Date() } }
      )
      updated = (r?.matchedCount || 0) > 0
    } catch (_) {}

    if (!updated) {
      await db.collection('refill_requests').updateOne(
        { order_id: refillId },
        { $set: { status: 'pending', updated_at: new Date() } }
      )
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = {
  getUserRefills,
  requestRefill,
  adminListRefills,
  adminRetryRefill,
}

