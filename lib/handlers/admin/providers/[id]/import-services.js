const { getDb } = require('../../../_db')
const { ObjectId } = require('mongodb')
const {
  fetchProviderServices,
  importOneService,
} = require('../../importServices')

async function getOrCreateAssignedCategory(db, incoming) {
  const value = String(incoming || '').trim()
  if (!value) return ''
  const or = [{ category_id: value }, { name: value }]
  if (ObjectId.isValid(value)) {
    try { or.push({ _id: new ObjectId(value) }) } catch (_) {}
  }
  const found = await db.collection('categories').findOne({ $or: or })
  if (found) return String(found.category_id || found._id || value)
  const now = new Date().toISOString()
  const doc = {
    category_id: `cat_${Date.now()}`,
    name: value,
    is_active: true,
    sort_order: 999,
    created_at: now,
    updated_at: now,
  }
  await db.collection('categories').insertOne(doc)
  return String(doc.category_id)
}

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const { id } = req.params
    const or = [{ provider_id: String(id) }, { _id: String(id) }]
    if (ObjectId.isValid(String(id))) {
      try { or.push({ _id: new ObjectId(String(id)) }) } catch (_) {}
    }
    const provider = await db.collection('providers').findOne({ $or: or })
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' })
    }

    const markup = Number(req.body?.markup ?? 0)
    const updateExisting = req.body?.update_existing !== false
    const onlyIds = Array.isArray(req.body?.service_ids) ? new Set(req.body.service_ids.map(String)) : null
    const assignedCategory = await getOrCreateAssignedCategory(db, req.body?.assigned_category || '')

    const raw = await fetchProviderServices(
      provider.api_url,
      provider.api_key,
      provider.api_token || provider.token || ''
    )
    const list = raw
      .map((s) => ({
        provider_id: String(s.service ?? s.service_id ?? s.id ?? ''),
        name: s.name,
        rate: s.rate,
        min: s.min,
        max: s.max,
        type: s.type,
        dripfeed: s.dripfeed,
        refill: s.refill,
      }))
      .filter((s) => s.provider_id)
      .filter((s) => !onlyIds || onlyIds.has(s.provider_id))

    let imported = 0
    let updated = 0
    let skipped = 0
    let failed = 0
    for (const s of list) {
      try {
        const out = await importOneService(db, {
          providerDbId: String(provider.provider_id || provider._id),
          providerServiceId: s.provider_id,
          name: s.name,
          rate: s.rate,
          min: s.min,
          max: s.max,
          type: s.type,
          dripfeed: s.dripfeed,
          refill: s.refill,
          markupPercent: markup,
          assignedCategory: assignedCategory || undefined,
          updateExisting,
          isActive: true,
        })
        if (out === 'updated') updated += 1
        else if (out === 'skipped') skipped += 1
        else imported += 1
      } catch (_) {
        failed += 1
      }
    }

    return res.json({
      success: true,
      imported,
      updated,
      skipped,
      failed,
      total: list.length,
    })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || 'Import failed' })
  }
}

