const axios = require('axios')
const querystring = require('querystring')
const { ObjectId } = require('mongodb')

/**
 * Standard SMM panel API (POST form: key, action, …)
 */
async function postSmm(apiUrl, fields) {
  const url = String(apiUrl || '').trim()
  if (!url) throw new Error('Missing provider api_url')

  const body = querystring.stringify(fields)
  console.log('[providerSmm] POST', url.split('?')[0], 'action=', fields.action)

  const res = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 60000,
    validateStatus: () => true,
  })

  let data = res.data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      data = { raw: data }
    }
  }

  console.log('[providerSmm] HTTP', res.status, 'keys', data && typeof data === 'object' ? Object.keys(data).slice(0, 12) : typeof data)
  return { status: res.status, data }
}

function normalizeApiUrl(input) {
  let url = String(input || '').trim()
  if (!url) return url
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  if (!/\/api(?:\/|$|\?)/i.test(url)) {
    url = url.replace(/\/+$/, '') + '/api/'
  }
  return url
}

function altProviderUrls(primaryUrl) {
  const out = [primaryUrl]
  try {
    const u = new URL(primaryUrl)
    const host = (u.hostname || '').toLowerCase()
    if (host.includes('bigstata.com')) out.push('https://nakrutka.com/api/')
  } catch (_) {}
  return Array.from(new Set(out))
}

function parseJsonSafe(v) {
  if (typeof v !== 'string') return v
  try { return JSON.parse(v) } catch (_) { return v }
}

function authHeaders(providerToken) {
  const raw = String(providerToken || '').trim()
  const t = raw.replace(/^Bearer\s+/i, '').trim()
  const base = {
    Accept: 'application/json, text/plain, */*',
    'User-Agent': 'SocialWorldPanel/1.0',
  }
  return t ? { ...base, Authorization: `Bearer ${t}` } : base
}

function authQuery(providerToken) {
  const raw = String(providerToken || '').trim()
  const t = raw.replace(/^Bearer\s+/i, '').trim()
  if (!t) return {}
  return { token: t, api_token: t, access_token: t }
}

async function callSmmAction(apiUrlRaw, apiKeyRaw, action, extraQuery = {}, providerToken = '') {
  const apiUrl = normalizeApiUrl(apiUrlRaw)
  const bases = altProviderUrls(apiUrl)
  const apiKey = String(apiKeyRaw || '').trim()
  if (!apiUrl || !apiKey) throw new Error('Provider api_url/api_key missing')
  const headers = authHeaders(providerToken)

  const attempts = []
  for (const base of bases) {
    const qs = new URLSearchParams({ key: apiKey, action, ...extraQuery, ...authQuery(providerToken) }).toString()
    const url = `${base}${base.includes('?') ? '&' : '?'}${qs}`
    const urlAlt = `${base.replace(/\/?$/, '/')}${base.includes('?') ? '&' : '?'}${qs}`
    attempts.push(
      async () => axios.get(url, { headers, timeout: 60000, validateStatus: () => true }),
      async () => axios.get(urlAlt, { headers, timeout: 60000, validateStatus: () => true }),
      async () => axios.post(url, '', { headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, timeout: 60000, validateStatus: () => true }),
      async () => axios.post(urlAlt, '', { headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, timeout: 60000, validateStatus: () => true }),
      async () => axios.post(base, querystring.stringify({ key: apiKey, action, ...extraQuery, ...authQuery(providerToken) }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, timeout: 60000, validateStatus: () => true }),
    )
  }

  let lastStatus = 0
  let lastData = null
  let lastMsg = 'Unknown provider API error'
  for (const run of attempts) {
    try {
      const resp = await run()
      const data = parseJsonSafe(resp.data)
      lastStatus = resp.status
      lastData = data
      if (resp.status >= 400) {
        const detail = data && typeof data === 'object'
          ? (data.error || data.message || JSON.stringify(data).slice(0, 220))
          : String(data || '').slice(0, 220)
        lastMsg = detail ? `HTTP ${resp.status}: ${detail}` : `HTTP ${resp.status}`
        continue
      }
      if (data && typeof data === 'object' && (data.error || data.Error)) {
        lastMsg = String(data.error || data.Error)
        continue
      }
      return { status: resp.status, data }
    } catch (e) {
      lastMsg = e.message || String(e)
    }
  }
  return { status: lastStatus || 400, data: lastData || { error: lastMsg } }
}

function extractOrderId(data) {
  if (!data || typeof data !== 'object') return null
  if (data.order != null) {
    const o = data.order
    if (typeof o === 'object' && o != null) return String(o.id ?? o.order_id ?? o.order ?? '')
    return String(o)
  }
  if (data.id != null && !data.error) return String(data.id)
  return null
}

function extractCharge(data) {
  if (!data || typeof data !== 'object') return null
  const c = data.charge ?? data.provider_charge ?? data.cost ?? data.price
  if (c == null) return null
  const n = Number(c)
  return Number.isFinite(n) ? n : null
}

function extractChargeDeep(data) {
  if (data == null) return null
  if (typeof data === 'number') return Number.isFinite(data) ? data : null
  if (typeof data === 'string') {
    const n = Number(data)
    return Number.isFinite(n) ? n : null
  }
  if (typeof data !== 'object') return null
  const direct = extractCharge(data)
  if (direct != null) return direct
  const candidates = [
    data.order,
    data.data,
    data.result,
    data.response,
    data.status,
    data.order_status,
  ]
  for (const c of candidates) {
    const nested = extractChargeDeep(c)
    if (nested != null) return nested
  }
  return null
}

