const { getDb } = require('../_db')

const DEFAULT_META = {
  title: '',
  description: '',
  keywords: '',
  og_image: '',
}

module.exports = async (req, res) => {
  try {
    const db = await getDb()

    if (req.method === 'GET') {
      const doc = await db.collection('admin_settings').findOne(
        { panel_name: { $exists: true } },
        { projection: { seo_meta: 1, seo_pages: 1 } }
      )
      return res.json({
        success: true,
        seo_meta: { ...DEFAULT_META, ...(doc?.seo_meta || {}) },
        seo_pages: doc?.seo_pages || {},
      })
    }

    if (req.method === 'PUT') {
      const body = req.body && typeof req.body === 'object' ? req.body : {}
      const seo_meta = { ...DEFAULT_META, ...(body.seo_meta || {}) }
      const seo_pages = body.seo_pages && typeof body.seo_pages === 'object' ? body.seo_pages : {}

      await db.collection('admin_settings').updateOne(
        { panel_name: { $exists: true } },
        {
          $set: {
            seo_meta,
            seo_pages,
            updated_at: new Date().toISOString(),
          },
          $setOnInsert: { panel_name: 'Social World Panel' },
        },
        { upsert: true }
      )

      return res.json({ success: true })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

