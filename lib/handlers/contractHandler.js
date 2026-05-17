const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')

const generateContract = async (req, res) => {
  const db = await getDb()
  const doc = {
    ...req.body,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
  }
  const result = await db.collection('contracts').insertOne(doc)
  res.json({ success: true, contract: { ...doc, _id: result.insertedId } })
}

const getContract = async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  const contract = await db.collection('contracts').findOne({ _id: new ObjectId(id) })
  if (!contract) return res.status(404).json({ error: 'Contract not found' })
  res.json({ success: true, contract })
}

const signContract = async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  await db.collection('contracts').updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'signed', ...req.body, updated_at: new Date() } }
  )
  res.json({ success: true })
}

module.exports = {
  generateContract,
  getContract,
  signContract,
}

