const { getDb } = require('./_db')
const getUserId = require('../../getUserId')
const bcrypt = require('bcryptjs')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const user = await db.collection('users').findOne({ user_id: userId })
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (req.method === 'PUT') {
      const {
        full_name,
        phone,
        username,
        current_password,
        new_password,
        theme_preference,
      } = req.body || {}

      const updates = { updated_at: new Date().toISOString() }
      if (full_name !== undefined) updates.full_name = full_name
      if (phone !== undefined) updates.phone = phone
      if (username) updates.username = username

      if (theme_preference !== undefined && theme_preference !== null) {
        const t = String(theme_preference).toLowerCase()
        if (t === 'light' || t === 'day') updates.theme_preference = 'light'
        else if (t === 'dark' || t === 'night') updates.theme_preference = 'dark'
        else {
          return res.status(400).json({ error: 'theme_preference must be light or dark' })
        }
      }

      if (new_password) {
        if (!current_password) {
          return res.status(400).json({ error: 'Current password required' })
        }
        const hash = user.password_hash || user.password || ''
        const valid = await bcrypt.compare(current_password, hash)
        if (!valid) {
          return res.status(400).json({ error: 'Current password incorrect' })
        }
        updates.password_hash = await bcrypt.hash(new_password, 10)
      }

      await db.collection('users').updateOne(
        { user_id: userId },
        { $set: updates }
      )

      const updated = await db.collection('users').findOne(
        { user_id: userId },
        { projection: { password_hash: 0, password: 0 } }
      )
      return res.json({ success: true, user: updated })
    }

    // GET
    const safe = { ...user }
    delete safe.password_hash
    delete safe.password
    res.json({ success: true, user: safe })
  } catch (err) {
    console.error('profile error:', err)
    res.status(500).json({ error: err.message })
  }
}

