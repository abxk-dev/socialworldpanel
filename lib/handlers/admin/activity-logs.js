const { getDb } = require('../_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const activity = await db.collection('activity_logs')
      .find({})
      .sort({ created_at: -1 })
      .limit(500)
      .toArray()
    res.json({ success: true, activity })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

