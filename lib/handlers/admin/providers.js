const { getDb } = require('../_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const providers = await db.collection('providers')
      .find({})
      .sort({ priority: 1, created_at: -1 })
      .toArray()

    const enriched = await Promise.all(
      providers.map(async (p) => {
        const providerId = p?._id?.toString?.() || p?.provider_id || ''
        const serviceCount = await db.collection('services')
          .countDocuments({ provider_id: providerId })
        return { ...p, services_count: serviceCount }
      })
    )

    res.json({ success: true, providers: enriched })
  } catch (err) {
    console.error('listProviders error:', err)
    res.status(500).json({ error: err.message })
  }
}

