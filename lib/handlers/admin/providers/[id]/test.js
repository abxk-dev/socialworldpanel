const { getDb } = require('../../../_db')
const { fetchProviderServices, fetchProviderBalance } = require('../../importServices')
const { ObjectId } = require('mongodb')

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

    const pToken = provider.api_token || provider.token || ''
    const services = await fetchProviderServices(provider.api_url, provider.api_key, pToken)
    let liveBalance = provider.balance ?? 0
    try {
      const b = await fetchProviderBalance(provider.api_url, provider.api_key, pToken)
      liveBalance = b.balance
      const now = new Date().toISOString()
      await db.collection('providers').updateOne(
        { _id: provider._id },
        { $set: { balance: liveBalance, last_sync: now, updated_at: now, status: 'active' } }
      )
    } catch (_) {}
    return res.json({
      success: true,
      service_count: services.length,
      balance: liveBalance,
      provider_id: provider.provider_id || provider._id,
    })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || 'Connection failed' })
  }
}

