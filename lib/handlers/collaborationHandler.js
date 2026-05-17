const { getDb } = require('./_db')
const getUserId = require('../getUserId')

const createCollaboration = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const collab = {
    ...req.body,
    user_id: userId,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Remove undefined so Mongo doesn't store it explicitly.
  Object.keys(collab).forEach((k) => collab[k] === undefined && delete collab[k])

  const result = await db.collection('collaborations').insertOne(collab)
  res.json({ success: true, collaboration: { ...collab, _id: result.insertedId } })
}

const listCollaborations = async (req, res) => {
  const db = await getDb()
  const collabs = await db.collection('collaborations')
    .find({})
    .sort({ created_at: -1 })
    .toArray()

  res.json({ success: true, collaborations: collabs })
}

const getCollaboration = async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  const collab = await db.collection('collaborations')
    .findOne({ _id: new ObjectId(id) })

  if (!collab) return res.status(404).json({ error: 'Not found' })
  res.json({ success: true, collaboration: collab })
}

const updateCollaborationStatus = async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  const { status } = req.body || {}

  await db.collection('collaborations').updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, updated_at: new Date() } }
  )

  res.json({ success: true })
}

const cancelCollaboration = async (req, res) => {
  const db = await getDb()
  const { id } = req.params

  await db.collection('collaborations').updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'cancelled', updated_at: new Date() } }
  )

  res.json({ success: true })
}

// Backward compat (older admin code paths)
const handler = async (req, res) => {
  res.json({ success: true, data: [], message: 'Coming soon' })
}

module.exports = {
  createCollaboration,
  listCollaborations,
  getCollaboration,
  updateCollaborationStatus,
  cancelCollaboration,

  // legacy exports
  getAll: handler,
  getOne: handler,
  create: createCollaboration,
  update: updateCollaborationStatus,
  remove: cancelCollaboration,
}

