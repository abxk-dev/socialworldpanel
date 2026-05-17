const { getDb } = require('../_db')
const getUserId = require('../../getUserId')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const orders = await db.collection('orders')
    .find({ 
      user_id: userId,
      status: { $in: ['Scheduled', 'scheduled'] },
    })
    .sort({ created_at: -1 })
    .toArray()

  res.json({ success: true, orders })
}

