const { getDb } = require('../_db')
const getUserId = require('../../getUserId')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20))
    const skip = (page - 1) * limit

    const filter = { user_id: userId }
    const total = await db.collection('spin_history').countDocuments(filter)
    const pages = Math.max(1, Math.ceil(total / limit))

    const docs = await db.collection('spin_history')
      .find(filter)
      .sort({ created_at: -1, spun_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const history = docs.map((h) => ({
      date: h?.created_at || h?.spun_at || null,
      prize: h?.prize?.label || h?.prize_label || '',
      prize_type: h?.prize?.type || h?.prize_type || '',
      coupon_code: h?.coupon_code || h?.prize?.coupon_code || null,
      streak: Number(h?.streak || 0),
    }))

    res.json({ success: true, history, total, page, pages })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

