const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')
const getUserId = require('../../../getUserId')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    const id = req.params?.id
    const message = req.body?.message

    if (!userId || !id) return res.status(401).json({ error: 'Unauthorized' })
    if (!message || !String(message).trim()) return res.status(400).json({ error: 'Message is required' })

    const idFilters = [{ ticket_id: id }]
    if (ObjectId.isValid(id)) idFilters.push({ _id: new ObjectId(id) })
    const ticket = await db.collection('tickets').findOne({
      $or: idFilters,
      user_id: userId,
    })

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })

    const reply = {
      message: String(message),
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await db.collection('tickets').updateOne(
      { _id: ticket._id },
      {
        $push: { replies: reply },
        $set: { status: ticket.status === 'closed' ? 'closed' : 'open', updated_at: new Date().toISOString() },
      }
    )

    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
