const { getDb } = require('../../_db')
const getUserId = require('../../../getUserId')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  const { id } = req.params

  try {
    const order = await db.collection('orders')
      .findOne({ 
        order_id: id,
        user_id: userId,
      })

    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json({ 
      success: true,
      status: order.status,
      start_count: order.start_count,
      remains: order.remains,
      order
    })
  } catch (err) {
    res.status(400).json({ error: 'Invalid order ID' })
  }
}

