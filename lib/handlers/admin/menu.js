const { getDb } = require('../_db')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    if (req.method === 'GET') {
      const settings = await db.collection('admin_settings').findOne(
        { panel_name: { $exists: true } },
        { projection: { menu: 1, dashboard_menu: 1, admin_nav: 1 } }
      )
      return res.json({
        success: true,
        menu: Array.isArray(settings?.menu) ? settings.menu : [],
        dashboard_menu: Array.isArray(settings?.dashboard_menu) ? settings.dashboard_menu : [],
        admin_nav: Array.isArray(settings?.admin_nav) ? settings.admin_nav : [],
      })
    }

    if (req.method === 'PUT') {
      const body = req.body && typeof req.body === 'object' ? req.body : {}
      const updates = { updated_at: new Date().toISOString() }
      if (Array.isArray(body.menu)) updates.menu = body.menu
      if (Array.isArray(body.dashboard_menu)) updates.dashboard_menu = body.dashboard_menu
      if (Array.isArray(body.admin_nav)) updates.admin_nav = body.admin_nav

      await db.collection('admin_settings').updateOne(
        { panel_name: { $exists: true } },
        {
          $set: updates,
          $setOnInsert: { panel_name: 'Social World Panel' },
        },
        { upsert: true }
      )

      return res.json({ success: true })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

