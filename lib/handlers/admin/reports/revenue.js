const { getDb } = require('../../_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const days = parseInt(req.query?.days, 10) || 30
    const from = new Date()
    from.setDate(from.getDate() - days)
    from.setHours(0, 0, 0, 0)
    const fromIso = from.toISOString()

    const orders = await db.collection('orders')
      .find({
        created_at: { $gte: fromIso },
        status: { $in: ['completed', 'partial'] },
      })
      .toArray()

    let totalRevenue = 0
    let totalCost = 0
    const byDay = {}
    const byPaymentMethod = {}

    orders.forEach((o) => {
      const revenue = parseFloat(o.price || o.charge || 0)
      const cost = parseFloat(o.provider_cost || 0)
      totalRevenue += revenue
      totalCost += cost
      const day = String(o.created_at || '').substring(0, 10)
      if (day) {
        byDay[day] ||= { date: day, revenue: 0, cost: 0, profit: 0, orders: 0 }
        byDay[day].revenue += revenue
        byDay[day].cost += cost
        byDay[day].profit += (revenue - cost)
        byDay[day].orders += 1
      }
      const method = o.mode || o.method || 'unknown'
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + revenue
    })

    const totalProfit = totalRevenue - totalCost
    const profitMargin = totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0

    res.json({
      success: true,
      summary: {
        total_revenue: totalRevenue,
        total_cost: totalCost,
        total_profit: totalProfit,
        profit_margin: profitMargin,
        total_orders: orders.length,
      },
      by_day: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
      by_payment_method: Object.entries(byPaymentMethod).map(([method, amount]) => ({ method, amount })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

