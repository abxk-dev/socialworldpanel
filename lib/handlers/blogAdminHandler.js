const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')

const listPosts = async (req, res) => {
  const db = await getDb()
  const posts = await db.collection('blogs')
    .find({})
    .sort({ created_at: -1 })
    .toArray()
  res.json({ success: true, posts })
}

const getPost = async (req, res) => {
  const db = await getDb()
  let post
  try {
    post = await db.collection('blogs').findOne({ _id: new ObjectId(req.params.id) })
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid post id' })
  }
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' })
  }
  res.json({ success: true, post })
}

const createPost = async (req, res) => {
  const db = await getDb()
  const body = { ...req.body }
  delete body._id
  const now = new Date()
  if (body.status === 'published' && !body.published_at) {
    body.published_at = now
  }
  const post = {
    ...body,
    created_at: now,
    updated_at: now,
  }
  const result = await db.collection('blogs').insertOne(post)
  res.json({ success: true, post: { ...post, _id: result.insertedId } })
}

const updatePost = async (req, res) => {
  const db = await getDb()
  const id = new ObjectId(req.params.id)
  const existing = await db.collection('blogs').findOne({ _id: id })
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Post not found' })
  }
  const body = { ...req.body }
  delete body._id
  delete body.created_at
  if (body.status === 'published' && !existing.published_at && !body.published_at) {
    body.published_at = new Date()
  }
  body.updated_at = new Date()
  await db.collection('blogs').updateOne({ _id: id }, { $set: body })
  res.json({ success: true })
}

const deletePost = async (req, res) => {
  const db = await getDb()
  let id
  try {
    id = new ObjectId(req.params.id)
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid post id' })
  }
  const r = await db.collection('blogs').deleteOne({ _id: id })
  if (r.deletedCount === 0) {
    return res.status(404).json({ success: false, error: 'Post not found' })
  }
  res.json({ success: true })
}

module.exports = { 
  listPosts, getPost, createPost, updatePost, deletePost 
}

