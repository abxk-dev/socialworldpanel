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
    const byDay = {}
    const byStatus = {}
    orders.forEach((o) => {
      const day = String(o.created_at || '').substring(0, 10)
      if (day) {
        byDay[day] ||= { date: day, orders: 0 }
        byDay[day].orders += 1
      }
      const s = o.status || 'unknown'
      byStatus[s] = (byStatus[s] || 0) + 1
    })
    res.json({
      success: true,
      summary: { total_orders: orders.length, by_status: byStatus },
      by_day: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

