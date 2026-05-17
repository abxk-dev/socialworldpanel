const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')

function asString(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

function asInt(v, fallback = 0) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

function asNumber(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function computeCostFromRate(ratePer1000, quantity) {
  const rate = asNumber(ratePer1000, 0)
  const qty = asInt(quantity, 0)
  return (rate / 1000) * qty
}

function normalizeServiceRate(service = {}) {
  // Many schemas use `rate` (per 1000) but we fall back defensively.
  return asNumber(service.rate ?? service.price_per_1000 ?? service.price ?? 0, 0)
}

function normalizeMinMax(service = {}) {
  const min = asInt(service.min_order ?? service.min ?? service.min_quantity ?? 0, 0)
  const max = asInt(service.max_order ?? service.max ?? service.max_quantity ?? 1000000, 1000000)
  return { min, max }
}

function isServiceAvailable(service = {}) {
  if (!service) return false
  // Common flags across schemas
  const isActive = service.is_active ?? service.active ?? service.enabled ?? true
  return isActive === true
}

function normalizeOrderId(orderIdLike) {
  // orderId is usually a string from Mongo ObjectId.
  const s = asString(orderIdLike).trim()
  return s
}

async function getOrderForUser(db, userId, orderIdLike) {
  const orderId = normalizeOrderId(orderIdLike)
  const filterBase = { user_id: new ObjectId(userId) }

  const or = []
  if (orderId) {
    or.push({ _id: new ObjectId(orderId) })
    or.push({ order_id: orderId })
  }

  // If orderId was not a valid ObjectId, the new ObjectId(orderId) above may throw.
  // Caller should catch and treat as not found.
  return db.collection('orders').findOne({
    ...filterBase,
    $or: or.length ? or : undefined,
  })
}

module.exports = {
  // Used by dashboard to show quick cards.
  getFrequentlyReordered: async (req, res) => {
    const db = await getDb()
    const userId = req.user?._id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    // We consider "completed" in a case-insensitive/robust way.
    const completedStatuses = ['completed', 'Completed']
    const recent = await db.collection('orders')
      .find({
        user_id: new ObjectId(userId),
        status: { $in: completedStatuses },
      })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray()

    const keyTo = new Map()
    for (const o of recent) {
      const serviceId = o.service_id?.toString ? o.service_id.toString() : asString(o.service_id)
      const link = asString(o.link).trim()
      if (!serviceId || !link) continue

      const key = `${serviceId}::${link}`
      const existing = keyTo.get(key)
      if (!existing) {
        keyTo.set(key, {
          order_id: o._id?.toString?.() ?? asString(o.order_id),
          service_id: serviceId,
          service_name: o.service_name ?? '',
          link,
          quantity: o.quantity ?? 0,
          order_count: 1,
          current_charge: o.charge ?? null,
          service_available: true,
        })
      } else {
        existing.order_count += 1
        // Keep latest values for better UX.
        existing.quantity = o.quantity ?? existing.quantity
        existing.service_name = o.service_name ?? existing.service_name
        existing.order_id = o._id?.toString?.() ?? existing.order_id
      }
    }

    const items = Array.from(keyTo.values()).slice(0, 10)
    if (items.length === 0) {
      return res.json({ success: true, frequently_reordered: [] })
    }

    // Preload services for availability + current pricing.
    const serviceIds = items.map((i) => i.service_id).filter(Boolean)
    const services = await db.collection('services')
      .find({
        $or: [
          { service_id: { $in: serviceIds } },
          { _id: { $in: serviceIds.map((id) => {
              try { return new ObjectId(id) } catch { return null }
            }).filter(Boolean) } },
        ],
      })
      .toArray()

    const byServiceId = new Map()
    for (const s of services) {
      const sid = s.service_id ?? s._id?.toString?.()
      if (!sid) continue
      byServiceId.set(sid.toString(), s)
    }

    const enriched = items.map((it) => {
      const service = byServiceId.get(it.service_id)
      const rate = service ? normalizeServiceRate(service) : normalizeServiceRate({})
      const { min, max } = service ? normalizeMinMax(service) : { min: 0, max: 1000000 }
      const qty = asInt(it.quantity, min)
      const current_charge = service ? computeCostFromRate(rate, qty) : it.current_charge ?? null

      return {
        ...it,
        service_available: service ? isServiceAvailable(service) : false,
        // Keep a consistent field name used by UI.
        current_charge,
      }
    })

    return res.json({ success: true, frequently_reordered: enriched })
  },

  // Used by ReorderModal.
  getReorderData: async (req, res) => {
    const db = await getDb()
    const userId = req.user?._id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const orderIdLike = req.params?.orderId
    if (!orderIdLike) return res.status(400).json({ error: 'orderId is required' })

    let order = null
    try {
      order = await db.collection('orders').findOne({
        user_id: new ObjectId(userId),
        $or: [
          { _id: new ObjectId(orderIdLike) },
          { order_id: normalizeOrderId(orderIdLike) },
        ],
      })
    } catch {
      order = null
    }

    if (!order) return res.status(404).json({ error: 'Order not found' })

    const serviceIdRaw = order.service_id
    const serviceById = (() => {
      if (serviceIdRaw?.toString) return { as: serviceIdRaw.toString(), mongo: serviceIdRaw }
      return { as: asString(serviceIdRaw), mongo: null }
    })()

    const serviceOr = []
    if (serviceById.mongo) serviceOr.push({ _id: serviceById.mongo })
    if (serviceById.as) {
      try { serviceOr.push({ _id: new ObjectId(serviceById.as) }) } catch {}
      serviceOr.push({ service_id: serviceById.as })
    }

    const service = await db.collection('services')
      .findOne(serviceOr.length ? { $or: serviceOr } : {})
      .catch(() => null)

    const serviceAvailable = !!service && isServiceAvailable(service)
    const rate = service ? normalizeServiceRate(service) : 0
    const { min, max } = service ? normalizeMinMax(service) : { min: 0, max: 1000000 }

    const originalQty = asInt(order.quantity, 0)
    const originalCharge = asNumber(order.charge ?? 0, 0)
    const newChargeForOriginalQty = computeCostFromRate(rate, originalQty)

    const priceChanged = serviceAvailable && asNumber(originalCharge, 0) > 0
      ? Math.abs(newChargeForOriginalQty - originalCharge) > 0.01
      : serviceAvailable
        ? newChargeForOriginalQty > 0
        : false

    const priceDirection = priceChanged
      ? newChargeForOriginalQty > originalCharge
        ? 'up'
        : 'down'
      : null

    const user = await db.collection('users')
      .findOne({ _id: new ObjectId(userId) }, { projection: { balance: 1 } })

    const userBalance = asNumber(user?.balance, 0)
    const hasSufficientBalance = userBalance - newChargeForOriginalQty >= 0

    return res.json({
      success: true,
      service_available: serviceAvailable,
      has_sufficient_balance: hasSufficientBalance,
      price_changed: priceChanged,
      price_direction: priceDirection,
      user_balance: userBalance,

      original_charge: originalCharge,

      service: {
        min_order: min,
        max_order: max,
        price_per_1000: rate,
      },

      prefill: {
        link: asString(order.link),
        quantity: originalQty,
        service_name: asString(order.service_name ?? service?.name ?? ''),
      },
    })
  },

  // Creates a new Pending order from an old order.
  confirmReorder: async (req, res) => {
    const db = await getDb()
    const userId = req.user?._id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const orderIdLike = req.params?.orderId
    if (!orderIdLike) return res.status(400).json({ error: 'orderId is required' })

    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const link = asString(body.link).trim()
    const quantity = asInt(body.quantity, NaN)

    if (!link) return res.status(400).json({ error: 'link is required' })
    if (!Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ error: 'quantity is required' })

    let order = null
    try {
      order = await db.collection('orders').findOne({
        user_id: new ObjectId(userId),
        $or: [
          { _id: new ObjectId(orderIdLike) },
          { order_id: normalizeOrderId(orderIdLike) },
        ],
      })
    } catch {
      order = null
    }

    if (!order) return res.status(404).json({ error: 'Order not found' })

    const serviceIdRaw = order.service_id
    const serviceOr = []
    if (serviceIdRaw?.toString) {
      try { serviceOr.push({ _id: new ObjectId(serviceIdRaw.toString()) }) } catch {}
    }
    const serviceIdStr = asString(serviceIdRaw)
    if (serviceIdStr) serviceOr.push({ service_id: serviceIdStr })

    const service = await db.collection('services')
      .findOne(serviceOr.length ? { $or: serviceOr } : {})
      .catch(() => null)

    if (!service || !isServiceAvailable(service)) {
      return res.status(400).json({ error: 'Service no longer available' })
    }

    const { min, max } = normalizeMinMax(service)
    const safeQty = Math.max(min, Math.min(max, quantity))

    const rate = normalizeServiceRate(service)
    const cost = computeCostFromRate(rate, safeQty)

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    const userBalance = asNumber(user?.balance, 0)
    if (userBalance < cost) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    const newOrderObjectId = new ObjectId()
    const orderIdString = newOrderObjectId.toString()
    const now = new Date()

    const newOrder = {
      _id: newOrderObjectId,
      order_id: orderIdString,
      user_id: new ObjectId(userId),
      service_id: service.service_id ? service.service_id : service._id,
      service_name: service.name ?? order.service_name ?? '',
      category: service.category ?? order.category ?? null,
      link,
      quantity: safeQty,
      custom_comments: null,
      charge: cost,
      rate,
      start_count: 0,
      remains: safeQty,
      status: 'Pending',
      created_at: now,
      updated_at: now,
      reorder_of: order._id ?? order.order_id ?? null,
    }

    await db.collection('orders').insertOne(newOrder)
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $inc: { balance: -cost } }
    )

    return res.json({
      success: true,
      message: 'Order placed successfully',
      new_order_id: orderIdString,
      order: newOrder,
    })
  },
}

