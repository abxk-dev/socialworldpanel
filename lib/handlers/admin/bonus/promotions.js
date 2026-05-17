const { getDb } = require('../../_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const promotions = await db.collection('bonus_promotions')
      .find({})
      .sort({ created_at: -1 })
      .toArray()
    res.json({ success: true, promotions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

