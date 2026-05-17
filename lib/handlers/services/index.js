const { getDb } = require('../_db')
const { ObjectId } = require('mongodb')

const toObjectIdOrNull = (value) => {
  if (!value || !ObjectId.isValid(String(value))) return null
  return new ObjectId(String(value))
}

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const categoryId = String(req.query.category_id || req.query.category || '').trim()
    const filter = { is_active: true }

    if (categoryId) {
      const oid = toObjectIdOrNull(categoryId)
      filter.$or = oid
        ? [{ category_id: categoryId }, { category_id: oid }]
        : [{ category_id: categoryId }]
    }
    if (req.query.platform) {
      filter.platform_slug = req.query.platform
    }

    const services = await db.collection('services')
      .find(filter)
      .sort({ global_order: 1, sort_order: 1, _id: 1 })
      .toArray()

    // Debug trace for category filtering issues.
    console.log('[services:index] category_id=', categoryId || '(none)', 'count=', services.length)
    if (categoryId) {
      const mismatches = services.filter((s) => String(s.category_id) !== categoryId)
      if (mismatches.length > 0) {
        console.warn('[services:index] category mismatch detected:', mismatches.slice(0, 5).map((s) => ({
          service_id: s.service_id,
          category_id: String(s.category_id || ''),
        })))
      }
    }

    res.json({ success: true, services })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

