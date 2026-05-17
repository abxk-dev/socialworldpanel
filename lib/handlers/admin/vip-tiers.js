const { getDb } = require('../_db')
const { ObjectId } = require('mongodb')

async function listVipTiers(req, res) {
  try {
    const db = await getDb()
    const tiers = await db.collection('vip_tiers')
      .find({})
      .sort({ min_total_spend: 1 })
      .toArray()
    res.json({ success: true, tiers })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function createVipTier(req, res) {
  try {
    const db = await getDb()
    const { name, min_total_spend, discount_percent } = req.body || {}
    const tier = {
      vip_id: `vip_${Date.now()}`,
      name,
      min_total_spend: parseFloat(min_total_spend) || 0,
      discount_percent: parseFloat(discount_percent) || 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await db.collection('vip_tiers').insertOne(tier)
    res.json({ success: true, tier })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function updateVipTier(req, res) {
  try {
    const db = await getDb()
    const { id } = req.params
    const updates = { ...(req.body || {}), updated_at: new Date().toISOString() }
    delete updates._id
    await db.collection('vip_tiers').updateOne({ _id: new ObjectId(id) }, { $set: updates })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function deleteVipTier(req, res) {
  try {
    const db = await getDb()
    const { id } = req.params
    await db.collection('vip_tiers').deleteOne({ _id: new ObjectId(id) })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = async (req, res) => {
  if (req.method === 'GET') return listVipTiers(req, res)
  if (req.method === 'POST') return createVipTier(req, res)
  if (req.method === 'PUT') return updateVipTier(req, res)
  if (req.method === 'DELETE') return deleteVipTier(req, res)
  return res.status(405).json({ error: 'Method not allowed' })
}

