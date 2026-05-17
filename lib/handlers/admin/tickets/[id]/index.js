const { ObjectId } = require('mongodb')
const { getDb } = require('./_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const id = String(req.params?.id || '')
    const idFilters = [{ ticket_id: id }]
    const numericId = Number(id)
    if (Number.isFinite(numericId)) idFilters.push({ ticket_id: numericId })
    if (ObjectId.isValid(id)) idFilters.push({ _id: new ObjectId(id) })
    const ticket = await db.collection('tickets').findOne({ $or: idFilters })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })

    await db.collection('tickets').updateOne(
      { _id: ticket._id },
      { $set: { last_admin_viewed_at: new Date().toISOString() } }
    )

    const user = ticket.user_id
      ? await db.collection('users').findOne(
          { user_id: ticket.user_id },
          { projection: { user_id: 1, username: 1, email: 1, full_name: 1 } }
        )
      : null

    const replies = Array.isArray(ticket.replies) ? ticket.replies : []
    const messages = replies.map((r, i) => ({
      message_id: r.message_id || `msg_${i}`,
      is_admin: r.is_admin === true,
      message: r.message || '',
      created_at: r.created_at || new Date().toISOString(),
    }))

    res.json({ success: true, ticket, messages, user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
