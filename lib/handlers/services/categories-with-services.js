const { getDb } = require('../_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const categories = await db.collection('categories')
      .find({ is_active: { $ne: false } })
      .sort({ sort_order: 1, global_order: 1, name: 1 })
      .toArray()

    const categoryIds = categories.map((c) => String(c._id))
    const services = await db.collection('services')
      .find({
        is_active: true,
        category_id: { $in: categoryIds },
      })
      .sort({ sort_order: 1, _id: 1 })
      .toArray()

    const serviceMap = {}
    for (const id of categoryIds) serviceMap[id] = []
    for (const service of services) {
      const key = String(service.category_id || '')
      if (!serviceMap[key]) serviceMap[key] = []
      serviceMap[key].push(service)
    }

    const payload = categories.map((category) => ({
      _id: String(category._id),
      name: category.name,
      services: serviceMap[String(category._id)] || [],
    }))

    res.json(payload)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}
