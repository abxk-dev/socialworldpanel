const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')

// Used by POST /api/recommend
module.exports = {
  getRecommendations: async (req, res) => {
    const db = await getDb()
    const userId = req.user?._id
    const { link, goal } = req.body || {}

    // Best-effort: pick services by activity/availability.
    // This is intentionally conservative (empty results when DB is sparse).
    const services = await db.collection('services')
      .find({ is_active: true })
      .sort({ sort_order: 1, global_order: 1, rate: 1 })
      .limit(8)
      .toArray()

    // Convert to shape frontend expects.
    const recommendations = services.map((s, idx) => ({
      rank: idx + 1,
      confidence: 'medium',
      service_id: s.service_id ?? s._id?.toString?.() ?? '',
      service_name: s.name || s.service_name || 'Service',
      reason: 'Suggested based on availability',
      expected_results: 'Improved engagement',
      suggested_quantity: s.min_order || 1000,
      estimated_cost: ((s.rate || s.price_per_1000 || 0) / 1000) * (s.min_order || 1000),
      rating_avg: null,
      rating_count: 0,
      suggested_quantity_unit: 'per 1000',
      category_id: s.category_id || null,
    }))

    res.json({
      success: true,
      platform: null,
      summary: goal ? `Goal: ${String(goal).slice(0, 80)}` : null,
      recommendations,
    })
  },
}

