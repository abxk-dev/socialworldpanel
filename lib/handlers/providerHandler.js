const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')
const { fetchProviderBalance } = require('./admin/importServices')

async function migrateExistingProvider() {
  return { migrated: 0 }
}

function providerOr(id) {
  const sid = String(id || '').trim()
  const or = [{ provider_id: sid }, { _id: sid }]
  if (ObjectId.isValid(sid)) {
    try { or.push({ _id: new ObjectId(sid) }) } catch (_) {}
  }
  return { $or: or }
}

async function loadProvider(db, id) {
  return db.collection('providers').findOne(providerOr(id))
}

const manualSwitchOrder = async (req, res) => {
  res.json({ success: true })
}

const listProviders = async (req, res) => {
  try {
    const db = await getDb()
    const providers = await db.collection('providers')
      .find({})
      .sort({ priority: 1, created_at: -1 })
      .toArray()

    const enriched = await Promise.all(providers.map(async (p) => {
      const pid = String(p.provider_id || p._id || '')
      const services_count = await db.collection('services')
        .countDocuments({ provider_id: pid })
      const key = String(p.api_key || '')
      return {
        ...p,
        provider_id: pid,
        status: p.status || (p.is_active === false ? 'disabled' : 'active'),
        api_key_masked: key ? `${key.slice(0, 6)}...${key.slice(-4)}` : '',
        services_count,
      }
    }))

    res.json({ success: true, providers: enriched })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const createProvider = async (req, res) => {
  try {
    const db = await getDb()
    const body = req.body || {}
    const name = String(body.name || '').trim()
    const api_url = String(body.api_url || '').trim()
    const api_key = String(body.api_key || '').trim()
    if (!name || !api_url || !api_key) {
      return res.status(400).json({ success: false, detail: 'name, api_url, api_key are required' })
    }

    const nextPriority = (await db.collection('providers')
      .find({})
      .sort({ priority: -1 })
      .limit(1)
      .toArray())[0]?.priority || 0

    const now = new Date().toISOString()
    const provider_id = `prov_${Date.now()}`
    const doc = {
      provider_id,
      name,
      api_url,
      api_key,
      api_token: String(body.api_token || '').trim(),
      alias: String(body.alias || '').trim() || api_url,
      notes: String(body.notes || '').trim() || '',
      is_mock: !!body.is_mock,
      balance_threshold: Number(body.balance_threshold ?? 5),
      priority: Number(body.priority ?? (nextPriority + 1)),
      status: 'active',
      is_active: true,
      success_rate: 100,
      balance: 0,
      created_at: now,
      updated_at: now,
    }
    await db.collection('providers').insertOne(doc)
    res.json({ success: true, provider: doc })
  } catch (err) {
    res.status(400).json({ success: false, detail: err.message || 'Failed to create provider' })
  }
}

const switchAllPending = async (req, res) => {
  res.json({ success: true })
}

const listMappings = async (req, res) => {
  try {
    const db = await getDb()
    const mappings = await db.collection('provider_service_mappings').find({}).toArray()
    res.json({ success: true, mappings })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const getServiceMapping = async (req, res) => {
  try {
    const db = await getDb()
    const mapping = await db.collection('provider_service_mappings').findOne({ service_id: req.params.serviceId })
    res.json({ success: true, mapping: mapping || null })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const updateServiceMapping = async (req, res) => {
  try {
    const db = await getDb()
    const serviceId = String(req.params.serviceId || '')
    const body = req.body || {}
    await db.collection('provider_service_mappings').updateOne(
      { service_id: serviceId },
      { $set: { ...body, service_id: serviceId, updated_at: new Date().toISOString() } },
      { upsert: true }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
}

const getProvider = async (req, res) => {
  try {
    const db = await getDb()
    const provider = await loadProvider(db, req.params.id)
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' })
    res.json({ success: true, provider })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const updateProvider = async (req, res) => {
  try {
    const db = await getDb()
    const provider = await loadProvider(db, req.params.id)
    if (!provider) return res.status(404).json({ success: false, detail: 'Provider not found' })
    const body = req.body || {}
    const allowed = ['name', 'api_url', 'api_key', 'api_token', 'alias', 'notes', 'is_mock', 'priority', 'balance_threshold', 'status', 'is_active']
    const updates = {}
    for (const k of allowed) if (k in body) updates[k] = body[k]
    updates.updated_at = new Date().toISOString()
    await db.collection('providers').updateOne({ _id: provider._id }, { $set: updates })
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ success: false, detail: err.message || 'Failed to update provider' })
  }
}

const deleteProvider = async (req, res) => {
  try {
    const db = await getDb()
    const provider = await loadProvider(db, req.params.id)
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' })
    await db.collection('providers').deleteOne({ _id: provider._id })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const pauseProvider = async (req, res) => {
  try {
    const db = await getDb()
    const provider = await loadProvider(db, req.params.id)
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' })
    await db.collection('providers').updateOne(
      { _id: provider._id },
      { $set: { status: 'paused', is_active: false, updated_at: new Date().toISOString() } }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const resumeProvider = async (req, res) => {
  try {
    const db = await getDb()
    const provider = await loadProvider(db, req.params.id)
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' })
    await db.collection('providers').updateOne(
      { _id: provider._id },
      { $set: { status: 'active', is_active: true, paused_reason: null, updated_at: new Date().toISOString() } }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const checkProviderBalance = async (req, res) => {
  try {
    const db = await getDb()
    const provider = await loadProvider(db, req.params.id)
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' })
    const { balance } = await fetchProviderBalance(provider.api_url, provider.api_key, provider.api_token || provider.token || '')
    const now = new Date().toISOString()
    await db.collection('providers').updateOne(
      { _id: provider._id },
      { $set: { balance, last_sync: now, updated_at: now, status: 'active' } }
    )
    res.json({ success: true, balance, provider_id: provider.provider_id || provider._id })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || 'Failed to fetch provider balance' })
  }
}

module.exports = {
  migrateExistingProvider,
  manualSwitchOrder,
  listProviders,
  createProvider,
  switchAllPending,
  listMappings,
  getServiceMapping,
  updateServiceMapping,
  getProvider,
  updateProvider,
  deleteProvider,
  pauseProvider,
  resumeProvider,
  checkProviderBalance,
}

