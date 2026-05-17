const { getDb } = require('./_db')
const getUserId = require('../../getUserId')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const page = parseInt(req.query.page) || 1
    const limit = 20
    const skip = (page - 1) * limit

    const notifications = await db.collection('notifications')
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    res.json({ success: true, notifications })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

