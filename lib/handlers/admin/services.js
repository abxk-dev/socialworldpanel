const { getDb } = require('../_db')
const { ObjectId } = require('mongodb')

const toObjectIdOrNull = (value) => {
  const s = String(value || '').trim()
  if (!s || !ObjectId.isValid(s)) return null
  return new ObjectId(s)
}

const normalizeId = (value) => {
  if (value === null || value === undefined) return ''
  const raw = typeof value === 'string' ? value : (typeof value?.toString === 'function' ? value.toString() : String(value))
  const m = raw.match(/^ObjectId\(\"?([0-9a-fA-F]{24})\"?\)$/)
  return m ? m[1] : raw
}

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {}
      const categoryId = String(body.category_id || '').trim()
      if (!categoryId) {
        return res.status(400).json({ success: false, error: 'category_id is required' })
      }
      const name = String(body.name || '').trim()
      if (!name) {
        return res.status(400).json({ success: false, error: 'name is required' })
      }
      const categoryOid = toObjectIdOrNull(categoryId)
      const category = await db.collection('categories').findOne(
        categoryOid
          ? { $or: [{ _id: categoryOid }, { category_id: categoryId }] }
          : { category_id: categoryId }
      )
      if (!category) {
        return res.status(400).json({ success: false, error: 'Invalid category_id' })
      }
      const now = new Date().toISOString()
      const doc = {
        ...body,
        name,
        category_id: categoryId,
        category: category.name || null,
        category_name: category.name || null,
        platform_slug: category.platform_slug || body.platform || null,
        price: Number(body.price ?? body.rate ?? 0),
        status: body.status || (body.is_active === false ? 'inactive' : 'active'),
        is_active: body.is_active !== false,
        updated_at: now,
      }
      if (!doc.created_at) doc.created_at = now
      const out = await db.collection('services').insertOne(doc)
      return res.status(201).json({ success: true, service: { ...doc, _id: out.insertedId } })
    }

    const page = parseInt(req.query?.page, 10) || 1
    const limit = parseInt(req.query?.limit, 10) || 5000
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query?.search) {
      const s = String(req.query.search).trim()
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { service_id: { $regex: s, $options: 'i' } },
      ]
    }
    if (req.query?.status && req.query.status !== 'all') {
      filter.is_active = req.query.status === 'active'
    }
    if (req.query?.provider_id && req.query.provider_id !== 'all') {
      filter.provider_id = req.query.provider_id
    }

    const [services, total, categories] = await Promise.all([
      db.collection('services')
        .find(filter)
        .sort({ service_id: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('services').countDocuments(filter),
      db.collection('categories').find({}).project({ _id: 1, name: 1, category_id: 1, platform_slug: 1 }).toArray(),
    ])

    const categoryById = {}
    const categoryByName = {}
    for (const c of categories) {
      const id = normalizeId(c?._id || c?.category_id)
      if (id) categoryById[id] = c
      const name = String(c?.name || '').trim().toLowerCase()
      if (name) categoryByName[name] = c
    }

    const normalizedServices = services.map((s) => {
      const candidates = [
        normalizeId(s?.category_id),
        normalizeId(s?.categoryId),
      ].filter(Boolean)
      const directCategory = candidates.map((id) => categoryById[id]).find(Boolean)
      const nameCategory = !directCategory
        ? (categoryByName[String(s?.category || '').trim().toLowerCase()] || categoryByName[String(s?.category_name || '').trim().toLowerCase()])
        : null
      const matched = directCategory || nameCategory || null
      const resolvedCategoryId = matched ? normalizeId(matched._id || matched.category_id) : (candidates[0] || '')
      return {
        ...s,
        category_id: resolvedCategoryId || null,
        category_name: matched?.name || s?.category_name || s?.category || null,
        category: matched?.name || s?.category || s?.category_name || null,
        platform_slug: matched?.platform_slug || s?.platform_slug || null,
      }
    })

    res.json({
      success: true,
      services: normalizedServices,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (err) {
    console.error('listServices error:', err)
    res.status(500).json({ error: err.message })
  }
}

