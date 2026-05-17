const { getDb } = require('../_db')
const { ObjectId } = require('mongodb')

async function listPages(req, res) {
  try {
    const db = await getDb()
    const pages = await db.collection('pages')
      .find({})
      .sort({ created_at: -1 })
      .toArray()
    res.json({ success: true, pages })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function createPage(req, res) {
  try {
    const db = await getDb()
    const { title, slug, content, html_content } = req.body || {}
    if (!title || !slug) {
      return res.status(400).json({ error: 'Title and slug required' })
    }
    const page = {
      title,
      slug,
      content: content || html_content || '',
      html_content: html_content || content || '',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await db.collection('pages').insertOne(page)
    res.json({ success: true, page })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function updatePage(req, res) {
  try {
    const db = await getDb()
    const { id } = req.params
    const updates = { ...(req.body || {}), updated_at: new Date().toISOString() }
    delete updates._id
    await db.collection('pages').updateOne({ _id: new ObjectId(id) }, { $set: updates })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function deletePage(req, res) {
  try {
    const db = await getDb()
    const { id } = req.params
    await db.collection('pages').deleteOne({ _id: new ObjectId(id) })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = async (req, res) => {
  if (req.method === 'GET') return listPages(req, res)
  if (req.method === 'POST') return createPage(req, res)
  if (req.method === 'PUT') return updatePage(req, res)
  if (req.method === 'DELETE') return deletePage(req, res)
  return res.status(405).json({ error: 'Method not allowed' })
}

