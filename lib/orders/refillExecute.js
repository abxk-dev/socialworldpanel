const {
  providerRefill,
  extractRefillId,
  loadProviderForService,
} = require('../providerSmmApi')

/**
 * @param {import('mongodb').Db} db
 * @param {{ panelOrderId: string, requesterUserId: string|null, allowAdmin: boolean }} opts
 */
async function executeOrderRefill(db, { panelOrderId, requesterUserId, allowAdmin }) {
  const id = String(panelOrderId || '').trim()
  if (!id) {
    return { ok: false, httpStatus: 400, error: 'Order id required', body: { success: false, error: 'Order id required' } }
  }

  const order = await db.collection('orders').findOne({ order_id: id })
  if (!order) {
    return { ok: false, httpStatus: 404, error: 'Order not found', body: { success: false, error: 'Order not found' } }
  }

  if (!allowAdmin) {
    const uid = requesterUserId != null ? String(requesterUserId) : ''
    if (!uid || String(order.user_id) !== uid) {
      return { ok: false, httpStatus: 403, error: 'Forbidden', body: { success: false, error: 'Forbidden' } }
    }
  }

  const st = String(order.status || '').toLowerCase()
  if (!['completed', 'partial'].includes(st)) {
    return {
      ok: false,
      httpStatus: 400,
      error: 'Only completed or partial orders can be refilled',
      body: { success: false, error: 'Only completed or partial orders can be refilled' },
    }
  }

  const service = await db.collection('services').findOne({
    $or: [{ service_id: order.service_id }, { service_id: String(order.service_id) }],
  })

  const refillSupported =
    service &&
    (service.refill === true ||
      service.refill_enabled === true ||
      service.allow_refill === true ||
      service.refill === 'true')

  if (!refillSupported) {
    return {
      ok: false,
      httpStatus: 400,
      error: 'Service does not support refill',
      body: { success: false, error: 'Service does not support refill' },
    }
  }

  const poid = order.provider_order_id
  if (!poid) {
    return {
      ok: false,
      httpStatus: 400,
      error: 'No provider order id on this order — cannot request refill',
      body: { success: false, error: 'No provider order id on this order' },
    }
  }

  const provider = await loadProviderForService(db, service)
  if (!provider?.api_url || !provider?.api_key) {
    return {
      ok: false,
      httpStatus: 400,
      error: 'Provider API not configured',
      body: { success: false, error: 'Provider API not configured' },
    }
  }

  console.log('[refill] attempt', { order_id: order.order_id, provider_order_id: String(poid), user_id: order.user_id })

  let apiResult
  try {
    apiResult = await providerRefill({
      apiUrl: provider.api_url,
      apiKey: provider.api_key,
      providerOrderId: poid,
    })
    console.log('[refill] provider raw (truncated)', JSON.stringify(apiResult.raw || {}).slice(0, 1500))
  } catch (e) {
    console.error('[refill] provider exception', e)
    apiResult = { ok: false, error: e.message || String(e), raw: {} }
  }

  const now = new Date().toISOString()
  const rowStatus = apiResult.ok ? 'completed' : 'failed'
  const providerRefId = extractRefillId(apiResult.raw) || null

  const minimal = {
    order_id: order.order_id,
    provider_order_id: String(poid),
    status: rowStatus,
    created_at: now,
  }

  try {
    await db.collection('refills').insertOne({ ...minimal })
  } catch (e) {
    console.error('[refill] refills insert', e.message)
  }

  const fullDoc = {
    ...minimal,
    user_id: order.user_id,
    provider_id: order.provider_id != null ? String(order.provider_id) : null,
    service_id: order.service_id,
    service_name: order.service_name || service?.name || null,
    updated_at: now,
    last_requested_at: now,
    attempt: 1,
    provider_refill_id: providerRefId,
    provider_response: JSON.stringify(apiResult.raw || {}),
    error_message: apiResult.ok ? null : (apiResult.error || 'Provider refill failed'),
  }

  try {
    await db.collection('refill_requests').insertOne(fullDoc)
  } catch (e) {
    console.error('[refill] refill_requests insert', e.message)
  }

  if (apiResult.ok) {
    await db.collection('orders').updateOne(
      { order_id: order.order_id },
      { $set: { refill_requested: true, refill_requested_at: now, updated_at: now } }
    ).catch(() => {})

    return {
      ok: true,
      httpStatus: 200,
      error: null,
      body: {
        success: true,
        message: 'Refill submitted to provider',
        refill: minimal,
        provider_response: apiResult.raw,
      },
    }
  }

  return {
    ok: false,
    httpStatus: 502,
    error: apiResult.error || 'Provider refill failed',
    body: {
      success: false,
      error: apiResult.error || 'Provider refill failed',
      refill: minimal,
      provider_response: apiResult.raw,
    },
  }
}

module.exports = { executeOrderRefill }
