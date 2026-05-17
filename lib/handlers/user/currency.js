const { getDb } = require('../_db')
const getUserId = require('../../getUserId')
const {
  normalizeRates,
  normalizeSupported,
} = require('../../currencyDefaults')

async function loadSupportedSet(db) {
  if (!db) return null
  try {
    const doc =
      (await db.collection('admin_settings').findOne({}, { sort: { updated_at: -1, _id: -1 } })) || {}
    const rates = normalizeRates(doc.exchange_rates)
    const list = normalizeSupported(doc.supported_currencies, rates)
    return new Set(list)
  } catch {
    return null
  }
}

module.exports = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const currency = String(req.body?.currency || '').trim().toUpperCase()
  if (!currency) {
    return res.status(400).json({ error: 'Currency required' })
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return res.status(400).json({ error: 'Invalid currency code' })
  }

  const supported = await loadSupportedSet(db)
  if (supported && !supported.has(currency)) {
    return res.status(400).json({ error: 'Unsupported currency' })
  }

  if (!db) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  await db.collection('users').updateOne(
    { user_id: userId },
    { $set: { preferred_currency: currency } }
  )

  res.json({ success: true, currency })
}
