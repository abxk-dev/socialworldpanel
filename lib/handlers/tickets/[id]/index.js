const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')
const getUserId = require('../../../getUserId')

function safeString(v) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    const id = safeString(req.params?.id)

    if (!userId || !id) return res.status(401).json({ error: 'Unauthorized' })

    const idFilters = [{ ticket_id: id }]
    if (ObjectId.isValid(id)) idFilters.push({ _id: new ObjectId(id) })

    const ticket = await db.collection('tickets').findOne({
      $or: idFilters,
      user_id: userId,
    })

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })

    await db.collection('tickets').updateOne(
      { _id: ticket._id },
      { $set: { last_user_viewed_at: new Date().toISOString() } }
    )

    const replies = Array.isArray(ticket.replies) ? ticket.replies : []
    const messages = replies.map((r, idx) => ({
      message_id: r.message_id ? safeString(r.message_id) : (r._id ? r._id.toString() : String(idx)),
      message: r.message ?? '',
      created_at: r.created_at ?? r.updated_at ?? new Date().toISOString(),
      is_admin: r.is_admin === true,
    }))

    return res.json({
      success: true,
      ticket,
      messages,
      user: { user_id: userId },
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
