const { getDb } = require('./_db')
const getUserId = require('../../getUserId')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.json({ count: 0 })

    const count = await db.collection('notifications')
      .countDocuments({
        user_id: userId,
        is_read: { $ne: true },
      })

    res.json({ success: true, count })
  } catch (err) {
    res.json({ count: 0 })
  }
}

