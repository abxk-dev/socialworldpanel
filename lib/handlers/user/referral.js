const { getDb } = require('../_db')
const getUserId = require('../../getUserId')
const { ensureUserReferralCode, normalizeRefCode, escapeRegex } = require('../../referralCode')

/**
 * Spendable referral wallet: use `referral_balance` when the field exists (including 0 after transfers).
 * If the field was never set (undefined/null), fall back to sum(referral_earnings) so new users without
 * a seeded balance still see earnings from `referral_earnings`.
 */
function referralWalletBalance(user, totalEarned) {
  const earned = Number(totalEarned) || 0
  if (user?.referral_balance === undefined || user?.referral_balance === null) {
    return earned
  }
  const n = Number(user.referral_balance)
  return Number.isFinite(n) ? n : earned
}

function referralLinkForCode(code) {
  const origin = (process.env.FRONTEND_URL || process.env.SITE_URL || '').replace(/\/$/, '')
  const q = `register?ref=${encodeURIComponent(code)}`
  if (origin.startsWith('http')) return `${origin}/${q}`
  return `/${q}`
}

async function getReferral(req, res) {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  let user = await db.collection('users').findOne({ user_id: userId })
  if (!user) return res.status(404).json({ error: 'User not found' })

  user = await ensureUserReferralCode(db, user)
  const code = user.referral_code
  const codeNorm =
    normalizeRefCode(code) || String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

  const referrals =
    !codeNorm || codeNorm.length < 4
      ? []
      : await db
          .collection('users')
          .find({
            referred_by: { $regex: new RegExp(`^${escapeRegex(codeNorm)}$`, 'i') },
          })
          .project({
            username: 1,
            email: 1,
            created_at: 1,
            balance: 1,
            referred_by: 1,
          })
          .toArray()

  const earnings = await db.collection('referral_earnings')
    .find({ referrer_id: userId })
    .sort({ created_at: -1 })
    .toArray()

  const totalEarned = earnings.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  const referralBalance = referralWalletBalance(user, totalEarned)

  res.json({
    success: true,
    referral_code: code,
    referral_link: referralLinkForCode(code),
    referral_balance: referralBalance,
    referred_count: referrals.length,
    total_referrals: referrals.length,
    total_earned: totalEarned,
    referrals,
    earnings,
  })
}

async function postReferral(req, res) {
  const db = await getDb()
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const action = String(req.body?.action || '')
  if (action !== 'transfer') {
    return res.status(400).json({ error: 'Invalid action' })
  }

  let user = await db.collection('users').findOne({ user_id: userId })
  if (!user) return res.status(404).json({ error: 'User not found' })

  user = await ensureUserReferralCode(db, user)

  const earnings = await db.collection('referral_earnings')
    .find({ referrer_id: userId })
    .toArray()
  const totalEarned = earnings.reduce((sum, e) => sum + Number(e.amount || 0), 0)

  let available = referralWalletBalance(user, totalEarned)
  const rawBal = user.referral_balance
  if (rawBal === undefined || rawBal === null || rawBal === '') {
    await db.collection('users').updateOne(
      { user_id: userId },
      { $set: { referral_balance: available } }
    )
  }

  const rawAmt = req.body?.amount
  const transferAmt =
    rawAmt === undefined || rawAmt === null || rawAmt === ''
      ? available
      : Number(rawAmt)

  if (!Number.isFinite(transferAmt) || transferAmt <= 0) {
    return res.status(400).json({ detail: 'Invalid amount' })
  }
  if (transferAmt > available + 1e-9) {
    return res.status(400).json({ detail: 'Amount exceeds referral balance' })
  }

  await db.collection('users').updateOne(
    { user_id: userId },
    {
      $inc: { balance: transferAmt, referral_balance: -transferAmt },
    }
  )

  res.json({ success: true, transferred: transferAmt })
}

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    return postReferral(req, res)
  }
  return getReferral(req, res)
}
