const { getDb } = require('../_db')
const getUserId = require('../../getUserId')

function generateNumericOrderId() {
  const ts = Date.now()
  const rand = Math.floor(Math.random() * 1000)
  return String(ts * 1000 + rand)
}

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const { order_id } = req.body

  const original = await db.collection('orders')
    .findOne({ 
      order_id: order_id,
      user_id: userId
    })

  if (!original) {
    return res.status(404).json({ error: 'Order not found' })
  }

  const service = await db.collection('services')
    .findOne({ service_id: original.service_id })

  if (!service) {
    return res.status(404).json({ error: 'Service no longer available' })
  }

  const user = await db.collection('users')
    .findOne({ user_id: userId })

  const cost = (service.rate / 1000) * original.quantity

  if (user.balance < cost) {
    return res.status(400).json({ 
      error: `Insufficient balance. Required: ₹${cost.toFixed(2)}` 
    })
  }

  const newOrder = {
    order_id: generateNumericOrderId(),
    user_id: userId,
    service_id: original.service_id,
    service_name: original.service_name,
    category: original.category,
    link: original.link,
    quantity: original.quantity,
    charge: cost,
    rate: service.rate,
    start_count: 0,
    remains: original.quantity,
    status: 'in_progress',
    reorder_of: original.order_id || original.reorder_of || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const result = await db.collection('orders').insertOne(newOrder)
  await db.collection('users').updateOne({ user_id: userId }, { $inc: { balance: -cost } })

  res.json({ 
    success: true, 
    order: { ...newOrder, _id: result.insertedId } 
  })
}

