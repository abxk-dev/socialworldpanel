const { getDb } = require('../../../_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const { id } = req.params
    const logs = await db.collection('provider_logs')
      .find({ provider_id: id })
      .sort({ created_at: -1 })
      .limit(200)
      .toArray()
    res.json({ success: true, logs })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