function extractRemainsDeep(data) {
  if (data == null) return null
  if (typeof data !== 'object') return null
  const c = data.remains ?? data.remain ?? data.left ?? data.pending
  if (c != null) {
    const n = Number(c)
    if (Number.isFinite(n)) return Math.max(0, n)
  }
  const candidates = [data.order, data.data, data.result, data.response, data.status, data.order_status]
  for (const v of candidates) {
    const nested = extractRemainsDeep(v)
    if (nested != null) return nested
  }
  return null
}

function extractStartCountDeep(data) {
  if (data == null) return null
  if (typeof data !== 'object') return null
  const c = data.start_count ?? data.startCount
  if (c != null) {
    const n = Number(c)
    if (Number.isFinite(n)) return n
  }
  const candidates = [data.order, data.data, data.result, data.response, data.status, data.order_status]
  for (const v of candidates) {
    const nested = extractStartCountDeep(v)
    if (nested != null) return nested
  }
  return null
}

function extractStatusTextDeep(data) {
  if (data == null) return null
  if (typeof data === 'string') return data
  if (typeof data !== 'object') return null
  const s = data.status ?? data.order_status ?? data.state
  if (typeof s === 'string' && s.trim()) return s.trim()
  const candidates = [data.order, data.data, data.result, data.response]
  for (const v of candidates) {
    const nested = extractStatusTextDeep(v)
    if (nested) return nested
  }
  return null
}

async function providerAddOrder({ apiUrl, apiKey, providerServiceId, link, quantity, providerToken = '' }) {
  const { status, data } = await callSmmAction(apiUrl, apiKey, 'add', {
    service: String(providerServiceId),
    link: String(link),
    quantity: String(quantity),
  }, providerToken)

  if (data && data.error) {
    console.warn('[providerSmm] add error field', data.error)
    return { ok: false, error: String(data.error), raw: data, httpStatus: status }
  }
  if (status >= 400) {
    return { ok: false, error: `HTTP ${status}`, raw: data, httpStatus: status }
  }

  const provider_order_id = extractOrderId(data)
  const provider_charge = extractCharge(data)
  return {
    ok: !!provider_order_id,
    provider_order_id,
    provider_charge,
    raw: data,
    httpStatus: status,
    error: provider_order_id ? null : 'No order id in provider response',
  }
}

async function providerRefill({ apiUrl, apiKey, providerOrderId, providerToken = '' }) {
  const { status, data } = await callSmmAction(apiUrl, apiKey, 'refill', {
    order: String(providerOrderId),
  }, providerToken)

  const err = data && (data.error || data.err)
  if (err) {
    console.warn('[providerSmm] refill error', err)
    return { ok: false, error: String(err), raw: data, httpStatus: status }
  }
  if (status >= 400) {
    return { ok: false, error: `HTTP ${status}`, raw: data, httpStatus: status }
  }

  return { ok: true, raw: data, httpStatus: status }
}

async function providerFetchOrderCharge({ apiUrl, apiKey, providerOrderId, providerToken = '' }) {
  const { status, data } = await callSmmAction(
    apiUrl,
    apiKey,
    'status',
    { order: String(providerOrderId) },
    providerToken
  )
  const err = data && (data.error || data.err || data.message)
  if (err && String(err).toLowerCase().includes('invalid')) {
    return { ok: false, error: String(err), raw: data, httpStatus: status, provider_charge: null }
  }
  const provider_charge = extractChargeDeep(data)
  if (provider_charge == null) {
    return { ok: false, error: 'No charge in provider status response', raw: data, httpStatus: status, provider_charge: null }
  }
  return { ok: true, provider_charge, raw: data, httpStatus: status }
}

async function providerFetchOrderStatus({ apiUrl, apiKey, providerOrderId, providerToken = '' }) {
  const { status, data } = await callSmmAction(
    apiUrl,
    apiKey,
    'status',
    { order: String(providerOrderId) },
    providerToken
  )
  const err = data && (data.error || data.err || data.message)
  if (err && String(err).toLowerCase().includes('invalid')) {
    return { ok: false, error: String(err), raw: data, httpStatus: status }
  }
  return {
    ok: status < 400,
    raw: data,
    httpStatus: status,
    provider_charge: extractChargeDeep(data),
    remains: extractRemainsDeep(data),
    start_count: extractStartCountDeep(data),
    provider_status_text: extractStatusTextDeep(data),
  }
}

function extractRefillId(data) {
  if (!data || typeof data !== 'object') return null
  if (data.refill != null) return String(data.refill)
  if (data.refill_id != null) return String(data.refill_id)
  return null
}

async function loadProviderForService(db, service) {
  if (!service || !db) return null
  const pid = service.provider_id
  if (pid == null || pid === '') return null

  const or = []
  const ps = String(pid)
  if (ObjectId.isValid(ps)) {
    try {
      or.push({ _id: new ObjectId(ps) })
    } catch (_) {}
  }
  or.push({ provider_id: ps })
  or.push({ _id: pid })

  return db.collection('providers').findOne({ $or: or })
}

function resolveProviderServiceId(service) {
  if (!service) return null
  return (
    service.provider_service_id ??
    service.api_service_id ??
    service.api_service ??
    service.smm_service_id ??
    null
  )
}

module.exports = {
  postSmm,
  providerAddOrder,
  providerRefill,
  providerFetchOrderCharge,
  providerFetchOrderStatus,
  extractRefillId,
  loadProviderForService,
  resolveProviderServiceId,
}
