const { getDb } = require('../_db')
const { ObjectId } = require('mongodb')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = req.user?._id
  const { id } = req.params || {}

  if (!userId || !id) return res.status(401).json({ error: 'Unauthorized' })

  const baseFilter = { _id: new ObjectId(id), user_id: new ObjectId(userId) }

  // GET template
  if (req.method === 'GET') {
    const template = await db.collection('order_templates').findOne(baseFilter)
    if (!template) return res.status(404).json({ error: 'Template not found' })
    return res.json({ success: true, id: template._id?.toString?.() || id, ...template })
  }

  // Update template
  if (req.method === 'PUT') {
    const { name, service_id, quantity, link } = req.body || {}
    await db.collection('order_templates').updateOne(baseFilter, {
      $set: {
        name: name ?? undefined,
        service_id: service_id ? new ObjectId(service_id) : undefined,
        quantity: quantity ?? undefined,
        link: link ?? undefined,
        updated_at: new Date(),
      },
    })
    return res.json({ success: true })
  }

  // Delete template
  if (req.method === 'DELETE') {
    await db.collection('order_templates').deleteOne(baseFilter)
    return res.json({ success: true })
  }

  // Use template: increment use_count and (optionally) return it.
  if (req.method === 'POST') {
    await db.collection('order_templates').updateOne(baseFilter, {
      $inc: { use_count: 1 },
      $set: { updated_at: new Date() },
    })
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

