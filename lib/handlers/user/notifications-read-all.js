const { getDb } = require('./_db')
const getUserId = require('../../getUserId')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    await db.collection('notifications').updateMany(
      { user_id: userId, is_read: { $ne: true } },
      {
        $set: {
          is_read: true,
          read: true,
          read_at: new Date().toISOString(),
        },
      }
    )

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

