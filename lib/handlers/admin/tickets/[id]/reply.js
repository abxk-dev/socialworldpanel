const { ObjectId } = require('mongodb')
const { getDb } = require('./_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const id = String(req.params?.id || '')
    const message = String(req.body?.message || '').trim()
    if (!message) return res.status(400).json({ error: 'Message is required' })

    const idFilters = [{ ticket_id: id }]
    const numericId = Number(id)
    if (Number.isFinite(numericId)) idFilters.push({ ticket_id: numericId })
    if (ObjectId.isValid(id)) idFilters.push({ _id: new ObjectId(id) })
    const ticket = await db.collection('tickets').findOne({ $or: idFilters })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })

    const reply = {
      message_id: `msg_${Date.now()}`,
      message,
      is_admin: true,
      created_at: new Date().toISOString(),
    }

    await db.collection('tickets').updateOne(
      { _id: ticket._id },
      {
        $push: { replies: reply },
        $set: { status: 'answered', updated_at: new Date().toISOString() },
      }
    )

    res.json({ success: true, reply })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

