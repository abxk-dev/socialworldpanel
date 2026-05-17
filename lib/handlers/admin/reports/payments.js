const { getDb } = require('../../_db')

function parseDateRange(req) {
  const start = req.query?.start_date
  const end = req.query?.end_date
  let fromIso
  let toIso
  if (start) {
    const a = new Date(start)
    if (!Number.isNaN(a.getTime())) fromIso = a.toISOString()
  }
  if (end) {
    const b = new Date(end)
    if (!Number.isNaN(b.getTime())) toIso = b.toISOString()
  }
  if (!fromIso) {
    const days = Math.max(1, Math.min(366, parseInt(req.query?.days, 10) || 30))
    const from = new Date()
    from.setDate(from.getDate() - days)
    from.setHours(0, 0, 0, 0)
    fromIso = from.toISOString()
  }
  if (!toIso) {
    toIso = new Date().toISOString()
  }
  return { fromIso, toIso }
}

function rowAmount(d) {
  const u = d.amount_usd
  if (u != null && u !== '' && Number.isFinite(Number(u))) return Number(u)
  return Number(d.amount_inr ?? d.amount_php ?? d.amount ?? 0)
}

function rowBonus(d) {
  return Number(d.bonus_amount ?? d.bonus ?? 0)
}

function isCreditedStatus(s) {
  const x = String(s || '').toLowerCase()
  return x === 'completed' || x === 'success'
}

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const { fromIso, toIso } = parseDateRange(req)
    const limit = Math.max(1, Math.min(2000, parseInt(req.query?.limit, 10) || 1000))

    const fromDate = new Date(fromIso)
    const toDate = new Date(toIso)
    const filter = {
      $or: [
        { created_at: { $gte: fromIso, $lte: toIso } },
        { created_at: { $gte: fromDate, $lte: toDate } },
      ],
    }

    const proj = {
      amount: 1,
      amount_usd: 1,
      amount_inr: 1,
      amount_php: 1,
      bonus_amount: 1,
      bonus: 1,
      status: 1,
      payment_type: 1,
      method: 1,
      created_at: 1,
    }

    let totalDeposits = 0
    let totalAmount = 0
    let totalBonus = 0
    let totalCredited = 0
    const byDay = {}
    const byMethod = {}

    const scan = db.collection('deposits').find(filter, { projection: proj })
    for await (const d of scan) {
      totalDeposits += 1
      const amount = rowAmount(d)
      const bonus = rowBonus(d)
      totalAmount += amount
      totalBonus += bonus
      if (isCreditedStatus(d.status)) {
        totalCredited += amount + bonus
      }
      const day = String(d.created_at || '').substring(0, 10)
      if (day) {
        if (!byDay[day]) byDay[day] = { date: day, amount: 0, count: 0 }
        byDay[day].amount += amount
        byDay[day].count += 1
      }
      const key = d.payment_type || d.method || 'unknown'
      const label = String(key).replace(/_/g, ' ')
      if (!byMethod[key]) {
        byMethod[key] = { method: label, count: 0, amount: 0, bonus: 0 }
      }
      byMethod[key].count += 1
      byMethod[key].amount += amount
      byMethod[key].bonus += bonus
    }

    const recentRaw = await db
      .collection('deposits')
      .find(filter)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray()

    const userIds = [...new Set(recentRaw.map((d) => d.user_id).filter(Boolean))]
    const users = userIds.length
      ? await db
          .collection('users')
          .find({ user_id: { $in: userIds } })
          .project({ user_id: 1, username: 1, email: 1 })
          .toArray()
      : []
    const byUid = Object.fromEntries(users.map((u) => [u.user_id, u]))

    const recent_deposits = recentRaw.map((d) => {
      const u = d.user_id ? byUid[d.user_id] : null
      const methodKey = d.payment_type || d.method || 'unknown'
      return {
        deposit_id: String(d._id),
        user_id: d.user_id,
        username: d.username || u?.username || '',
        email: d.user_email || d.email || u?.email || null,
        amount: rowAmount(d),
        bonus_amount: rowBonus(d),
        status: d.status || 'unknown',
        method: methodKey,
        source: String(methodKey).replace(/_/g, ' '),
        created_at: d.created_at,
      }
    })

    res.json({
      success: true,
      summary: {
        total_deposits: totalDeposits,
        total_amount: totalAmount,
        total_bonus: totalBonus,
        total_credited: totalCredited,
        total_count: totalDeposits,
      },
      by_method: Object.values(byMethod).sort((a, b) => b.amount - a.amount),
      by_day: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
      recent_deposits,
    })
  } catch (err) {
    console.error('reports/payments error:', err)
    res.status(500).json({ error: err.message, detail: err.message })
  }
}
