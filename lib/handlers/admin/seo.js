const { getDb } = require('../_db')

const getSeo = async (req, res) => {
  try {
    const db = await getDb()
    const settings = await db.collection('admin_settings')
      .findOne({ panel_name: { $exists: true } })

    res.json({
      success: true,
      seo_pages: settings?.seo_pages || {},
      seo_meta: settings?.seo_meta || {},
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const putSeo = async (req, res) => {
  try {
    const db = await getDb()
    const { seo_pages, seo_meta } = req.body || {}
    const updates = { updated_at: new Date().toISOString() }
    if (seo_pages) updates.seo_pages = seo_pages
    if (seo_meta) updates.seo_meta = seo_meta

    await db.collection('admin_settings').updateOne(
      { panel_name: { $exists: true } },
      { $set: updates },
      { upsert: true }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const putSeoPage = async (req, res) => {
  try {
    const db = await getDb()
    const { page } = req.params
    const { title, description, keywords } = req.body || {}
    const updateKey = `seo_pages.${page}`

    await db.collection('admin_settings').updateOne(
      { panel_name: { $exists: true } },
      {
        $set: {
          [updateKey]: { title, description, keywords },
          updated_at: new Date().toISOString(),
        },
      },
      { upsert: true }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = async (req, res) => {
  if (req.method === 'GET') return getSeo(req, res)
  if (req.method === 'PUT' && req.params?.page) return putSeoPage(req, res)
  if (req.method === 'PUT') return putSeo(req, res)
  return res.status(405).json({ error: 'Method not allowed' })
}

