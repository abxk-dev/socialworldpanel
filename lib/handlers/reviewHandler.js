const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')
const getUserId = require('../getUserId')

function tryServiceId(v) {
  try {
    return new ObjectId(v)
  } catch {
    return null
  }
}

function toInt(v, fallback = 0) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

function toBool(v) {
  if (v === true || v === 'true' || v === 1 || v === '1') return true
  if (v === false || v === 'false' || v === 0 || v === '0') return false
  return null
}

function normalizeSort(sort) {
  const s = String(sort || 'newest').toLowerCase()
  if (s === 'highest') return { rating: -1, created_at: -1 }
  if (s === 'lowest') return { rating: 1, created_at: -1 }
  if (s === 'speed') return { speed_rating: -1, created_at: -1 }
  if (s === 'recommend') return { would_recommend: -1, created_at: -1 }
  return { created_at: -1 }
}

async function getServiceName(db, serviceId) {
  // Best-effort: try service_id first, then _id.
  const sidObj = tryServiceId(serviceId)
  const svc = await db.collection('services').findOne({
    $or: [
      sidObj ? { _id: sidObj } : null,
      { service_id: serviceId },
    ].filter(Boolean),
  }).catch(() => null)
  return svc?.name || svc?.service_name || null
}

async function serviceReviewQuery(db, serviceId) {
  const sidObj = tryServiceId(serviceId)
  const serviceOr = [
    sidObj ? { service_id: sidObj } : null,
    { service_id: serviceId },
    // Backward-compat for older review records
    { service_name: serviceId },
  ].filter(Boolean)

  return {
    $and: [
      { $or: serviceOr },
      {
        $or: [
          { is_approved: true },
          { is_visible: true },
        ],
      },
    ],
  }
}

const getServiceReviews = async (req, res) => {
  const db = await getDb()
  const { serviceId } = req.params
  const page = Math.max(1, toInt(req.query.page, 1))
  const limit = Math.max(1, Math.min(100, toInt(req.query.limit, 10)))
  const skip = (page - 1) * limit

  const filter = await serviceReviewQuery(db, serviceId)
  const sort = normalizeSort(req.query.sort)

  const [reviews, total] = await Promise.all([
    db.collection('reviews')
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('reviews').countDocuments(filter),
  ])

  res.json({
    success: true,
    reviews,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  })
}

const getServiceReviewSummary = async (req, res) => {
  const db = await getDb()
  const { serviceId } = req.params

  const filter = await serviceReviewQuery(db, serviceId)
  const reviews = await db.collection('reviews').find(filter).toArray()

  const rating_count = reviews.length
  const rating_avg = rating_count
    ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / rating_count
    : 0

  const speed_avg = rating_count
    ? reviews.reduce((s, r) => s + Number(r.speed_rating || 0), 0) / rating_count
    : 0

  const recommendCount = reviews.reduce((s, r) => {
    const b = toBool(r.would_recommend)
    return s + (b ? 1 : 0)
  }, 0)

  const recommend_pct = rating_count ? Math.round((recommendCount / rating_count) * 100) : 0

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of reviews) {
    const star = toInt(r.rating, 0)
    if (star >= 1 && star <= 5) distribution[star]++
  }

  const service_name = (await getServiceName(db, serviceId)) || null

  res.json({
    success: true,
    service_name,
    rating_avg,
    rating_count,
    distribution,
    speed_avg,
    recommend_pct,
  })
}

