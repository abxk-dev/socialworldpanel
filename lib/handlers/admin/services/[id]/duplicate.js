const { getDb } = require('../../../_db')
const { ObjectId } = require('mongodb')

const oid = (value) => {
  const s = String(value || '').trim()
  if (!s || !ObjectId.isValid(s)) return null
  return new ObjectId(s)
}

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const id = req.params?.id
    if (!id) return res.status(400).json({ success: false, error: 'id is required' })
    const filter = oid(id) ? { $or: [{ _id: oid(id) }, { service_id: String(id) }] } : { service_id: String(id) }
    const source = await db.collection('services').findOne(filter)
    if (!source) return res.status(404).json({ success: false, error: 'Service not found' })

    const now = new Date().toISOString()
    const clone = {
      ...source,
      _id: undefined,
      service_id: `srv_${Date.now()}`,
      name: `${source.name || 'Service'} (Copy)`,
      created_at: now,
      updated_at: now,
    }
    const out = await db.collection('services').insertOne(clone)
    return res.json({ success: true, service: { ...clone, _id: out.insertedId } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

