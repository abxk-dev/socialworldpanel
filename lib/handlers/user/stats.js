const { getDb } = require('./_db')
const getUserId = require('../../getUserId')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      partialOrders,
      spentAgg,
    ] = await Promise.all([
      db.collection('orders').countDocuments({ user_id: userId }),
      db.collection('orders').countDocuments({ user_id: userId, status: 'pending' }),
      db.collection('orders').countDocuments({ user_id: userId, status: 'completed' }),
      db.collection('orders').countDocuments({ user_id: userId, status: 'cancelled' }),
      db.collection('orders').countDocuments({ user_id: userId, status: 'partial' }),
      db.collection('orders').aggregate([
        { $match: { user_id: userId } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$price' } } } },
      ]).toArray(),
    ])

    const user = await db.collection('users').findOne(
      { user_id: userId },
      { projection: { balance: 1, total_deposited: 1, loyalty_points: 1, loyalty_tier: 1, referral_code: 1, spin_streak: 1, last_spin_at: 1, spin_free_views: 1 } }
    )

    res.json({
      success: true,
      stats: {
        balance: user?.balance || 0,
        total_orders: totalOrders,
        pending_orders: pendingOrders,
        completed_orders: completedOrders,
        cancelled_orders: cancelledOrders,
        partial_orders: partialOrders,
        total_spent: spentAgg?.[0]?.total || 0,
        total_deposited: user?.total_deposited || 0,
        loyalty_points: user?.loyalty_points || 0,
        loyalty_tier: user?.loyalty_tier || 'Bronze',
        referral_code: user?.referral_code || null,
        spin_streak: user?.spin_streak || 0,
        last_spin_at: user?.last_spin_at || null,
        spin_free_views: Number(user?.spin_free_views || 0),
      },
    })
  } catch (err) {
    console.error('stats error:', err)
    res.status(500).json({ error: err.message })
  }
}

