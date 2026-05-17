const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')
const getUserId = require('../getUserId')

function safeInt(v, fallback = 0) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

function safeString(v) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

function generateNumericOrderId(seed = 0) {
  const ts = Date.now()
  const rand = Math.floor(Math.random() * 1000)
  const extra = Number.isFinite(seed) ? seed % 1000 : 0
  return String(ts * 1000000 + extra * 1000 + rand)
}

function toOrderChildDoc({
  massOrderId,
  index,
  link,
  quantity,
  delivery_type,
  drip_interval_minutes,
  now,
  service_id,
}) {
  const dripMs = safeInt(drip_interval_minutes, 0) * 60 * 1000
  const dripScheduledAt = delivery_type === 'drip' && dripMs > 0
    ? new Date(now.getTime() + index * dripMs)
    : null

  return {
    mass_order_id: massOrderId,
    mass_order_index: index,
    user_id: null, // filled by caller

    link: safeString(link),
    quantity: safeInt(quantity, 0),

    service_id,
    status: delivery_type === 'drip' ? 'pending_manual' : 'processing',
    created_at: now,

    drip_scheduled_at: dripScheduledAt ? dripScheduledAt.toISOString() : null,
    drip_sent: false,
    drip_sent_at: null,
  }
}

module.exports = {
  placeMassOrder: async (req, res) => {
    const db = await getDb()
    const userId = getUserId(req)

    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const service_id = safeString(body.service_id)
    const links = Array.isArray(body.links) ? body.links : []
    const delivery_type = body.delivery_type === 'drip' ? 'drip' : 'instant'
    const drip_interval_minutes = safeInt(body.drip_interval_minutes, 5)

    if (!service_id || links.length === 0) {
      return res.status(400).json({ error: 'service_id and links are required' })
    }

    const service = await db.collection('services').findOne({ service_id })
    if (!service) return res.status(404).json({ error: 'Service not found' })

    const rate = safeInt(service.rate ?? service.price ?? 0, 0)
    const min = safeInt(service.min_order ?? service.min ?? service.min_quantity ?? 0, 0)
    const max = safeInt(service.max_order ?? service.max ?? service.max_quantity ?? 1000000, 1000000)

    const now = new Date()
    const normalizedLinks = links
      .map((l, i) => ({
        link: safeString(l?.link || ''),
        quantity: safeInt(l?.quantity, min || 1),
        index: i,
      }))
      .filter((l) => l.link)
      .slice(0, 1000)

    if (normalizedLinks.length === 0) {
      return res.status(400).json({ error: 'No valid links' })
    }

    // Enforce min/max
    const qtys = normalizedLinks.map((l) => {
      const q = Math.max(min, Math.min(max, l.quantity))
      return q
    })

    const totalCharge = qtys.reduce((sum, q) => sum + ((rate / 1000) * q), 0)
    const user = await db.collection('users').findOne({ user_id: userId })
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (safeInt(user.balance, 0) < totalCharge) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    const massOrder = {
      user_id: userId,
      service_id: service.service_id || safeString(service_id),
      service_name: service.name || service.service_name || '',
      delivery_type,
      drip_interval_minutes: delivery_type === 'drip' ? drip_interval_minutes : null,
      status: 'processing',

      total_links: normalizedLinks.length,
      total_charge: totalCharge,
      orders_placed: delivery_type === 'instant' ? normalizedLinks.length : 0,
      orders_failed: 0,

      created_at: now,
      updated_at: now,
    }

    if (delivery_type === 'drip' && drip_interval_minutes > 0) {
      massOrder.drip_next_at = new Date(now.getTime() + drip_interval_minutes * 60 * 1000).toISOString()
    } else {
      massOrder.drip_next_at = null
    }

    const inserted = await db.collection('mass_orders').insertOne(massOrder)
    const massOrderId = inserted.insertedId.toString()

    // Deduct balance once.
    await db.collection('users').updateOne(
      { user_id: userId },
      { $inc: { balance: -totalCharge }, $set: { updated_at: now } }
    )

    const provider_id_val =
      service.provider_id != null && service.provider_id !== ''
        ? String(service.provider_id)
        : null

    // Create child "orders" that the UI can expand.
    const childDocs = normalizedLinks.map((l) => {
      const child = toOrderChildDoc({
        massOrderId,
        index: l.index,
        link: l.link,
        quantity: Math.max(min, Math.min(max, l.quantity)),
        delivery_type,
        drip_interval_minutes,
        now,
        service_id: massOrder.service_id,
      })
      child.user_id = userId
      child.price_per_1000 = rate
      child.charge = (rate / 1000) * child.quantity
      child.order_id = generateNumericOrderId(l.index)
      child.service_name = massOrder.service_name || service.name || ''
      child.provider_id = provider_id_val
      child.provider_order_id = null
      child.provider_charge = null
      child.price = child.charge
      child.rate = rate
      child.start_count = 0
      child.remains = child.quantity
      child.mode = 'Mass'
      child.category_id = service.category_id ? String(service.category_id) : null
      child.created_at = now.toISOString()
      child.updated_at = now.toISOString()
      return child
    })

    // Store them inside `orders` collection so existing order UIs can reuse.
    if (childDocs.length) {
      await db.collection('orders').insertMany(childDocs)
    }

    return res.json({
      success: true,
      message: 'Mass order placed',
      mass_order: { ...massOrder, _id: massOrderId },
    })
  },

  getUserMassOrders: async (req, res) => {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const page = Math.max(1, safeInt(req.query.page, 1))
    const limit = Math.max(1, Math.min(100, safeInt(req.query.limit, 20)))
    const skip = (page - 1) * limit

    const filter = { user_id: userId }
    const total = await db.collection('mass_orders').countDocuments(filter)
    const pages = Math.max(1, Math.ceil(total / limit))

    const docs = await db.collection('mass_orders')
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const mass_orders = docs.map((d) => ({
      ...d,
      _id: d._id?.toString ? d._id.toString() : d._id,
      mass_order_id: d._id?.toString ? d._id.toString() : d._id,
      total_links: d.total_links ?? 0,
      total_charge: d.total_charge ?? 0,
      orders_placed: d.orders_placed ?? 0,
      orders_failed: d.orders_failed ?? 0,
    }))

    return res.json({
      success: true,
      mass_orders,
      pages,
    })
  },

  getMassOrderDetail: async (req, res) => {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const id = safeString(req.params?.id)
    const idFilter = [{ mass_order_id: id }]
    if (ObjectId.isValid(id)) idFilter.push({ _id: new ObjectId(id) })
    const doc = await db.collection('mass_orders').findOne({
      user_id: userId,
      $or: idFilter,
    })

    if (!doc) return res.status(404).json({ error: 'Mass order not found' })

    return res.json({
      ...doc,
      _id: doc._id?.toString ? doc._id.toString() : doc._id,
      mass_order_id: doc._id?.toString ? doc._id.toString() : doc._id,
    })
  },

  getMassOrderChildren: async (req, res) => {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const id = safeString(req.params?.id)
    const limit = Math.max(1, Math.min(500, safeInt(req.query.limit, 100)))

    // Child docs are stored in `orders` collection with `mass_order_id` + `mass_order_index`.
    const children = await db.collection('orders')
      .find({ 
        user_id: userId,
        mass_order_id: id,
      })
      .sort({ mass_order_index: 1, created_at: -1 })
      .limit(limit)
      .toArray()

    return res.json({
      success: true,
      orders: children.map((c) => ({
        ...c,
        _id: c._id?.toString ? c._id.toString() : c._id,
        mass_order_index: c.mass_order_index ?? 0,
        quantity: c.quantity ?? 0,
        link: safeString(c.link),
      })),
    })
  },

  // Admin endpoints expected by `routes/admin.js`.
  adminListMassOrders: async (req, res) => {
    res.json({ success: true, mass_orders: [], total: 0, page: 1, pages: 1 });
  },
  adminGetMassOrder: async (req, res) => {
    res.json({ success: true, mass_order: null });
  },
  adminCancelMassOrder: async (req, res) => {
    res.json({ success: true });
  },
}

