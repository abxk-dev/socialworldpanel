const { getDb } = require('./_db')
const { ObjectId } = require('mongodb')
const getUserId = require('../getUserId')

const getWithdrawalSettings = async (req, res) => {
  res.json({
    success: true,
    settings: {
      min_amount: 100,
      max_amount: 50000,
      methods: ['upi', 'bank_transfer', 'paytm'],
      processing_time: '1-3 business days',
    },
  })
}

const requestWithdrawal = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  const { amount, method, account_details } = req.body

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!amount || amount < 100) {
    return res.status(400).json({ 
      error: 'Minimum withdrawal is ₹100' 
    })
  }

  const user = await db.collection('users')
    .findOne({ user_id: userId })

  if (user.balance < amount) {
    return res.status(400).json({ 
      error: 'Insufficient balance' 
    })
  }

  const withdrawal = {
    user_id: userId,
    username: user.username,
    email: user.email,
    amount,
    method: method || 'upi',
    account_details,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  await db.collection('withdrawals').insertOne(withdrawal)
  await db.collection('users').updateOne(
    { user_id: userId },
    { $inc: { balance: -amount } }
  )

  res.json({ success: true, withdrawal })
}

const getUserWithdrawals = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const withdrawals = await db.collection('withdrawals')
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray()

  res.json({ success: true, withdrawals })
}

const cancelWithdrawal = async (req, res) => {
  const db = await getDb()
  const userId = getUserId(req)
  const { id } = req.params

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const withdrawal = await db.collection('withdrawals').findOne({
    _id: new ObjectId(id),
    user_id: userId,
  })

  if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' })
  if (withdrawal.status !== 'pending') {
    return res.status(400).json({ error: 'Only pending withdrawals can be cancelled' })
  }

  await db.collection('withdrawals').updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'cancelled', updated_at: new Date().toISOString() } }
  )

  // Refund
  await db.collection('users').updateOne(
    { user_id: userId },
    { $inc: { balance: withdrawal.amount || 0 } }
  )

  res.json({ success: true, message: 'Withdrawal cancelled and refunded' })
}

// Backward compat
const getWithdrawals = getUserWithdrawals

// Admin endpoints expected by `routes/admin.js`.
// These are lightweight stubs for localhost; adjust later if you want full DB-backed admin withdrawal management.
const adminStats = async (req, res) => {
  res.json({
    success: true,
    pending_count: 0,
    pending_total_usd: 0,
    paid_today: 0,
    paid_today_usd: 0,
    total_fees_collected: 0,
  });
};

const adminListWithdrawals = async (req, res) => {
  try {
    const db = await getDb()
    const withdrawals = await db.collection('withdrawals')
      .find({})
      .sort({ created_at: -1 })
      .toArray()
    const userIds = [...new Set(withdrawals.map(w => w.user_id).filter(Boolean))]
    const users = await db.collection('users')
      .find({ user_id: { $in: userIds } })
      .project({ user_id: 1, username: 1, email: 1 })
      .toArray()
    const userMap = {}
    users.forEach(u => { userMap[u.user_id] = u })
    const enriched = withdrawals.map(w => ({
      ...w,
      username: userMap[w.user_id]?.username || w.user_id,
      user_email: userMap[w.user_id]?.email || w.user_email,
    }))
    const pending = withdrawals.filter(w => w.status === 'pending')
    res.json({
      success: true,
      withdrawals: enriched,
      total: withdrawals.length,
      page: 1,
      pages: 1,
      stats: {
        pending_count: pending.length,
        pending_total: pending.reduce((s, w) => s + (w.requested_amount || 0), 0),
        fees_collected: withdrawals.filter(w => w.status === 'paid').reduce((s, w) => s + (w.total_fee || 0), 0)
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
};

const adminApprove = async (req, res) => {
  res.json({ success: true });
};

const adminReject = async (req, res) => {
  res.json({ success: true });
};

module.exports = {
  getWithdrawalSettings,
  getUserWithdrawals,
  requestWithdrawal,
  cancelWithdrawal,
  getWithdrawals,
  adminStats,
  adminListWithdrawals,
  adminApprove,
  adminReject,
};

