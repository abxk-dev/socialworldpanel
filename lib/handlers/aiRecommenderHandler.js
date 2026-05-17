const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')

const recommendInfluencers = async (req, res) => {
  const db = await getDb()
  const influencers = await db.collection('influencers')
    .find({ is_active: true })
    .limit(10)
    .toArray()
  res.json({ success: true, influencers })
}

const suggestCampaign = async (req, res) => {
  const { budget, platform, goal } = req.body || {}
  res.json({
    success: true,
    suggestion: {
      platform: platform || 'Instagram',
      budget: budget || 1000,
      goal: goal || 'followers',
      recommended_services: [],
      estimated_reach: budget ? budget * 100 : 10000,
    },
  })
}

const getRecommendations = async (req, res) => {
  const db = await getDb()
  const services = await db.collection('services')
    .find({ is_active: true })
    .limit(6)
    .toArray()
  res.json({ success: true, recommendations: services })
}

module.exports = { 
  recommendInfluencers, 
  suggestCampaign,
  getRecommendations 
}

