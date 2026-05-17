const { getDb } = require('../_db')
const getUserId = require('../../getUserId')
const { ObjectId } = require('mongodb')
const { providerFetchOrderStatus } = require('../../providerSmmApi')
const { creditReferralCommissionOnOrderCompleted } = require('../../referralCommission')
const { getCache, setCache, invalidateAllOrderLists } = require('../../cache/orderListCache')
const { placeOrderForUser } = require('../../orderPlacementInternal')
const { runPostOrderHooks } = require('../../postOrderHooks')

function serviceRefillMeta(serviceDoc) {
  if (!serviceDoc) return { supported: false, refill_days: 30 }
  const supported = !!(
    serviceDoc.refill === true ||
    serviceDoc.refill_enabled === true ||
    serviceDoc.allow_refill === true ||
    serviceDoc.refill === 'true'
  )
  return {
    supported,
    refill_days: serviceDoc.refill_days ?? 30,
  }
}

function formatUserOrderRow(order, nameByServiceId, metaByServiceId) {
  const sid = order.service_id != null ? String(order.service_id) : ''
  const storedServiceName =
    order.service_name != null ? String(order.service_name).trim() : ''
  const lookedUpServiceName = sid ? nameByServiceId[sid] : null
  const shouldOverrideStoredName =
    !storedServiceName ||
    storedServiceName === sid ||
    storedServiceName.startsWith('srv_')
  const resolvedName = shouldOverrideStoredName
    ? (lookedUpServiceName || storedServiceName || null)
    : storedServiceName
  const rawPc = order.provider_charge ?? order.provider_cost
  let provider_charge = null
  if (rawPc != null && rawPc !== '') {
    const n = Number(rawPc)
    if (Number.isFinite(n)) provider_charge = n
  }
  const sm = sid && metaByServiceId ? metaByServiceId[sid] : null
  const refillMeta = sm ? serviceRefillMeta(sm) : { supported: false, refill_days: 30 }
  return {
    ...order,
    id: order.order_id,
    user: order.user_id,
    service_name: resolvedName || sid || null,
    charge: Number(order.charge ?? order.price ?? 0),
    provider_charge,
    provider_order_id: order.provider_order_id ?? null,
    status: order.status,
    remains: order.remains ?? order.quantity ?? null,
    created_at: order.created_at,
    refill_enabled: refillMeta.supported,
    refill_days: refillMeta.refill_days,
    service_refill_supported: refillMeta.supported,
  }
}

function buildServiceLookupKeys(raw) {
  const keys = new Set()
  if (raw == null) return []
  const asStr = String(raw).trim()
  if (asStr) keys.add(asStr)
  const asNum = Number(asStr)
  if (Number.isFinite(asNum)) keys.add(String(asNum))
  return Array.from(keys)
}

function normalizeDateMinute(value) {
  const d = new Date(value || '')
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 16)
}

function bundleGroupKey(order) {
  const explicit =
    order.bundle_order_id ||
    order.bundle_group_id ||
    order.bundle_id ||
    order.parent_order_id ||
    order.group_id ||
    order.batch_id ||
    null
  if (explicit) return `explicit:${String(explicit)}`
  if (order.bundle_name || order.is_bundle) {
    const createdMinute = normalizeDateMinute(order.created_at)
    const link = String(order.link || '').trim()
    const user = String(order.user_id || '').trim()
    const name = String(order.bundle_name || '').trim()
    return `legacy:${user}:${link}:${createdMinute}:${name}`
  }
  return ''
}

function groupBundleOrders(rows) {
  const grouped = new Map()
  const singles = []
  for (const row of rows) {
    const key = bundleGroupKey(row)
    if (!key) {
      singles.push(row)
      continue
    }
    const bucket = grouped.get(key) || []
    bucket.push(row)
    grouped.set(key, bucket)
  }

  const out = [...singles]
  for (const bucket of grouped.values()) {
    if (bucket.length <= 1) {
      out.push(bucket[0])
      continue
    }
    const sorted = bucket
      .slice()
      .sort((a, b) => String(a.order_id || '').localeCompare(String(b.order_id || '')))
    const parent = sorted.find((o) => o.is_bundle === true) || sorted[0]
    const children = sorted.filter((o) => o.order_id !== parent.order_id)
    out.push({
      ...parent,
      is_bundle: true,
      sub_orders: children.map((c) => c.order_id),
      sub_order_details: children,
    })
  }

  return out.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
}

function normalizeProviderOrderStatus(statusText, currentStatus) {
  const cur = String(currentStatus || '').toLowerCase()
  const s = String(statusText || '').toLowerCase()
  if (!s) return cur
  if (s.includes('complete') || s.includes('success') || s === 'done' || s.includes('finished')) return 'completed'
  if (s.includes('partial')) return 'partial'
  if (s.includes('cancel')) return 'cancelled'
  if (s.includes('fail') || s.includes('error')) return 'failed'
  if (s.includes('process') || s.includes('progress') || s.includes('running')) return 'in_progress'
  if (s.includes('pend') || s.includes('queue') || s.includes('waiting')) return 'pending'
  return cur
}

async function loadProviderByAnyId(db, providerId) {
  const sid = String(providerId || '').trim()
  if (!sid) return null
  const or = [{ provider_id: sid }, { _id: sid }]
  if (ObjectId.isValid(sid)) {
    try { or.push({ _id: new ObjectId(sid) }) } catch (_) {}
  }
  return db.collection('providers').findOne({ $or: or })
}

