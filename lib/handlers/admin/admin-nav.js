const { getDb } = require('../_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    if (req.method === 'GET') {
      const settings = await db.collection('admin_settings').findOne(
        { panel_name: { $exists: true } },
        { projection: { admin_nav: 1 } }
      )
      return res.json({
        success: true,
        admin_nav: Array.isArray(settings?.admin_nav) ? settings.admin_nav : [],
      })
    }

    if (req.method === 'PUT') {
      const body = req.body && typeof req.body === 'object' ? req.body : {}
      const admin_nav = Array.isArray(body.admin_nav) ? body.admin_nav : []

      await db.collection('admin_settings').updateOne(
        { panel_name: { $exists: true } },
        {
          $set: {
            admin_nav,
            updated_at: new Date().toISOString(),
          },
          $setOnInsert: { panel_name: 'Social World Panel' },
        },
        { upsert: true }
      )

      return res.json({ success: true, admin_nav })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

