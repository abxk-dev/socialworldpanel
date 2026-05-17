const { getDb } = require('../_db')
const { parseAuth } = require('../_auth')
const { expandUserIdsForIn } = require('../../mongoUserId')

const STAFF_ROLES = new Set(['main_admin', 'admin', 'support'])

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

function expandedWithoutSelf(expanded, selfId) {
  const s = String(selfId || '').trim()
  if (!s) return expanded
  const n = /^\d+$/.test(s) ? parseInt(s, 10) : null
  return expanded.filter((x) => !(String(x) === s || (n != null && x === n)))
}

/**
 * POST /api/admin/users/bulk
 * Body: { action: "suspend" | "activate", user_ids: string[] }
 */
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ detail: 'Method not allowed' })
    }

    const db = await getDb()
    const staff = await requireStaff(req, db)
    if (!staff) {
      return res.status(401).json({ detail: 'Unauthorized', error: 'Unauthorized' })
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const action = String(body.action || '').trim().toLowerCase()
    const user_ids = Array.isArray(body.user_ids) ? body.user_ids : []
    const ids = [...new Set(user_ids.map((x) => String(x).trim()).filter(Boolean))]
    if (!ids.length) {
      return res.status(400).json({ detail: 'No users selected', error: 'No users selected' })
    }

    let expanded = expandUserIdsForIn(ids)
    const selfId = String(staff.claims?.sub || staff.claims?.user_id || '')
    if (action === 'suspend' && selfId) {
      expanded = expandedWithoutSelf(expanded, selfId)
    }
    if (!expanded.length) {
      return res.status(400).json({ detail: 'No valid users to update', error: 'No valid users to update' })
    }

    const filter = { user_id: { $in: expanded } }
    const now = new Date().toISOString()

    if (action === 'suspend') {
      const r = await db.collection('users').updateMany(filter, {
        $set: {
          is_suspended: true,
          is_active: false,
          suspended: true,
          updated_at: now,
        },
      })
      return res.json({ success: true, modified: r.modifiedCount, matched: r.matchedCount })
    }

    if (action === 'activate') {
      const r = await db.collection('users').updateMany(filter, {
        $set: {
          is_suspended: false,
          is_active: true,
          suspended: false,
          updated_at: now,
        },
      })
      return res.json({ success: true, modified: r.modifiedCount, matched: r.matchedCount })
    }

    return res.status(400).json({
      detail: 'Invalid action. Use "suspend" or "activate".',
      error: 'Invalid action',
    })
  } catch (err) {
    console.error('[users-bulk]', err)
    return res.status(500).json({ detail: err.message || 'Server error', error: err.message })
  }
}
