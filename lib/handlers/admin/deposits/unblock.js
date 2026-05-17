const { ObjectId } = require('mongodb')
const { getDb } = require('../../_db')
const { parseAuth } = require('../../_auth')

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

function principalCredited(d) {
  const credited = Number(d.amount_credited_usd)
  if (Number.isFinite(credited) && credited > 0) return credited
  const u = d.amount_usd
  if (u != null && u !== '' && Number.isFinite(Number(u))) return Number(u)
  return Number(d.amount_inr ?? d.amount_php ?? d.amount ?? 0)
}

function bonusCredited(d) {
  return Number(d.bonus_amount ?? d.bonus ?? 0)
}

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const staff = await requireStaff(req, db)
    if (!staff) {
      return res.status(401).json({ detail: 'Unauthorized' })
    }

    const rawId = req.body?.deposit_id
    if (!rawId) {
      return res.status(400).json({ detail: 'deposit_id is required' })
    }

    let oid
    try {
      oid = typeof rawId === 'string' ? new ObjectId(rawId) : new ObjectId(String(rawId))
    } catch (_) {
      return res.status(400).json({ detail: 'Invalid deposit_id' })
    }

    const deposit = await db.collection('deposits').findOne({ _id: oid })
    if (!deposit) {
      return res.status(404).json({ detail: 'Deposit not found' })
    }

    const st = String(deposit.status || '').toLowerCase()
    if (st !== 'blocked' && st !== 'reversed') {
      return res.status(400).json({ detail: 'Only blocked or reversed deposits can be unblocked' })
    }

    const stored = Number(deposit.reversed_amount_usd)
    const computed = principalCredited(deposit) + bonusCredited(deposit)
    const credit = Number.isFinite(stored) && stored > 0 ? stored : computed
    if (!Number.isFinite(credit) || credit <= 0) {
      return res.status(400).json({ detail: 'Could not determine amount to restore' })
    }

    if (!deposit.user_id) {
      return res.status(400).json({ detail: 'Deposit has no user_id' })
    }

    const now = new Date().toISOString()

    await db.collection('users').updateOne(
      { user_id: deposit.user_id },
      { $inc: { balance: credit }, $set: { updated_at: now } }
    )

    await db.collection('deposits').updateOne(
      { _id: oid },
      {
        $set: {
          status: 'completed',
          unblocked_at: now,
          unblocked_by: staff.claims.sub || staff.claims.user_id || null,
          updated_at: now,
        },
        $unset: { reversed_amount_usd: '' },
      }
    )

    res.json({ success: true, credited: credit })
  } catch (err) {
    console.error('deposits/unblock error:', err)
    res.status(500).json({ detail: err.message })
  }
}
