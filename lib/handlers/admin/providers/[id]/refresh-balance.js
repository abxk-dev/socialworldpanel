const { getDb } = require('../../../_db')
const { ObjectId } = require('mongodb')
const { fetchProviderBalance } = require('../../importServices')

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

    const { balance, raw } = await fetchProviderBalance(
      provider.api_url,
      provider.api_key,
      provider.api_token || provider.token || ''
    )
    const now = new Date().toISOString()
    await db.collection('providers').updateOne(
      { _id: provider._id },
      { $set: { balance, last_sync: now, updated_at: now, status: 'active' } }
    )
    await db.collection('provider_logs').insertOne({
      provider_id: String(provider.provider_id || provider._id),
      action: 'balance_refresh',
      success: true,
      response: JSON.stringify(raw || {}),
      created_at: now,
    }).catch(() => {})

    return res.json({ success: true, balance, provider_id: provider.provider_id || provider._id })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || 'Balance refresh failed' })
  }
}

