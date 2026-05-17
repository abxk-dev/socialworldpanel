const { getDb } = require('../_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const status = String(url.searchParams.get('status') || 'all')
    const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10)))
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const skip = (page - 1) * limit

    const filter = {}
    if (status !== 'all') filter.status = status

    const [total, open_count, answered_count] = await Promise.all([
      db.collection('tickets').countDocuments(filter),
      db.collection('tickets').countDocuments(status === 'all' ? { status: 'open' } : { ...filter, status: 'open' }),
      db.collection('tickets').countDocuments(status === 'all' ? { status: 'answered' } : { ...filter, status: 'answered' }),
    ])

    const docs = await db.collection('tickets')
      .find(filter)
      .sort({ updated_at: -1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const userIds = Array.from(new Set(docs.map(t => t.user_id).filter(Boolean)))
    const users = userIds.length
      ? await db.collection('users')
          .find(
            { user_id: { $in: userIds } },
            { projection: { _id: 0, user_id: 1, username: 1, full_name: 1, name: 1, email: 1 } }
          )
          .toArray()
      : []
    const userById = new Map(users.map(u => [u.user_id, u]))

    let awaiting_count = 0
    const tickets = docs.map((t) => {
      const u = t.user_id ? userById.get(t.user_id) : null
      const replies = Array.isArray(t.replies) ? t.replies : []
      const lastUserAt = [
        t.created_at,
        ...replies.filter(r => r && r.is_admin !== true).map(r => r.created_at || r.updated_at),
      ].filter(Boolean).sort().slice(-1)[0] || null
      const lastAdminViewedAt = t.last_admin_viewed_at || null
      const awaiting_admin = t.status !== 'closed' && !!(lastUserAt && (!lastAdminViewedAt || lastUserAt > lastAdminViewedAt))
      if (awaiting_admin) awaiting_count += 1

      return {
        ...t,
        _id: t._id ? String(t._id) : undefined,
        ticket_id: t.ticket_id != null ? String(t.ticket_id) : (t._id ? String(t._id) : undefined),
        user_username: u?.username || null,
        user_name: u?.full_name || u?.name || null,
        user_email: u?.email || null,
        awaiting_admin,
      }
    })

    res.json({ success: true, tickets, total, open_count, answered_count, awaiting_count, page, limit })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
