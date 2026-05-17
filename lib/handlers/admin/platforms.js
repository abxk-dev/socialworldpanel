const { getDb } = require('../_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const platforms = await db.collection('platforms')
      .find({})
      .sort({ priority: 1, created_at: -1 })
      .toArray()
    res.json({ success: true, platforms })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

