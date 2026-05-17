const { getDb } = require('../lib/handlers/_db')

function toNumber(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

async function run() {
  const db = await getDb()
  console.log('[db-fix-users] connected:', !!db)
  if (!db) {
    console.log('[db-fix-users] MongoDB connection unavailable. Check MONGODB_URI in .env')
    return
  }

  const users = await db.collection('users').find({}).toArray()
  let fixed = 0

  for (const u of users) {
    const updates = {}
    if (!u.user_id || typeof u.user_id !== 'string') updates.user_id = u.user_id ? String(u.user_id) : `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    if (!u.email || typeof u.email !== 'string') updates.email = u.email ? String(u.email) : `${updates.user_id || u.user_id}@local.invalid`
    if (!u.password_hash || typeof u.password_hash !== 'string') updates.password_hash = typeof u.password === 'string' ? u.password : ''
    if (!u.role || typeof u.role !== 'string') updates.role = 'user'
    if (typeof u.balance !== 'number') updates.balance = toNumber(u.balance, 0)

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      await db.collection('users').updateOne({ _id: u._id }, { $set: updates })
      fixed += 1
    }
  }

  console.log('[db-fix-users] scanned:', users.length)
  console.log('[db-fix-users] updated:', fixed)
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[db-fix-users] error:', err.message)
    process.exit(1)
  })
