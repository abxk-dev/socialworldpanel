const axios = require('axios')
const querystring = require('querystring')
const { ObjectId } = require('mongodb')
const { getDb } = require('../_db')

function normalizeName(v) {
  return String(v || '').trim()
}

/** 24-char hex MongoDB ObjectId string */
function isLikelyObjectIdString(s) {
  const t = normalizeName(s)
  return /^[a-f0-9]{24}$/i.test(t)
}

function safeNum(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function inferCategoryFromName(name = '') {
  const n = String(name).toLowerCase()
  if (n.includes('youtube')) return 'YouTube'
  if (n.includes('instagram')) return 'Instagram'
  if (n.includes('tiktok')) return 'TikTok'
  if (n.includes('facebook')) return 'Facebook'
  if (n.includes('twitter') || n.includes('x.com')) return 'Twitter'
  if (n.includes('telegram')) return 'Telegram'
  if (n.includes('spotify')) return 'Spotify'
  if (n.includes('linkedin')) return 'LinkedIn'
  return 'Other'
}

function normalizeApiUrl(input) {
  let url = String(input || '').trim()
  if (!url) return url
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  // Keep existing API paths like /api, /api/, /api/v2, etc.
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
    // BigStata docs specify nakrutka.com/api endpoint as main API base.
    if (host.includes('bigstata.com')) {
      out.push('https://nakrutka.com/api/')
    }
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
  // Different providers use different token field names.
  return {
    token: t,
    api_token: t,
    access_token: t,
  }
}

async function callProviderAction(apiUrlRaw, apiKeyRaw, action, extraQuery = {}, providerToken = '') {
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

  let lastMsg = 'Unknown provider API error'
  for (const run of attempts) {
    try {
      const resp = await run()
      const data = parseJsonSafe(resp.data)
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
      return data
    } catch (e) {
      lastMsg = e.message || String(e)
    }
  }
  throw new Error(lastMsg)
}

async function fetchProviderServices(apiUrl, apiKey, providerToken = '') {
  const data = await callProviderAction(apiUrl, apiKey, 'services', {}, providerToken)
  if (!Array.isArray(data)) {
    const err = data?.error || data?.message || 'Invalid services response from provider'
    throw new Error(err)
  }
  return data
}

async function fetchProviderBalance(apiUrl, apiKey, providerToken = '') {
  const data = await callProviderAction(apiUrl, apiKey, 'balance', {}, providerToken)

  const rawBalance =
    (data && typeof data === 'object' ? (data.balance ?? data.funds ?? data.amount) : data)
  const balance = Number(rawBalance)
  if (!Number.isFinite(balance)) {
    throw new Error('Invalid balance response from provider')
  }
  return { balance, raw: data }
}

async function resolveCategory(db, assignedCategory, fallbackCategoryName) {
  const raw = normalizeName(assignedCategory)
  const isAuto =
    !raw ||
    /^auto(-|\s)?detect$/i.test(raw) ||
    raw.toLowerCase() === 'auto'
  const assigned = isAuto ? '' : raw
  const fallbackName = normalizeName(fallbackCategoryName) || 'Other'

  let categoryDoc = null
  if (assigned) {
    const or = [{ category_id: assigned }, { name: assigned }]
    if (ObjectId.isValid(assigned)) {
      try {
        or.push({ _id: new ObjectId(assigned) })
      } catch (_) {}
    }
    categoryDoc = await db.collection('categories').findOne({ $or: or })
  }

  if (!categoryDoc) {
    categoryDoc = await db.collection('categories').findOne({ name: fallbackName })
  }
  if (!categoryDoc && fallbackName !== 'Other') {
    categoryDoc = await db.collection('categories').findOne({ name: 'Other' })
  }

  if (categoryDoc) {
    const cid =
      categoryDoc.category_id != null && categoryDoc.category_id !== ''
        ? String(categoryDoc.category_id)
        : String(categoryDoc._id)
    const cname = normalizeName(categoryDoc.name) || fallbackName
    return {
      category_id: cid,
      category_name: cname,
      category: cname,
      platform_slug: categoryDoc.platform_slug || null,
    }
  }

  // Create a new category only when admin typed a real name — never use a bare ObjectId string as display name.
  if (assigned && !isLikelyObjectIdString(assigned)) {
    const now = new Date().toISOString()
    const newDoc = {
      category_id: `cat_${Date.now()}`,
      name: assigned,
      is_active: true,
      sort_order: 999,
      created_at: now,
      updated_at: now,
    }
    try {
      await db.collection('categories').insertOne(newDoc)
      return {
        category_id: String(newDoc.category_id),
        category_name: newDoc.name,
        category: newDoc.name,
        platform_slug: null,
      }
    } catch (_) {}
  }

  return {
    category_id: fallbackName,
    category_name: fallbackName,
    category: fallbackName,
    platform_slug: null,
  }
}

async function importOneService(db, params) {
  const {
    providerDbId,
    providerServiceId,
    name,
    rate,
    min,
    max,
    type,
    dripfeed,
    refill,
    markupPercent = 0,
    customName,
    assignedCategory,
    customMin,
    customMax,
    isActive = true,
    updateExisting = true,
  } = params

  const categoryName = inferCategoryFromName(name)
  const cat = await resolveCategory(db, assignedCategory, categoryName)
  const effectiveRate = safeNum(rate) * (1 + safeNum(markupPercent) / 100)
  const now = new Date().toISOString()
  const pSid = String(providerServiceId)

  const serviceDoc = {
    provider_id: String(providerDbId),
    provider_service_id: pSid,
    api_service_id: pSid,
    service_id: pSid,
    name: normalizeName(customName) || normalizeName(name) || `Service ${pSid}`,
    service_name: normalizeName(customName) || normalizeName(name) || `Service ${pSid}`,
    description: '',
    type: normalizeName(type) || 'Default',
    dripfeed: !!dripfeed,
    refill: !!refill,
    rate: effectiveRate,
    price: effectiveRate,
    min_order: safeNum(customMin, safeNum(min, 1)),
    max_order: safeNum(customMax, safeNum(max, 1000000)),
    min: safeNum(customMin, safeNum(min, 1)),
    max: safeNum(customMax, safeNum(max, 1000000)),
    status: isActive ? 'active' : 'inactive',
    is_active: !!isActive,
    ...cat,
    updated_at: now,
  }

  const filter = {
    provider_id: String(providerDbId),
    provider_service_id: pSid,
  }
  const exists = await db.collection('services').findOne(filter)
  if (exists) {
    if (!updateExisting) return 'skipped'
    await db.collection('services').updateOne(filter, { $set: serviceDoc })
    return 'updated'
  }
  await db.collection('services').insertOne({ ...serviceDoc, created_at: now })
  return 'imported'
}

async function getOrCreateProvider(db, { providerId, providerName, apiUrl, apiKey }) {
  if (providerId) {
    const p = await db.collection('providers').findOne({
      $or: [{ provider_id: String(providerId) }, { _id: String(providerId) }],
    })
    if (p) return p
  }

  const existingByUrl = await db.collection('providers').findOne({ api_url: apiUrl })
  if (existingByUrl) return existingByUrl

  const now = new Date().toISOString()
  const provider_id = `prov_${Date.now()}`
  const doc = {
    provider_id,
    name: providerName || provider_id,
    alias: providerName || provider_id,
    api_url: apiUrl,
    api_key: apiKey,
    status: 'active',
    is_active: true,
    priority: 99,
    created_at: now,
    updated_at: now,
  }
  await db.collection('providers').insertOne(doc)
  return doc
}

const testConnection = async (req, res) => {
  try {
    const { api_url, api_key, api_token } = req.body || {}
    if (!api_url || !api_key) {
      return res.status(400).json({ success: false, error: 'api_url and api_key are required' })
    }
    const services = await fetchProviderServices(
      String(api_url).trim(),
      String(api_key).trim(),
      String(api_token || '').trim()
    )
    return res.json({
      success: true,
      message: 'Connection successful',
      service_count: services.length,
    })
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message || 'Connection failed' })
  }
}

