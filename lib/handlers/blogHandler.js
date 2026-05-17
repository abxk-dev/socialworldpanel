const { getDb } = require('./_db')

const listPublicPosts = async (req, res) => {
  const db = await getDb()
  const page = parseInt(req.query.page, 10) || 1
  const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 10))
  const skip = (page - 1) * limit

  const posts = await db.collection('blogs')
    .find({ status: 'published' })
    .sort({ published_at: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()

  const total = await db.collection('blogs')
    .countDocuments({ status: 'published' })

  res.json({
    success: true,
    posts,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  })
}

const getPostBySlug = async (req, res) => {
  const db = await getDb()
  const { slug } = req.params
  const post = await db.collection('blogs')
    .findOne({ slug, status: 'published' })
  if (!post) return res.status(404).json({ error: 'Post not found' })

  // Increment views (best-effort)
  try {
    await db.collection('blogs').updateOne({ _id: post._id }, { $inc: { views: 1 } })
  } catch {}

  res.json({ success: true, post })
}

// Backward compat
const getPosts = listPublicPosts
const getPost = getPostBySlug

module.exports = { 
  listPublicPosts,
  getPostBySlug,
  getPosts,
  getPost,
}

