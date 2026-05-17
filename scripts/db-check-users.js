const { getDb } = require('../lib/handlers/_db')

async function run() {
  const db = await getDb()
  console.log('[db-check-users] connected:', !!db)
  if (!db) {
    console.log('[db-check-users] MongoDB connection unavailable. Check MONGODB_URI in .env')
    return
  }
  const users = await db.collection('users').find({}).limit(5).toArray()
  console.log(`[db-check-users] fetched: ${users.length}`)
  users.forEach((u, i) => {
    console.log(`\n#${i + 1}`)
    console.log({
      _id: u._id,
      user_id: u.user_id,
      email: u.email,
      password_hash: typeof u.password_hash === 'string' ? `len:${u.password_hash.length}` : typeof u.password_hash,
      role: u.role,
      balance: u.balance,
      keys: Object.keys(u),
    })
  })
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[db-check-users] error:', err.message)
    process.exit(1)
  })
