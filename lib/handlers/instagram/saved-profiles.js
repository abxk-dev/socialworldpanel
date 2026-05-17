const { getDb } = require('../_db')
const { ObjectId } = require('mongodb')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = req.user?._id

  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const profiles = await db.collection('instagram_saved_profiles')
    .find({ user_id: new ObjectId(userId) })
    .sort({ created_at: -1 })
    .limit(200)
    .toArray()

  // Frontend expects either array directly or res.data is array.
  // Route wraps this handler and returns JSON; we return array directly.
  res.json(profiles.map((p) => ({
    username: p.username,
    profile_pic_url: p.profile_pic_url || p.profilePicUrl || null,
    full_name: p.full_name || p.fullName || null,
    created_at: p.created_at,
    _id: p._id,
  })))
}

