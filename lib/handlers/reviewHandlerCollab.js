const { getDb } = require('./_db')

const submitCollabReview = async (req, res) => {
  const db = await getDb()
  const userId = req.user?._id
  const body = req.body || {}

  if (!body.collab_id) {
    return res.status(400).json({ error: 'collab_id is required' })
  }

  const doc = {
    user_id: userId,
    collab_id: body.collab_id,
    campaign_id: body.campaign_id || null,
    rating: body.rating || null,
    feedback: body.feedback || null,
    type: body.type || null,
    created_at: new Date(),
    updated_at: new Date(),
  }

  const result = await db.collection('collab_reviews').insertOne(doc)
  res.json({ success: true, review: { ...doc, _id: result.insertedId } })
}

const getCollabReviews = async (req, res) => {
  const db = await getDb()
  const { collab_id } = req.params

  const reviews = await db.collection('collab_reviews')
    .find({ collab_id })
    .sort({ created_at: -1 })
    .limit(100)
    .toArray()

  res.json({ success: true, reviews })
}

module.exports = { submitCollabReview, getCollabReviews }

