const { getDb } = require('./_db')
const getUserId = require('../getUserId')

function toNum(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

async function getUserTotals(db, userId) {
  const orders = await db.collection('orders')
    .find({ user_id: userId })
    .toArray()

  const total_spent = orders.reduce((s, o) => s + Number(o.charge || 0), 0)
  return { total_spent }
}

const getUserLoyaltySummary = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const user = await db.collection('users').findOne({ user_id: userId })
  if (!user) return res.status(404).json({ error: 'User not found' })

  const points = toNum(user?.loyalty_points, 0)
  const points_per_dollar = 100

  const { total_spent } = await getUserTotals(db, userId)

  // Real tiers live in loyalty_settings.tiers.
  const loyaltySettings = await db.collection('loyalty_settings').findOne({})
  const tiersDb = loyaltySettings?.tiers || {}
  const tiers = {
    bronze: {
      min: tiersDb?.bronze?.min ?? 0,
      cashback_pct: tiersDb?.bronze?.cashback_pct ?? 1,
      pts_per_dollar: tiersDb?.bronze?.pts_per_dollar ?? points_per_dollar,
    },
    silver: {
      min: tiersDb?.silver?.min ?? 5000,
      cashback_pct: tiersDb?.silver?.cashback_pct ?? 2,
      pts_per_dollar: tiersDb?.silver?.pts_per_dollar ?? points_per_dollar,
    },
    gold: {
      min: tiersDb?.gold?.min ?? 20000,
      cashback_pct: tiersDb?.gold?.cashback_pct ?? 3,
      pts_per_dollar: tiersDb?.gold?.pts_per_dollar ?? points_per_dollar,
    },
    platinum: {
      min: tiersDb?.platinum?.min ?? 50000,
      cashback_pct: tiersDb?.platinum?.cashback_pct ?? 4,
      pts_per_dollar: tiersDb?.platinum?.pts_per_dollar ?? points_per_dollar,
    },
  }

  const orderTiers = Object.keys(tiers).sort((a, b) => tiers[a].min - tiers[b].min)
  let tier = 'bronze'
  for (const t of orderTiers) {
    if (total_spent >= tiers[t].min) tier = t
  }

  const nextTier = orderTiers.find((t) => tiers[t].min > total_spent) || null
  const next_tier_min = nextTier ? tiers[nextTier].min : null

  const currentMin = tiers[tier]?.min ?? 0
  const progress_to_next =
    nextTier && next_tier_min != null && next_tier_min > currentMin
      ? Math.max(0, Math.min(100, ((total_spent - currentMin) / (next_tier_min - currentMin)) * 100))
      : 0

  const points_value_usd = points_per_dollar > 0 ? points / points_per_dollar : 0

  res.json({
    success: true,
    tier,
    points,
    points_pending: 0,
    cashback_pending: 0,
    min_redemption: 100,
    points_per_dollar,
    points_value_usd,

    total_spent,

    next_tier: nextTier,
    next_tier_min,
    progress_to_next,

    tier_config: tiers[tier],
    tiers,
  })
}

const getLoyaltyTransactions = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20))
  const skip = (page - 1) * limit

  const filter = { user_id: userId }
  const total = await db.collection('loyalty_transactions').countDocuments(filter)
  const pages = Math.max(1, Math.ceil(total / limit))

  const transactions = await db.collection('loyalty_transactions')
    .find(filter)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()

  res.json({ success: true, transactions, total, page, pages })
}

const redeemPoints = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  const { points } = req.body || {}
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const pts = toNum(points, 0)
  if (!Number.isFinite(pts) || pts < 100) {
    return res.status(400).json({ error: 'Minimum 100 points to redeem' })
  }

  const user = await db.collection('users')
    .findOne({ user_id: userId })

  if (toNum(user?.loyalty_points, 0) < pts) {
    return res.status(400).json({ error: 'Insufficient points' })
  }

  const balanceAdded = pts / 100

  await db.collection('users').updateOne(
    { user_id: userId },
    { $inc: { loyalty_points: -pts, balance: balanceAdded } }
  )

  await db.collection('loyalty_transactions').insertOne({
    user_id: userId,
    type: 'redeem',
    points: -pts,
    cashback_usd: balanceAdded,
    status: 'credited',
    note: 'Redeemed points for balance',
    created_at: new Date(),
    updated_at: new Date(),
  })

  res.json({
    success: true,
    message: 'Points redeemed!',
    redeemed_points: pts,
    balance_added: balanceAdded,
  })
}

// Backward compat
const getLoyaltyStatus = getUserLoyaltySummary

module.exports = {
  getUserLoyaltySummary,
  getLoyaltyTransactions,
  redeemPoints,
  getLoyaltyStatus,

  // Admin endpoints expected by `routes/admin.js` (stubs + lightweight DB reads).
  getSettings: async (req, res) => {
    try {
      const db = await getDb()
      const settings = await db.collection('loyalty_settings').findOne({}) || {}
      const tiers = settings?.tiers || {}
      res.json({
        success: true,
        settings,
        enabled: settings?.enabled ?? false,
        tiers,
        points_per_dollar: settings?.points_per_dollar ?? 100,
        min_redemption_points: settings?.min_redemption_points ?? 100,
        hold_hours: settings?.hold_hours ?? 24,
        inactivity_expiry_days: settings?.inactivity_expiry_days ?? 90,
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },
  updateSettings: async (req, res) => {
    try {
      const db = await getDb()
      const body = req.body && typeof req.body === 'object' ? req.body : {}
      const updates = { ...body, updated_at: new Date().toISOString() }
      delete updates._id
      await db.collection('loyalty_settings').updateOne(
        {},
        { $set: updates },
        { upsert: true }
      )
      res.json({ success: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },
  adminGetLoyaltyUsers: async (req, res) => {
    try {
      const db = await getDb()
      const users = await db.collection('users')
        .find({})
        .project({ user_id: 1, username: 1, email: 1, loyalty_points: 1, tier_slug: 1, total_spent: 1, last_login_at: 1 })
        .limit(200)
        .toArray()
      res.json({ success: true, users })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },
  adminAdjustPoints: async (req, res) => {
    try {
      const db = await getDb()
      const { user_id, points, type } = req.body || {}
      if (!user_id || !points) {
        return res.status(400).json({ error: 'user_id and points required' })
      }
      await db.collection('users').updateOne(
        { user_id: String(user_id) },
        { $inc: { loyalty_points: Number(points) } }
      )
      res.json({ success: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },
  adminGetLoyaltyTransactions: async (req, res) => {
    try {
      const db = await getDb()
      const transactions = await db.collection('loyalty_transactions')
        .find({})
        .sort({ created_at: -1 })
        .limit(50)
        .toArray()
      res.json({ success: true, transactions })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },
}

