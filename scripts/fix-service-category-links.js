const { getDb } = require('../lib/handlers/_db')

const norm = (v) => String(v || '').trim().toLowerCase()

async function run() {
  const db = await getDb()
  const categories = await db.collection('categories').find({}).toArray()
  if (!categories.length) {
    console.log('No categories found; aborting.')
    process.exit(1)
  }

  const byId = new Map()
  const byName = new Map()
  const bySlug = new Map()
  for (const c of categories) {
    const id = String(c._id)
    byId.set(id, id)
    if (c.category_id) byId.set(String(c.category_id), id)
    if (c.name) byName.set(norm(c.name), id)
    if (c.slug) bySlug.set(norm(c.slug), id)
    if (c.platform_slug) bySlug.set(norm(c.platform_slug), id)
  }

  let fallback = categories.find((c) => norm(c.name) === 'uncategorized')
  if (!fallback) {
    const now = new Date().toISOString()
    const out = await db.collection('categories').insertOne({
      name: 'Uncategorized',
      slug: 'uncategorized',
      status: 'active',
      is_active: true,
      is_visible: true,
      created_at: now,
      updated_at: now,
    })
    fallback = { _id: out.insertedId, name: 'Uncategorized' }
  }
  const fallbackId = String(fallback._id)

  const services = await db.collection('services').find({}).toArray()
  let updated = 0
  for (const s of services) {
    const current = s.category_id ? String(s.category_id) : ''
    let next = byId.get(current) || ''
    if (!next && s.category) next = byName.get(norm(s.category)) || bySlug.get(norm(s.category)) || ''
    if (!next && s.category_name) next = byName.get(norm(s.category_name)) || ''
    if (!next && s.platform_slug) next = bySlug.get(norm(s.platform_slug)) || ''
    if (!next) next = fallbackId
    if (next !== current || !s.status || typeof s.price !== 'number') {
      await db.collection('services').updateOne(
        { _id: s._id },
        {
          $set: {
            category_id: next,
            status: s.status || (s.is_active === false ? 'inactive' : 'active'),
            price: typeof s.price === 'number' ? s.price : Number(s.rate || 0),
            updated_at: new Date().toISOString(),
          },
        }
      )
      updated += 1
    }
  }

  console.log(`Services scanned: ${services.length}`)
  console.log(`Services updated: ${updated}`)
  console.log(`Fallback category: ${fallbackId}`)
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
