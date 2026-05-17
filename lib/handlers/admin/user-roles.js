const { ObjectId } = require('mongodb')
const { getDb } = require('../_db')

const ALLOWED_ROLES = new Set(['user', 'support', 'admin', 'main_admin'])

function buildUserFilter(rawId) {
  const id = String(rawId || '').trim()
  if (!id) return null
  const or = [{ user_id: id }]
  if (ObjectId.isValid(id)) {
    or.push({ _id: new ObjectId(id) })
  }
  return { $or: or }
}

module.exports = {
  changeRoleHandler: async (req, res) => {
    try {
      const db = await getDb()
      const filter = buildUserFilter(req.params.id)
      if (!filter) {
        return res.status(400).json({ message: 'User id required', detail: 'User id required' })
      }
      const new_role = String(req.body?.new_role || '').trim()
      if (!ALLOWED_ROLES.has(new_role)) {
        return res.status(400).json({ message: 'Invalid role', detail: 'Invalid role' })
      }
      const existing = await db.collection('users').findOne(filter)
      if (!existing) {
        return res.status(404).json({ message: 'User not found', detail: 'User not found' })
      }
      const prev = existing.role || 'user'
      if (prev === new_role) {
        return res.json({ success: true, user_id: existing.user_id, role: new_role, unchanged: true })
      }
      const now = new Date().toISOString()
      await db.collection('users').updateOne(filter, {
        $set: { role: new_role, updated_at: now },
      })
      try {
        await db.collection('admin_role_changes').insertOne({
          target_user_id: String(existing.user_id),
          previous_role: prev,
          new_role,
          note: typeof req.body?.note === 'string' ? req.body.note.slice(0, 2000) : '',
          at: now,
        })
      } catch (e) {
        /* collection may not exist */
      }
      return res.json({ success: true, user_id: existing.user_id, role: new_role })
    } catch (err) {
      console.error('[changeRoleHandler]', err)
      return res.status(500).json({ message: err.message || 'Server error' })
    }
  },
  roleHistoryHandler: async (req, res) => {
    try {
      const db = await getDb()
      const uid = String(req.params.id || '').trim()
      if (!uid) return res.status(400).json({ success: false, history: [] })
      const rows = await db
        .collection('admin_role_changes')
        .find({ target_user_id: uid })
        .sort({ at: -1 })
        .limit(50)
        .toArray()
        .catch(() => [])
      return res.json({ success: true, history: rows || [] })
    } catch (err) {
      return res.json({ success: true, history: [] })
    }
  },
  bulkRoleHandler: async (req, res) => {
    res.json({ success: true, updated: 0 })
  },
}
