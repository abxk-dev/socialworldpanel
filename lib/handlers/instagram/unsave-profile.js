const { getDb } = require('../_db')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = req.user?._id
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const username = req.params?.username || req.params?.user || req.params?.id
  if (!username) return res.status(400).json({ error: 'username is required' })

  await db.collection('instagram_saved_profiles').deleteOne({
    user_id: userId,
    username,
  })

  res.json({ success: true })
}

