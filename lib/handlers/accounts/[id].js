const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')
const getUserId = require('../../getUserId')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    const { id } = req.params || {}

    if (!userId || !id) return res.status(401).json({ error: 'Unauthorized' })
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid account id' })

    const filter = { _id: new ObjectId(id), user_id: userId }

    if (req.method === 'PUT') {
      const { platform, username, notes } = req.body || {}
      await db.collection('user_accounts').updateOne(
        filter,
        { $set: { platform, username, notes: notes || '', updated_at: new Date().toISOString() } }
      )
      return res.json({ success: true })
    }

    if (req.method === 'DELETE') {
      await db.collection('user_accounts').deleteOne(filter)
      return res.json({ success: true })
    }

    const account = await db.collection('user_accounts').findOne(filter)
    if (!account) return res.status(404).json({ error: 'Account not found' })
    return res.json({ success: true, account })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

