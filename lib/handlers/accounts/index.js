const { getDb } = require('../_db')
const { ObjectId } = require('mongodb')
const getUserId = require('../../getUserId')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'POST') {
    const { platform, username, notes } = req.body
    if (!platform || !username) {
      return res.status(400).json({ 
        error: 'Platform and username required' 
      })
    }

    const account = {
      user_id: userId,
      platform,
      username,
      notes: notes || '',
      created_at: new Date()
    }

    const result = await db.collection('user_accounts')
      .insertOne(account)

    return res.json({ 
      success: true, 
      account: { ...account, _id: result.insertedId } 
    })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    await db.collection('user_accounts').deleteOne({
      _id: new ObjectId(id),
      user_id: userId,
    })
    return res.json({ success: true })
  }

  const accounts = await db.collection('user_accounts')
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray()

  res.json({ success: true, accounts })
}