const fetchServices = async (req, res) => {
  try {
    const db = await getDb()
    const { api_url, api_key, api_token } = req.body || {}
    if (!api_url || !api_key) {
      return res.status(400).json({ success: false, error: 'api_url and api_key are required' })
    }
    const servicesRaw = await fetchProviderServices(
      String(api_url).trim(),
      String(api_key).trim(),
      String(api_token || '').trim()
    )

    const allExisting = await db.collection('services').find({}).project({ provider_service_id: 1, service_id: 1 }).toArray()
    const existingProviderIds = new Set(
      allExisting
        .map((x) => String(x.provider_service_id || x.service_id || ''))
        .filter(Boolean)
    )

    const mapped = servicesRaw.map((s) => {
      const provider_id = String(s.service ?? s.service_id ?? s.id ?? '')
      const name = normalizeName(s.name || s.service_name || `Service ${provider_id}`)
      const category = normalizeName(s.category || inferCategoryFromName(name)) || 'Other'
      const rate = safeNum(s.rate, 0)
      return {
        provider_id,
        name,
        category,
        type: s.type || 'Default',
        rate,
        min: safeNum(s.min, 1),
        max: safeNum(s.max, 1000000),
        refill: !!s.refill,
        dripfeed: !!s.dripfeed,
        already_imported: existingProviderIds.has(provider_id),
      }
    }).filter((s) => s.provider_id)

    const categories = {}
    for (const s of mapped) categories[s.category] = (categories[s.category] || 0) + 1

    return res.json({
      success: true,
      total: mapped.length,
      services: mapped,
      categories,
    })
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message || 'Failed to fetch services' })
  }
}

