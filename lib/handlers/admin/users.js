const { getDb } = require('../_db')
const { expandUserIdsForIn } = require('../../mongoUserId')
const { buildAdminUsersFilter } = require('../../buildAdminUsersFilter')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const page = parseInt(req.query?.page, 10) || 1
    const limit = parseInt(req.query?.limit, 10) || 20
    const skip = (page - 1) * limit

    const filter = buildAdminUsersFilter(req.query || {})

    const [users, total, locCodes, topCodes] = await Promise.all([
      db.collection('users')
        .find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('users').countDocuments(filter),
      db.collection('users').distinct('location.country_code'),
      db.collection('users').distinct('country_code'),
    ])

    const countries = [
      ...new Set(
        [...(locCodes || []), ...(topCodes || [])]
          .filter(Boolean)
          .map((c) => String(c).trim().toUpperCase().slice(0, 2))
          .filter((c) => c.length === 2)
      ),
    ].sort()

    const uidList = [...new Set(users.map((u) => String(u.user_id)).filter(Boolean))]
    const uidMatchList = expandUserIdsForIn(uidList)
    let latestFromHistory = {}
    if (uidMatchList.length) {
      const rows = await db
        .collection('user_login_history')
        .aggregate([
          { $match: { user_id: { $in: uidMatchList } } },
          { $sort: { logged_in_at: -1 } },
          {
            $group: {
              _id: '$user_id',
              last_ip: { $first: '$ip_address' },
              last_at: { $first: '$logged_in_at' },
            },
          },
        ])
        .toArray()
      for (const r of rows) {
        const id = String(r._id)
        latestFromHistory[id] = {
          ip: r.last_ip ? String(r.last_ip) : null,
          at: r.last_at || null,
        }
      }
    }

    const safeUsers = users.map((u) => {
      const { password_hash, password, ...safe } = u
      const uid = String(safe.user_id || '')
      const hist = uid ? latestFromHistory[uid] : null
      const displayIp = safe.last_login_ip || safe.last_ip || hist?.ip || null
      const displayAt = safe.last_login_at || hist?.at || null
      return {
        ...safe,
        last_login_ip: displayIp || safe.last_login_ip,
        last_login_at: displayAt || safe.last_login_at,
      }
    })

    res.json({
      success: true,
      users: safeUsers,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      limit,
      countries,
    })
  } catch (err) {
    console.error('listUsers error:', err)
    res.status(500).json({ error: err.message })
  }
}

