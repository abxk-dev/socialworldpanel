const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')

const registerInfluencer = async (req, res) => {
  const db = await getDb()
  const doc = {
    ...req.body,
    is_active: req.body?.is_active ?? true,
    created_at: new Date(),
    updated_at: new Date(),
  }
  const result = await db.collection('influencers').insertOne(doc)
  res.json({ success: true, influencer: { ...doc, _id: result.insertedId } })
}

const discoverInfluencers = async (req, res) => {
  const db = await getDb()
  const influencers = await db.collection('influencers')
    .find({ is_active: true })
    .sort({ created_at: -1 })
    .limit(50)
    .toArray()
  res.json({ success: true, influencers })
}

const getInfluencer = async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  const influencer = await db.collection('influencers').findOne({ _id: new ObjectId(id) })
  if (!influencer) return res.status(404).json({ error: 'Influencer not found' })
  res.json({ success: true, influencer })
}

const updateInfluencer = async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  await db.collection('influencers').updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...req.body, updated_at: new Date() } }
  )
  res.json({ success: true })
}

const getInfluencerAnalytics = async (req, res) => {
  // Stub analytics: returns empty series.
  const db = await getDb()
  const { id } = req.params
  await db.collection('influencers').findOne({ _id: new ObjectId(id) }).catch(() => null)
  res.json({ success: true, analytics: { series: [] } })
}

module.exports = {
  registerInfluencer,
  discoverInfluencers,
  getInfluencer,
  updateInfluencer,
  getInfluencerAnalytics,
}