async function syncProviderStatusesForRows(db, rows) {
  const targets = rows
    .filter((o) =>
      o &&
      o.provider_order_id &&
      !['completed', 'partial', 'cancelled', 'failed', 'error'].includes(String(o.status || '').toLowerCase())
    )
    .slice(0, 12)

  for (const order of targets) {
    try {
      const provider = await loadProviderByAnyId(db, order.provider_id)
      if (!provider?.api_url || !provider?.api_key) continue
      const statusRes = await providerFetchOrderStatus({
        apiUrl: provider.api_url,
        apiKey: provider.api_key,
        providerToken: provider.api_token || provider.token || '',
        providerOrderId: order.provider_order_id,
      })
      if (!statusRes.ok) continue
      const prevStatus = String(order.status || '')
      const nextStatus = normalizeProviderOrderStatus(statusRes.provider_status_text, order.status)
      const updateSet = { updated_at: new Date().toISOString() }
      if (statusRes.provider_charge != null) updateSet.provider_charge = statusRes.provider_charge
      if (statusRes.remains != null) updateSet.remains = statusRes.remains
      if (statusRes.start_count != null) updateSet.start_count = statusRes.start_count
      if (nextStatus && nextStatus !== String(order.status || '').toLowerCase()) updateSet.status = nextStatus
      await db.collection('orders').updateOne({ order_id: order.order_id }, { $set: updateSet })
      Object.assign(order, updateSet)
      if (updateSet.status != null) {
        try {
          await creditReferralCommissionOnOrderCompleted(db, {
            order: { ...order },
            previousStatus: prevStatus,
          })
        } catch (refErr) {
          console.warn('[referral] commission (user sync):', refErr?.message || refErr)
        }
      }
    } catch (_) {}
  }
}

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    if (req.method === 'POST') {
      const body = req.body || {}
      const placed = await placeOrderForUser(db, userId, body)
      if (!placed.ok) {
        return res.status(placed.status || 500).json({
          error: placed.error,
          ...(placed.details ? { details: placed.details } : {}),
        })
      }
      try {
        await runPostOrderHooks(db, userId, placed.order, placed.user, placed.service)
      } catch (hookErr) {
        console.warn('[order] post hooks', hookErr?.message || hookErr)
      }
      return res.json({
        success: true,
        order_id: placed.order_id,
        scheduled: false,
        charge: placed.charge,
        order: placed.shaped,
      })
    }

    // GET orders
    const page = parseInt(req.query?.page, 10) || 1
    const limit = parseInt(req.query?.limit, 10) || 20
    const status = req.query?.status
    const cacheKey = `userOrders:${userId}:${JSON.stringify(req.query || {})}`
    const cached = getCache(cacheKey)
    if (cached) return res.json(cached)

    const filter = { user_id: userId }
    if (status) filter.status = status

    const rawAll = await db.collection('orders')
      .find(filter)
      .sort({ created_at: -1 })
      .toArray()
    const groupedAll = groupBundleOrders(rawAll)
    const total = groupedAll.length
    const skip = (page - 1) * limit
    const rawOrders = groupedAll.slice(skip, skip + limit)
    // Keep order-history fast: provider status sync is opt-in only.
    if (String(req.query?.sync_provider || '') === '1') {
      await syncProviderStatusesForRows(db, rawOrders)
    }

    const rawServiceIds = rawOrders.map((o) => o.service_id).filter((v) => v != null && v !== '')
    const serviceKeys = new Set()
    const serviceObjectIds = []
    for (const rawSid of rawServiceIds) {
      for (const k of buildServiceLookupKeys(rawSid)) serviceKeys.add(k)
      const sidStr = String(rawSid).trim()
      if (ObjectId.isValid(sidStr)) {
        try { serviceObjectIds.push(new ObjectId(sidStr)) } catch (_) {}
      }
    }

    const services = serviceKeys.size || serviceObjectIds.length
      ? await db
          .collection('services')
          .find({
            $or: [
              { service_id: { $in: Array.from(serviceKeys) } },
              ...(serviceObjectIds.length ? [{ _id: { $in: serviceObjectIds } }] : []),
            ],
          })
          .project({
            _id: 1,
            service_id: 1,
            name: 1,
            service_name: 1,
            title: 1,
            refill: 1,
            refill_enabled: 1,
            allow_refill: 1,
            refill_days: 1,
          })
          .toArray()
      : []
    const nameByServiceId = {}
    const metaByServiceId = {}
    for (const s of services) {
      const resolvedName = s.name || s.service_name || s.title || null
      const sid = s.service_id != null ? String(s.service_id) : ''
      const oid = s._id != null ? String(s._id) : ''
      if (sid) {
        nameByServiceId[sid] = resolvedName
        metaByServiceId[sid] = s
      }
      if (oid) {
        nameByServiceId[oid] = resolvedName
        metaByServiceId[oid] = s
      }
    }
    const orders = rawOrders.map((o) =>
      formatUserOrderRow(o, nameByServiceId, metaByServiceId)
    )

    const payload = {
      success: true,
      orders,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    }
    setCache(cacheKey, payload)
    return res.json(payload)
  } catch (err) {
    console.error('orders error:', err)
    res.status(500).json({ error: err.message })
  }
}
