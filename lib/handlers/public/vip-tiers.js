const { getDb } = require('../../db')

module.exports = async function vipTiers(req, res) {
  try {
    const db = await getDb()
    const tiers = await db.collection('vip_tiers')
      .find({ is_active: { $ne: false } })
      .sort({ min_total_spend: 1 })
      .toArray()

    // Keep response as array for existing frontend callers.
    return res.json(tiers)
  } catch (err) {
    return res.json([])
  }
}

