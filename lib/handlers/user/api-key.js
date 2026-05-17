const { getDb } = require('../_db')
const getUserId = require('../../getUserId')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const user = await db.collection('users')
    .findOne({ user_id: userId }, { projection: { api_key: 1 } })

  res.json({ 
    success: true, 
    api_key: user?.api_key || null 
  })
}