const submitReview = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  const { service_id, serviceId, rating, speed_rating, would_recommend } = req.body || {}

  const sid = service_id || serviceId
  if (!sid) return res.status(400).json({ error: 'service_id is required' })

  const r = toInt(rating, 0)
  const sp = toInt(speed_rating, 0)
  if (r < 1 || r > 5) return res.status(400).json({ error: 'rating must be 1-5' })
  if (sp < 1 || sp > 5) return res.status(400).json({ error: 'speed_rating must be 1-5' })

  const would = toBool(would_recommend)
  if (would === null) return res.status(400).json({ error: 'would_recommend must be true/false' })

  const user = await db.collection('users').findOne({ user_id: userId }).catch(() => null)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const service = await db.collection('services').findOne({
    $or: [
      tryServiceId(sid) ? { _id: tryServiceId(sid) } : null,
      { service_id: sid },
    ].filter(Boolean),
  }).catch(() => null)

  const reviewDoc = {
    user_id: userId,
    user_email: user.email || user.user_email || null,
    username: user.username || user.full_name || null,
    service_id: tryServiceId(sid) || sid,
    service_name: service?.name || service?.service_name || null,
    rating: r,
    speed_rating: sp,
    would_recommend: would,
    is_approved: true, // show immediately for smoother UX
    is_visible: true,
    is_edited: false,
    created_at: new Date(),
    updated_at: new Date(),
  }

  const existed = await db.collection('reviews').findOne({
    user_id: reviewDoc.user_id,
    $or: [{ service_id: reviewDoc.service_id }, { service_id: sid }],
  })

  // Upsert by (user_id, service_id) to prevent duplicates.
  await db.collection('reviews').updateOne(
    {
      user_id: reviewDoc.user_id,
      $or: [
        { service_id: reviewDoc.service_id },
        // Back-compat: if service_id is stored as string
        { service_id: sid },
      ],
    },
    { $set: reviewDoc },
    { upsert: true }
  )

  if (!existed) {
    try {
      const gam = require('../gamificationService')
      await gam.awardReviewXp(db, userId)
    } catch (_) {}
  }

  // Return latest saved
  const saved = await db.collection('reviews').findOne({
    user_id: reviewDoc.user_id,
    $or: [
      { service_id: reviewDoc.service_id },
      { service_id: sid },
    ],
  })

  res.json({ success: true, review: saved || reviewDoc })
}

const getUserReviews = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)

  const reviews = await db.collection('reviews')
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray()

  res.json({ success: true, reviews })
}

const getEligibleServices = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)

  const completedOrders = await db.collection('orders')
    .find({ user_id: userId, status: { $in: ['Completed', 'completed'] } })
    .toArray()

  const reviewed = await db.collection('reviews')
    .find({ user_id: userId })
    .toArray()

  const reviewedServiceIds = new Set(
    reviewed
      .map((r) => (r.service_id?.toString ? r.service_id.toString() : String(r.service_id || '')))
      .filter(Boolean)
  )

  const completedServiceIds = new Set(
    completedOrders
      .map((o) => (o.service_id?.toString ? o.service_id.toString() : String(o.service_id || o.service_name || '')))
      .filter(Boolean)
  )

  const eligibleIds = Array.from(completedServiceIds).filter((id) => !reviewedServiceIds.has(id))
  if (eligibleIds.length === 0) return res.json({ success: true, eligible: [] })

  const eligible = await db.collection('services')
    .find({
      $or: [
        { service_id: { $in: eligibleIds } },
      ],
    })
    .limit(20)
    .toArray()

  res.json({ success: true, eligible })
}

const updateReview = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  const { serviceId } = req.params
  const { rating, speed_rating, would_recommend } = req.body || {}

  const r = toInt(rating, 0)
  const sp = toInt(speed_rating, 0)
  const would = toBool(would_recommend)

  if (r < 1 || r > 5) return res.status(400).json({ error: 'rating must be 1-5' })
  if (sp < 1 || sp > 5) return res.status(400).json({ error: 'speed_rating must be 1-5' })
  if (would === null) return res.status(400).json({ error: 'would_recommend must be true/false' })

  const sidObj = tryServiceId(serviceId)
  const sidForQuery = sidObj || serviceId

  const result = await db.collection('reviews').updateOne(
    {
      user_id: userId,
      $or: [
        { service_id: sidForQuery },
        { service_id: serviceId },
      ],
    },
    {
      $set: {
        rating: r,
        speed_rating: sp,
        would_recommend: would,
        is_edited: true,
        updated_at: new Date(),
      },
    }
  )

  if (!result.matchedCount) return res.status(404).json({ error: 'Review not found' })
  res.json({ success: true })
}

// Backward compat with older code that used different names.
const getReviews = getServiceReviews

module.exports = {
  getServiceReviews,
  getServiceReviewSummary,
  submitReview,
  getUserReviews,
  getEligibleServices,
  updateReview,
  getReviews,

  // Admin endpoints expected by `routes/admin.js` (stubs for localhost).
  adminListReviews: async (req, res) => {
    res.json({ success: true, reviews: [], total: 0, page: 1, pages: 1 });
  },
  adminHideReview: async (req, res) => {
    res.json({ success: true });
  },
  adminShowReview: async (req, res) => {
    res.json({ success: true });
  },
  adminDeleteReview: async (req, res) => {
    res.json({ success: true });
  },
}

