const { getDb } = require('../_db')
const getUserId = require('../../getUserId')

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const countOnly = url.searchParams.get('count_only') === '1'

  if (req.method === 'POST') {
    const { subject, message, priority, order_id } = req.body
    if (!subject || !message) {
      return res.status(400).json({ 
        error: 'Subject and message required' 
      })
    }

    const now = new Date().toISOString()
    const ticket = {
      user_id: userId,
      subject,
      message,
      priority: priority || 'normal',
      order_id: order_id || null,
      status: 'open',
      replies: [],
      created_at: now,
      updated_at: now,
      last_user_viewed_at: now,
      last_admin_viewed_at: null,
    }

    const result = await db.collection('tickets').insertOne(ticket)
    const ticket_id = String(result.insertedId)
    await db.collection('tickets').updateOne(
      { _id: result.insertedId },
      { $set: { ticket_id, updated_at: new Date().toISOString() } }
    )

    return res.json({ 
      success: true, 
      ticket: { ...ticket, _id: ticket_id, ticket_id } 
    })
  }

  const docs = await db.collection('tickets')
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray()

  const tickets = docs.map((t) => {
    const replies = Array.isArray(t.replies) ? t.replies : []
    const lastAdminReplyAt = replies
      .filter(r => r && r.is_admin === true)
      .map(r => r.created_at || r.updated_at)
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || null
    const lastUserViewedAt = t.last_user_viewed_at || t.created_at || null
    const unread_by_user = !!(lastAdminReplyAt && (!lastUserViewedAt || lastAdminReplyAt > lastUserViewedAt))
    return {
      ...t,
      _id: t._id ? String(t._id) : undefined,
      ticket_id: t.ticket_id != null ? String(t.ticket_id) : (t._id ? String(t._id) : undefined),
      unread_by_user,
      last_admin_reply_at: lastAdminReplyAt,
    }
  })

  if (countOnly) {
    const count = tickets.filter(t => t.unread_by_user === true).length
    return res.json({ success: true, count })
  }

  res.json({ success: true, tickets })
}
