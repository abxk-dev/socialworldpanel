const { getDb } = require('../lib/handlers/_db')

async function run() {
  const db = await getDb()
  console.log('[db-find-duplicate-emails] connected:', !!db)
  if (!db) {
    console.log('[db-find-duplicate-emails] MongoDB connection unavailable. Check MONGODB_URI in .env')
    return
  }
  const rows = await db.collection('users').aggregate([
    {
      $project: {
        email_lc: { $toLower: { $ifNull: ['$email', ''] } },
        email: 1,
        user_id: 1,
      },
    },
    {
      $match: {
        email_lc: { $ne: '' },
      },
    },
    {
      $group: {
        _id: '$email_lc',
        count: { $sum: 1 },
        users: { $push: { email: '$email', user_id: '$user_id' } },
      },
    },
    {
      $match: { count: { $gt: 1 } },
    },
    { $sort: { count: -1 } },
  ]).toArray()

  console.log('[db-find-duplicate-emails] duplicates:', rows.length)
  rows.forEach((r) => {
    console.log('\nemail:', r._id, 'count:', r.count)
    console.log(r.users)
  })
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[db-find-duplicate-emails] error:', err.message)
    process.exit(1)
  })
