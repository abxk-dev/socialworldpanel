const { getDb } = require('../_db')

module.exports = async (req, res) => {
  const db = await getDb()

  const platforms = await db.collection('platforms')
    .find({ is_active: true })
    .sort({ priority: 1 })
    .toArray()

  const result = []

  for (const platform of platforms) {
    const categories = await db.collection('categories')
      .find({ 
        platform_slug: platform.slug,
        is_active: true 
      })
      .sort({ sort_order: 1 })
      .toArray()

    if (categories.length > 0) {
      result.push({
        platform,
        categories
      })
    }
  }

  // Fallback: if no platforms, return raw categories
  if (result.length === 0) {
    const categories = await db.collection('categories')
      .find({ is_active: true })
      .sort({ global_order: 1 })
      .toArray()
    return res.json({ success: true, grouped: [], flat: categories })
  }

  res.json({ success: true, grouped: result })
}

