const { getDb } = require('../../_db')
const { parseAuth } = require('../../_auth')

const STAFF_ROLES = new Set(['main_admin', 'admin', 'support'])

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const staff = await requireStaff(req, db)
    if (!staff) {
      return res.status(401).json({ detail: 'Unauthorized' })
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const amt = Number(body.amount)
    if (!Number.isFinite(amt) || amt === 0) {
      return res.status(400).json({ detail: 'Invalid amount' })
    }

    const email = String(body.user_email || '').trim()
    const username = String(body.username || '').trim()
    const or = []
    if (username) {
      or.push({ username })
      or.push({ user_id: username })
    }
    if (email) {
      or.push({ email: new RegExp(`^${escapeRegex(email)}$`, 'i') })
    }
    if (!or.length) {
      return res.status(400).json({ detail: 'Enter user_email or username' })
    }

    const user = await db.collection('users').findOne({ $or: or })
    if (!user?.user_id) {
      return res.status(404).json({ detail: 'User not found' })
    }

    const cur = Number(user.balance || 0)
    const next = cur + amt
    if (next < 0) {
      return res.status(400).json({ detail: 'Insufficient balance for this deduction' })
    }

    const now = new Date().toISOString()
    const reason = String(body.reason || 'manual_adjust').slice(0, 500)

    const up = await db.collection('users').updateOne(
      { user_id: user.user_id },
      { $inc: { balance: amt }, $set: { updated_at: now } }
    )
    if (!up.matchedCount) {
      return res.status(404).json({ detail: 'User not found' })
    }

    await db.collection('deposits').insertOne({
      user_id: user.user_id,
      username: user.username || '',
      user_email: user.email || null,
      email: user.email || null,
      payment_type: 'admin_adjust',
      amount: amt,
      bonus_amount: 0,
      status: 'completed',
      reason,
      admin_actor: staff.claims.sub || staff.claims.user_id || null,
      created_at: now,
      updated_at: now,
    })

    res.json({ success: true, new_balance: next, user_id: user.user_id })
  } catch (err) {
    console.error('balance adjust error:', err)
    res.status(500).json({ detail: err.message })
  }
}
