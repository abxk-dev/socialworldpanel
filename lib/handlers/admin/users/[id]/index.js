const { ObjectId } = require('mongodb')
const bcrypt = require('bcryptjs')
const { getDb } = require('../../../_db')
const { parseAuth } = require('../../../_auth')

const STAFF_ROLES = new Set(['main_admin', 'admin', 'support'])

function buildUserFilter(rawId) {
  const id = String(rawId || '').trim()
  if (!id) return null
  const or = [{ user_id: id }]
  if (ObjectId.isValid(id)) {
    or.push({ _id: new ObjectId(id) })
  }
  return { $or: or }
}

async function requireStaff(req, db) {
  const claims = parseAuth(req)
  if (!claims) return null

  const localBypass =
    process.env.NODE_ENV !== 'production' || process.env.LOCAL_BYPASS_AUTH === '1'

  if (localBypass) {
    const role = claims.role || 'user'
    if (STAFF_ROLES.has(role)) return { claims, role }
    return null
  }

  if (!db) return null
  const adminUser = await db.collection('users').findOne(
    { user_id: claims.sub || claims.user_id },
    { projection: { role: 1, user_id: 1 } }
  )
  const role = adminUser?.role || claims.role
  if (!STAFF_ROLES.has(role)) return null
  return { claims, role }
}

function sanitizeDoc(u) {
  if (!u) return u
  const { password_hash, passwordHash, password, ...rest } = u
  return rest
}

/**
 * GET/PUT /api/admin/users/:id
 * PUT body (whitelisted): is_suspended, is_active, balance, name, full_name, email, username, phone, whatsapp, location
 */
module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const staff = await requireStaff(req, db)
    if (!staff) {
      return res.status(401).json({ detail: 'Unauthorized', error: 'Unauthorized' })
    }

    const filter = buildUserFilter(req.params.id)
    if (!filter) {
      return res.status(400).json({ detail: 'User id required' })
    }

    if (req.method === 'GET') {
      const user = await db.collection('users').findOne(filter, {
        projection: { password_hash: 0, password: 0 },
      })
      if (!user) return res.status(404).json({ detail: 'User not found' })
      return res.json({ success: true, user: sanitizeDoc(user) })
    }

    if (req.method === 'PUT') {
      const existing = await db.collection('users').findOne(filter)
      if (!existing) return res.status(404).json({ detail: 'User not found' })

      const body = req.body && typeof req.body === 'object' ? req.body : {}
      const $set = { updated_at: new Date().toISOString() }

      if (body.is_suspended !== undefined) {
        const s = !!body.is_suspended
        $set.is_suspended = s
        $set.suspended = s
      }
      if (body.is_active !== undefined) {
        $set.is_active = !!body.is_active
      }

      if (body.balance !== undefined && body.balance !== null && body.balance !== '') {
        const b = Number(body.balance)
        if (Number.isFinite(b)) $set.balance = b
      }

      if (typeof body.name === 'string') $set.name = body.name.trim()
      if (typeof body.full_name === 'string') $set.full_name = body.full_name.trim()
      if (typeof body.email === 'string') {
        const em = body.email.trim().toLowerCase()
        if (em) $set.email = em
      }
      if (typeof body.username === 'string') $set.username = body.username.trim()
      if (body.phone !== undefined) {
        const ph = body.phone
        $set.phone = ph === null || ph === '' ? '' : String(ph).trim()
      }
      if (body.whatsapp !== undefined) {
        const w = body.whatsapp
        $set.whatsapp = w === null || w === '' ? '' : String(w).trim()
      }

      if (body.location != null && typeof body.location === 'object' && !Array.isArray(body.location)) {
        const prev = existing.location && typeof existing.location === 'object' ? existing.location : {}
        const loc = body.location
        const next = { ...prev }
        if (typeof loc.country === 'string') next.country = loc.country.trim()
        if (typeof loc.country_code === 'string')
          next.country_code = loc.country_code.trim().toUpperCase().slice(0, 2)
        if (typeof loc.city === 'string') next.city = loc.city.trim()
        if (typeof loc.region === 'string') next.region = loc.region.trim()
        $set.location = next
      }

      const ROLE_SET = new Set(['user', 'support', 'admin', 'main_admin'])
      if (typeof body.role === 'string' && ROLE_SET.has(body.role.trim())) {
        if (staff.role !== 'main_admin') {
          return res.status(403).json({ detail: 'Only main admin can set user role' })
        }
        $set.role = body.role.trim()
      }

      const newPass =
        body.new_password != null && String(body.new_password).trim()
          ? String(body.new_password)
          : ''
      if (newPass) {
        if (!['main_admin', 'admin'].includes(staff.role)) {
          return res.status(403).json({ detail: 'Only main admin or admin can set user passwords' })
        }
        if (newPass.length < 8) {
          return res.status(400).json({ detail: 'Password must be at least 8 characters' })
        }
        const password_hash = await bcrypt.hash(newPass, 10)
        $set.password_hash = password_hash
        $set.password = password_hash
      }

      await db.collection('users').updateOne(filter, { $set })

      const user = await db.collection('users').findOne(filter, {
        projection: { password_hash: 0, password: 0 },
      })
      return res.json({ success: true, user: sanitizeDoc(user) })
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ detail: 'Method not allowed' })
  } catch (err) {
    console.error('[admin users/:id]', err)
    return res.status(500).json({ detail: err.message || 'Server error', error: err.message })
  }
}
