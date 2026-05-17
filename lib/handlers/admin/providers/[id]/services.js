const { getDb } = require('../../../_db')
const { ObjectId } = require('mongodb')
const { fetchProviderServices } = require('../../importServices')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const { id } = req.params
    const or = [{ provider_id: String(id) }, { _id: String(id) }]
    if (ObjectId.isValid(String(id))) {
      try { or.push({ _id: new ObjectId(String(id)) }) } catch (_) {}
    }
    const provider = await db.collection('providers').findOne({ $or: or })
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' })

    const providerDbId = String(provider.provider_id || provider._id)
    const existing = await db.collection('services')
      .find({ provider_id: providerDbId })
      .project({ provider_service_id: 1, service_id: 1 })
      .toArray()
    const existingIds = new Set(existing.map((s) => String(s.provider_service_id || s.service_id || '')).filter(Boolean))

    const raw = await fetchProviderServices(
      provider.api_url,
      provider.api_key,
      provider.api_token || provider.token || ''
    )
    const services = raw
      .map((s) => ({
        service: String(s.service ?? s.service_id ?? s.id ?? ''),
        name: s.name || '',
        category: s.category || '',
        rate: s.rate,
        min: s.min,
        max: s.max,
        refill: !!s.refill,
        dripfeed: !!s.dripfeed,
        already_imported: existingIds.has(String(s.service ?? s.service_id ?? s.id ?? '')),
      }))
      .filter((s) => s.service)
      .sort((a, b) => Number(a.service) - Number(b.service))
    res.json({ success: true, services })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || 'Failed to fetch provider services' })
  }
}

