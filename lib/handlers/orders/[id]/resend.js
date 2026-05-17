const { getDb } = require('../../_db')
const getUserId = require('../../../getUserId')
const { invalidateAllOrderLists } = require('../../../cache/orderListCache')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const { id } = req.params

  const order = await db.collection('orders')
    .findOne({ order_id: id, user_id: userId })

  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  const st = String(order?.status || '').toLowerCase()
  if (!['cancelled', 'failed'].includes(st)) {
    return res.status(400).json({ 
      error: 'Only cancelled or failed orders can be resent' 
    })
  }

  await db.collection('orders').updateOne(
    { order_id: id, user_id: userId },
    { $set: { status: 'in_progress', updated_at: new Date().toISOString() } }
  )
  invalidateAllOrderLists()

  res.json({ success: true, message: 'Order resent successfully' })
}

