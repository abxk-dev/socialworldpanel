const jwt = require('jsonwebtoken')
const { ObjectId } = require('mongodb')
const { getDb } = require('../../_db')
const { parseAuth } = require('../../_auth')

function getTargetUserId(u) {
  if (!u || typeof u !== 'object') return null
  if (u.user_id) return String(u.user_id)
  if (u.userId) return String(u.userId)
  if (u._id != null) return String(u._id)
  return null
}

function signAccessToken({ userId, email, role }) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  return jwt.sign(
    {
      sub: userId,
      user_id: userId,
      email: email || '',
      role: role || 'user',
      token_type: 'bearer',
    },
    secret,
    { algorithm: 'HS256', expiresIn: '7d' }
  )
}

function sanitizeUser(u) {
  if (!u || typeof u !== 'object') return u
  const {
    password_hash: ph,
    passwordHash,
    password,
    ...rest
  } = u
  const userId = getTargetUserId(rest)
  return {
    ...rest,
    user_id: userId,
    email: rest.email || rest.user_email || '',
    role: rest.role || 'user',
  }
}

function isSuspended(u) {
  return (
    u?.is_active === false ||
    u?.suspended === true ||
    u?.is_suspended === true ||
    u?.status === 'suspended'
  )
}

async function requireAdminOrMainAdmin(req, db) {
  const claims = parseAuth(req)
  if (!claims) return null

  const localBypass =
    process.env.NODE_ENV !== 'production' || process.env.LOCAL_BYPASS_AUTH === '1'

  if (localBypass) {
    const role = claims.role || 'user'
    if (['main_admin', 'admin'].includes(role)) return { claims, role }
    return null
  }

  if (!db) return null
  const adminUser = await db.collection('users').findOne(
    { user_id: claims.sub || claims.user_id },
    { projection: { role: 1, user_id: 1 } }
  )
  const role = adminUser?.role || claims.role
  if (!['main_admin', 'admin'].includes(role)) return null
  return { claims, role }
}

/**
 * POST /api/admin/users/:id/login-as
 * Issues a valid JWT for the target user (same shape as /auth/login).
 */
module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const staff = await requireAdminOrMainAdmin(req, db)
    if (!staff) {
      return res.status(401).json({ detail: 'Unauthorized', error: 'Unauthorized' })
    }

    const rawId = String(req.params.id || '').trim()
    if (!rawId) {
      return res.status(400).json({ detail: 'User id required' })
    }

    const orFilter = [{ user_id: rawId }]
    if (ObjectId.isValid(rawId)) {
      orFilter.push({ _id: new ObjectId(rawId) })
    }

    const target = await db.collection('users').findOne({ $or: orFilter })
    if (!target) {
      return res.status(404).json({ detail: 'User not found' })
    }

    if (isSuspended(target)) {
      return res.status(403).json({ detail: 'Cannot sign in as a suspended account' })
    }

    const userId = getTargetUserId(target)
    if (!userId) {
      return res.status(400).json({ detail: 'Target account has no user_id' })
    }

    const email = String(target.email || target.user_email || '').trim()
    const role = target.role || 'user'
    const access_token = signAccessToken({ userId, email, role })
    const user = sanitizeUser(target)

    return res.json({
      success: true,
      access_token,
      user,
    })
  } catch (err) {
    console.error('[admin login-as]', err)
    return res.status(500).json({
      detail: err.message || 'Login as failed',
      error: err.message,
    })
  }
}
