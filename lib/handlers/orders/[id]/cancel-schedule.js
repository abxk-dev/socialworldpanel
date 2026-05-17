const { getDb } = require('../../_db')
const getUserId = require('../../../getUserId')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const { id } = req.params

  const order = await db.collection('orders')
    .findOne({ 
      order_id: id,
      user_id: userId,
    })

  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  if (String(order?.status || '').toLowerCase() !== 'scheduled') {
    return res.status(400).json({ 
      error: 'Order is not scheduled' 
    })
  }

  await db.collection('orders').updateOne(
    { order_id: id, user_id: userId },
    { $set: { status: 'cancelled', updated_at: new Date().toISOString() } }
  )

  // Refund the charge
  if (order.charge) {
    await db.collection('users').updateOne(
      { user_id: userId },
      { $inc: { balance: order.charge } }
    )
  }

  res.json({ success: true, message: 'Schedule cancelled and refunded' })
}

