const { getDb } = require('../_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const notifications = await db.collection('notifications')
      .find({})
      .sort({ created_at: -1 })
      .limit(200)
      .toArray()
    res.json({ success: true, notifications })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

