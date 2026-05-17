const { getDb } = require('./_db')
const getUserId = require('../../getUserId')
const { ObjectId } = require('mongodb')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    const { id } = req.params

    let objId
    try {
      objId = new ObjectId(id)
    } catch {
      objId = null
    }

    const query = { user_id: userId }
    if (objId) query._id = objId

    await db.collection('notifications').updateOne(query, {
      $set: {
        is_read: true,
        read: true,
        read_at: new Date().toISOString(),
      },
    })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

