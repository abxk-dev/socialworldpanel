const { getDb } = require('../_db')
const { ObjectId } = require('mongodb')
const getUserId = require('../../getUserId')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'POST') {
    const { name, service_id, quantity, link } = req.body
    if (!name || !service_id) {
      return res.status(400).json({ 
        error: 'Name and service_id required' 
      })
    }

    const template = {
      user_id: userId,
      name,
      service_id,
      quantity: quantity || 1000,
      link: link || '',
      created_at: new Date()
    }

    const result = await db.collection('order_templates')
      .insertOne(template)

    return res.json({ 
      success: true, 
      template: { ...template, _id: result.insertedId } 
    })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    await db.collection('order_templates').deleteOne({
      _id: new ObjectId(id),
      user_id: userId
    })
    return res.json({ success: true })
  }

  const templates = await db.collection('order_templates')
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray()

  res.json({ success: true, templates })
}

