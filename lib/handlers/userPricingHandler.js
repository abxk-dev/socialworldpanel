const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')
const getUserId = require('../getUserId')

function toInt(v, fallback = 0) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

function computeFinalPrice({ originalPrice, pricing_type, pricing_value }) {
  const pv = Number(pricing_value || 0)
  const op = Number(originalPrice || 0)
  if (pricing_type === 'percentage') return op * (1 - pv / 100)
  if (pricing_type === 'fixed') return pv
  if (pricing_type === 'discount') return op - pv
  // Fallback
  return op
}

function safeObjectId(maybeId) {
  try {
    return new ObjectId(maybeId)
  } catch {
    return null
  }
}

const getMyPricing = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const pricing = await db.collection('user_custom_pricing')
    .find({ user_id: userId, is_active: true })
    .toArray()

  // Frontend expects either `data` or a top-level array. Provide both.
  res.json({ success: true, pricing, data: pricing })
}

// Admin list endpoint
const adminListUserPricing = async (req, res) => {
  const db = await getDb()
  const page = Math.max(1, toInt(req.query.page, 1))
  const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 20)))
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    db.collection('user_custom_pricing')
      .find({})
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('user_custom_pricing').countDocuments({}),
  ])

  res.json({ success: true, data: items, items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
}

const adminGetUserPricing = async (req, res) => {
  const db = await getDb()
  const { id } = req.params

  const pricing = await db.collection('user_custom_pricing')
    .findOne({ _id: safeObjectId(id) || id })

  if (!pricing) return res.status(404).json({ error: 'Pricing not found' })
  res.json({ success: true, pricing })
}

const adminSetUserPricing = async (req, res) => {
  const db = await getDb()
  const {
    username,
    user_id,
    service_id,
    service_name,
    pricing_type,
    pricing_value,
    note,
    allow_promo_stack,
    is_active,
  } = req.body || {}

  if (!service_id || !pricing_type) {
    return res.status(400).json({ error: 'service_id and pricing_type required' })
  }

  let userDoc = null
  let resolvedUserId = user_id
  if (username && !resolvedUserId) {
    userDoc = await db.collection('users').findOne({ username })
    resolvedUserId = userDoc?._id
  }
  if (!resolvedUserId && userDoc?._id) resolvedUserId = userDoc._id
  if (!resolvedUserId) return res.status(400).json({ error: 'User not found/invalid' })

  const service = await db.collection('services').findOne({ _id: safeObjectId(service_id) || service_id }).catch(() => null)
  const originalPrice = Number(service?.rate ?? service?.price_per_1000 ?? service?.price ?? 0)
  const final_price = Math.max(0, computeFinalPrice({ originalPrice, pricing_type, pricing_value }))

  const doc = {
    user_id: safeObjectId(resolvedUserId) || resolvedUserId,
    username: username || userDoc?.username || '',
    user_email: userDoc?.email || null,

    service_id: safeObjectId(service_id) || service_id,
    service_name: service_name || service?.name || service?.service_name || '',

    pricing_type,
    pricing_value: Number(pricing_value || 0),
    note: note || '',
    allow_promo_stack: !!allow_promo_stack,
    is_active: is_active !== false,

    original_price: originalPrice,
    final_price,
    created_at: new Date(),
    updated_at: new Date(),
  }

  // Upsert by (user_id, service_id)
  await db.collection('user_custom_pricing').updateOne(
    { user_id: doc.user_id, service_id: doc.service_id },
    { $set: doc },
    { upsert: true }
  )

  res.json({ success: true, pricing: doc })
}

const adminUpdateUserPricing = async (req, res) => {
  const db = await getDb()
  const { id } = req.params

  await db.collection('user_custom_pricing').updateOne(
    { _id: safeObjectId(id) || id },
    { $set: { ...req.body, updated_at: new Date() } }
  )

  res.json({ success: true })
}

const adminDeleteUserPricing = async (req, res) => {
  const db = await getDb()
  const { id } = req.params

  await db.collection('user_custom_pricing').deleteOne({ _id: safeObjectId(id) || id })
  res.json({ success: true })
}

const adminToggleUserPricing = async (req, res) => {
  const db = await getDb()
  const { id } = req.params

  const pricing = await db.collection('user_custom_pricing').findOne({ _id: safeObjectId(id) || id })
  if (!pricing) return res.status(404).json({ error: 'Not found' })

  const next = pricing.is_active === false ? true : false
  await db.collection('user_custom_pricing').updateOne(
    { _id: safeObjectId(id) || id },
    { $set: { is_active: next, updated_at: new Date() } }
  )

  res.json({ success: true, is_active: next })
}

const adminGetPricingsByUsername = async (req, res) => {
  const db = await getDb()
  const { username } = req.params

  const user = await db.collection('users').findOne({ username })
  if (!user) return res.status(404).json({ error: 'User not found' })

  const pricing = await db.collection('user_custom_pricing')
    .find({ user_id: user._id })
    .toArray()

  res.json({ success: true, pricing, user })
}

const adminGetPricingsByService = async (req, res) => {
  const db = await getDb()
  const { service_id } = req.params

  const pricing = await db.collection('user_custom_pricing')
    .find({ service_id: safeObjectId(service_id) || service_id })
    .toArray()

  res.json({ success: true, pricing })
}

// Backward compat
const getUserPricing = getMyPricing
const adminGetUserPricingLegacy = adminGetUserPricing
const adminSetUserPricingLegacy = adminSetUserPricing

module.exports = {
  getMyPricing,
  adminSetUserPricing,
  adminListUserPricing,
  adminGetUserPricing,
  adminUpdateUserPricing,
  adminDeleteUserPricing,
  adminToggleUserPricing,
  adminGetPricingsByUsername,
  adminGetPricingsByService,

  // Backward compat exports
  getUserPricing,
  adminGetUserPricing: adminGetUserPricingLegacy,
  adminSetUserPricing: adminSetUserPricingLegacy,
}

