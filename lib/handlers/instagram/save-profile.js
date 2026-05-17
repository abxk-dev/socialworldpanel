const { getDb } = require('../_db')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = req.user?._id
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { username, profile_pic_url, full_name } = req.body || {}
  if (!username) return res.status(400).json({ error: 'username is required' })

  await db.collection('instagram_saved_profiles').updateOne(
    { user_id: userId, username },
    {
      $set: {
        username,
        profile_pic_url: profile_pic_url || null,
        full_name: full_name || null,
        updated_at: new Date(),
      },
      $setOnInsert: {
        user_id: userId,
        created_at: new Date(),
      },
    },
    { upsert: true }
  )

  res.json({ success: true })
}

