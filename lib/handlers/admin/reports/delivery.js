const { getDb } = require('../../_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const days = parseInt(req.query?.days, 10) || 30
    const from = new Date()
    from.setDate(from.getDate() - days)
    from.setHours(0, 0, 0, 0)
    const fromIso = from.toISOString()
    const orders = await db.collection('orders').find({ created_at: { $gte: fromIso } }).toArray()
    const summary = {
      completed: 0,
      partial: 0,
      pending: 0,
      cancelled: 0,
      in_progress: 0,
    }
    const byDay = {}
    orders.forEach((o) => {
      const s = String(o.status || '').toLowerCase()
      if (s in summary) summary[s] += 1
      const day = String(o.created_at || '').substring(0, 10)
      if (day) {
        byDay[day] ||= { date: day, delivered: 0, pending: 0 }
        if (s === 'completed' || s === 'partial') byDay[day].delivered += 1
        else byDay[day].pending += 1
      }
    })
    res.json({
      success: true,
      summary,
      by_day: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

