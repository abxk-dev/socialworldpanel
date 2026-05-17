const { getDb } = require('../../../_db')
const { ObjectId } = require('mongodb')

const oid = (value) => {
  const s = String(value || '').trim()
  if (!s || !ObjectId.isValid(s)) return null
  return new ObjectId(s)
}

const serviceFilter = (id) => {
  const maybeId = oid(id)
  return maybeId
    ? { $or: [{ _id: maybeId }, { service_id: String(id) }] }
    : { service_id: String(id) }
}

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const id = req.params?.id
    if (!id) return res.status(400).json({ success: false, error: 'id is required' })

    if (req.method === 'GET') {
      const service = await db.collection('services').findOne(serviceFilter(id))
      if (!service) return res.status(404).json({ success: false, error: 'Service not found' })
      return res.json({ success: true, service })
    }

    if (req.method === 'PUT') {
      const body = req.body && typeof req.body === 'object' ? req.body : {}
      const updates = { ...body, updated_at: new Date().toISOString() }
      delete updates._id

      if (body.category_id != null) {
        const categoryId = String(body.category_id || '').trim()
        if (!categoryId) return res.status(400).json({ success: false, error: 'category_id is required' })
        const category = await db.collection('categories').findOne(
          oid(categoryId)
            ? { $or: [{ _id: oid(categoryId) }, { category_id: categoryId }] }
            : { category_id: categoryId }
        )
        if (!category) return res.status(400).json({ success: false, error: 'Invalid category_id' })
        updates.category_id = categoryId
        updates.category = category.name || null
        updates.category_name = category.name || null
        updates.platform_slug = category.platform_slug || updates.platform || null
      }

      await db.collection('services').updateOne(serviceFilter(id), { $set: updates })
      return res.json({ success: true })
    }

    if (req.method === 'DELETE') {
      await db.collection('services').deleteOne(serviceFilter(id))
      return res.json({ success: true })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

