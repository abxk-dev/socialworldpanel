const { getDb } = require('../_db')

const DEFAULT_VIRTUAL_STATS = {
  base_orders: 0,
  base_users: 0,
  base_services: 0,
  base_orders_today: 0,
  auto_increment: false,
  increment_min: 1,
  increment_max: 5,
  increment_interval: 5,
}

const parseNum = (v, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

module.exports = async (req, res) => {
  try {
    const db = await getDb()

    if (req.method === 'GET') {
      const settings = await db.collection('admin_settings').findOne(
        { panel_name: { $exists: true } },
        { projection: { virtual_stats: 1 } }
      )
      const vs = settings?.virtual_stats || {}
      return res.json({
        ...DEFAULT_VIRTUAL_STATS,
        ...vs,
      })
    }

    if (req.method === 'PUT') {
      const body = req.body && typeof req.body === 'object' ? req.body : {}
      const virtual_stats = {
        base_orders: parseNum(body.base_orders, 0),
        base_users: parseNum(body.base_users, 0),
        base_services: parseNum(body.base_services, 0),
        base_orders_today: parseNum(body.base_orders_today, 0),
        auto_increment: body.auto_increment === true,
        increment_min: Math.max(1, parseNum(body.increment_min, 1)),
        increment_max: Math.max(1, parseNum(body.increment_max, 5)),
        increment_interval: Math.max(1, parseNum(body.increment_interval, 5)),
      }

      await db.collection('admin_settings').updateOne(
        { panel_name: { $exists: true } },
        {
          $set: {
            virtual_stats,
            updated_at: new Date().toISOString(),
          },
          $setOnInsert: { panel_name: 'Social World Panel' },
        },
        { upsert: true }
      )

      return res.json({ success: true, stats: virtual_stats })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

