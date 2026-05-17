const { getDb } = require('./_db')
const getUserId = require('../getUserId')

function safeDate(d) {
  try {
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return null
    return dt
  } catch {
    return null
  }
}

function toISODate(dt) {
  return dt.toISOString().split('T')[0]
}

function getRange(req) {
  const fromStr = req.query?.from
  const toStr = req.query?.to
  const now = new Date()

  let from = fromStr ? safeDate(fromStr) : null
  let to = toStr ? safeDate(toStr) : null

  // Default: last 30 days
  if (!to) to = now
  if (!from) {
    from = new Date(to)
    from.setDate(from.getDate() - 30)
  }
  return { from, to }
}

async function fetchOrdersInRange(db, userId, from, to) {
  // DB may store created_at as ISO string; we defensively filter in JS after fetch.
  const orders = await db.collection('orders')
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(2000)
    .toArray()

  const filtered = orders.filter((o) => {
    const dt = safeDate(o.created_at)
    if (!dt) return false
    return dt >= from && dt <= to
  })

  return filtered
}

async function getDashboard(req, res) {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const { from, to } = getRange(req)
  const user = await db.collection('users').findOne({ user_id: userId }, { projection: { total_spent: 1 } })

  const orders = await fetchOrdersInRange(db, userId, from, to)

  const totals = orders.reduce(
    (acc, o) => {
      const amt = Number(o.charge || 0)
      acc.total_orders_in_range++
      acc.range_spent += amt
      const s = String(o.status || '').toLowerCase()
      if (s === 'completed') acc.completed_orders++
      else if (s === 'pending') acc.pending_orders++
      else if (s === 'failed') acc.failed_orders++
      return acc
    },
    { total_orders_in_range: 0, range_spent: 0, completed_orders: 0, pending_orders: 0, failed_orders: 0 }
  )

  const avg_order_value = totals.total_orders_in_range > 0 ? totals.range_spent / totals.total_orders_in_range : 0

  // Top services for charts (Frontend expects `total_spent` per entry)
  const byService = {}
  for (const o of orders) {
    const name = o.service_name || 'Unknown'
    if (!byService[name]) byService[name] = { service_name: name, total_spent: 0 }
    byService[name].total_spent += Number(o.charge || 0)
  }
  const top_services = Object.values(byService).sort((a, b) => b.total_spent - a.total_spent).slice(0, 10)

  res.json({
    success: true,
    top_services,
    platform_breakdown: [],
    loyalty: null,
    insights: [],
    stats: {
      range_spent: totals.range_spent,
      all_time_spent: Number(user?.total_spent || 0),
      this_month_spent: totals.range_spent,
      total_orders_in_range: totals.total_orders_in_range,
      completed_orders: totals.completed_orders,
      pending_orders: totals.pending_orders,
      failed_orders: totals.failed_orders,
      avg_order_value,
    },
  })
}

async function getSpendingChart(req, res) {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const { from, to } = getRange(req)

  const orders = await fetchOrdersInRange(db, userId, from, to)

  const byDay = {}
  for (const o of orders) {
    const dt = safeDate(o.created_at)
    if (!dt) continue
    const day = toISODate(dt)
    if (!byDay[day]) byDay[day] = { date: day, spent: 0, orders: 0 }
    byDay[day].spent += Number(o.charge || 0)
    byDay[day].orders += 1
  }

  const chart_data = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))
  res.json({ success: true, chart_data })
}

async function getTopServices(req, res) {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const { from, to } = getRange(req)
  const orders = await fetchOrdersInRange(db, userId, from, to)

  const byService = {}
  for (const o of orders) {
    const name = o.service_name || 'Unknown'
    if (!byService[name]) byService[name] = { service_name: name, count: 0, total_spent: 0 }
    byService[name].count += 1
    byService[name].total_spent += Number(o.charge || 0)
  }

  const top_services = Object.values(byService).sort((a, b) => b.total_spent - a.total_spent).slice(0, 5)
  res.json({ success: true, top_services })
}

async function getRecentActivity(req, res) {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const orders = await db.collection('orders')
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(10)
    .toArray()

  const activity = orders.map((o) => ({
    type: 'order',
    id: o.order_id || o._id?.toString?.() || null,
    title: o.service_name || 'Order',
    subtitle: String(o.status || ''),
    amount: -Number(o.charge || 0),
    created_at: o.created_at,
    status: o.status,
  }))

  res.json({ success: true, activity })
}

// Backward compat with older handler name in older codepaths.
const getUserAnalytics = getDashboard

module.exports = {
  getDashboard,
  getSpendingChart,
  getTopServices,
  getRecentActivity,
  getUserAnalytics,
}

