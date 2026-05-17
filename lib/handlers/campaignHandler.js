const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')

const createCampaign = async (req, res) => {
  // Minimal implementation: store payload as-is.
  const db = await getDb()
  const doc = {
    ...req.body,
    status: req.body?.status || 'draft',
    created_at: new Date(),
    updated_at: new Date(),
  }
  const result = await db.collection('campaigns').insertOne(doc)
  res.json({ success: true, campaign: { ...doc, _id: result.insertedId } })
}

const listCampaigns = async (req, res) => {
  const db = await getDb()
  const campaigns = await db.collection('campaigns')
    .find({})
    .sort({ created_at: -1 })
    .limit(50)
    .toArray()
  res.json({ success: true, campaigns })
}

const getCampaign = async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  const campaign = await db.collection('campaigns').findOne({ _id: new ObjectId(id) })
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
  res.json({ success: true, campaign })
}

const updateCampaign = async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  await db.collection('campaigns').updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...req.body, updated_at: new Date() } }
  )
  res.json({ success: true })
}

const updateCampaignPerformance = async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  await db.collection('campaigns').updateOne(
    { _id: new ObjectId(id) },
    { $set: { performance: req.body?.performance || req.body || {}, updated_at: new Date() } }
  )
  res.json({ success: true })
}

const deleteCampaign = async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  await db.collection('campaigns').deleteOne({ _id: new ObjectId(id) })
  res.json({ success: true })
}

module.exports = {
  createCampaign,
  listCampaigns,
  getCampaign,
  updateCampaign,
  updateCampaignPerformance,
  deleteCampaign,
}

