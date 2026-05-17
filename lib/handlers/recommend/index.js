const { getDb } = require('../_db')
const getUserId = require('../../getUserId')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const recentOrders = await db.collection('orders')
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(10)
    .toArray()

  const categoryFrequency = {}
  recentOrders.forEach(order => {
    const cat = order.category || 'other'
    categoryFrequency[cat] = (categoryFrequency[cat] || 0) + 1
  })

  const topCategory = Object.keys(categoryFrequency)
    .sort((a,b) => categoryFrequency[b] - categoryFrequency[a])[0]

  const filter = { is_active: true }
  if (topCategory) filter.category = topCategory

  const recommended = await db.collection('services')
    .find(filter)
    .sort({ rate: 1 })
    .limit(6)
    .toArray()

  res.json({ 
    success: true, 
    recommended,
    based_on: topCategory || 'popular'
  })
}

