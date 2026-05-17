const { getDb } = require('../../_db')
const crypto = require('crypto')
const getUserId = require('../../../getUserId')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const newKey = crypto.randomBytes(32).toString('hex')

  await db.collection('users').updateOne(
    { user_id: userId },
    { $set: { api_key: newKey, updated_at: new Date().toISOString() } }
  )

  res.json({ success: true, api_key: newKey })
}