const bulkImport = async (req, res) => {
  const writeLine = (obj) => {
    try { res.write(`${JSON.stringify(obj)}\n`) } catch (_) {}
  }
  try {
    const db = await getDb()
    const body = req.body || {}
    const items = Array.isArray(body.services) ? body.services : []
    const apiUrl = normalizeName(body.api_url)
    const apiKey = normalizeName(body.api_key)
    const providerName = normalizeName(body.provider_name)
    const providerId = normalizeName(body.provider_id)
    const defaultMarkup = safeNum(body.default_markup, 0)
    const updateExisting = body.update_existing !== false

    if (!items.length) return res.status(400).json({ success: false, error: 'No services to import' })
    if (!apiUrl || !apiKey) return res.status(400).json({ success: false, error: 'api_url and api_key are required' })

    const provider = await getOrCreateProvider(db, { providerId, providerName, apiUrl, apiKey })
    const providerDbId = String(provider.provider_id || provider._id)

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')

    const results = { imported: 0, updated: 0, skipped: 0, failed: 0 }
    for (let i = 0; i < items.length; i++) {
      const s = items[i]
      try {
        const outcome = await importOneService(db, {
          providerDbId,
          providerServiceId: s.provider_id,
          name: s.name,
          rate: s.rate,
          min: s.min,
          max: s.max,
          type: s.type,
          dripfeed: s.dripfeed,
          refill: s.refill,
          markupPercent: s.markup_percent ?? defaultMarkup,
          customName: s.custom_name,
          assignedCategory: s.assigned_category,
          customMin: s.custom_min,
          customMax: s.custom_max,
          isActive: s.is_active !== false,
          updateExisting,
        })
        if (outcome === 'updated') {
          results.updated += 1
        } else if (outcome === 'skipped') {
          results.skipped += 1
        } else {
          results.imported += 1
        }
      } catch (e) {
        results.failed += 1
      }
      writeLine({
        current: i + 1,
        total: items.length,
        progress: Math.round(((i + 1) / items.length) * 100),
        results,
      })
    }
    return res.end()
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message || 'Import failed' })
  }
}

module.exports = {
  testConnection,
  fetchServices,
  bulkImport,
  fetchProviderServices,
  fetchProviderBalance,
  importOneService,
  getOrCreateProvider,
}

