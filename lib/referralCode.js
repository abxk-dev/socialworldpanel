const crypto = require('crypto')

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Create a short unique referral code (sparse unique index on users.referral_code).
 */
async function generateUniqueReferralCode(db) {
  const coll = db.collection('users')
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let code = ''
    for (let i = 0; i < 8; i += 1) {
      code += ALPHABET[crypto.randomInt(0, ALPHABET.length)]
    }
    const exists = await coll.findOne({ referral_code: code }, { projection: { _id: 1 } })
    if (!exists) return code
  }
  const fallback = `R${crypto.randomBytes(6).toString('hex').toUpperCase()}`
  const exists = await coll.findOne({ referral_code: fallback }, { projection: { _id: 1 } })
  if (!exists) return fallback
  return `R${crypto.randomBytes(8).toString('hex').toUpperCase()}`
}

/**
 * Persist referral_code if missing (existing users created before codes existed).
 */
async function ensureUserReferralCode(db, user) {
  if (!user || !user.user_id) return user
  const existing = user.referral_code != null && String(user.referral_code).trim()
  if (existing) return user

  const code = await generateUniqueReferralCode(db)
  await db.collection('users').updateOne(
    { user_id: user.user_id },
    { $set: { referral_code: code } }
  )
  return { ...user, referral_code: code }
}

function normalizeRefCode(raw) {
  const s = String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (s.length < 4 || s.length > 64) return ''
  return s
}

/** Match stored codes case-insensitively (legacy rows may differ in case). */
async function findUserByReferralCode(db, rawRef) {
  const normalized = normalizeRefCode(rawRef)
  if (!normalized) return null
  const coll = db.collection('users')
  let u = await coll.findOne({ referral_code: normalized })
  if (u) return u
  return coll.findOne({
    referral_code: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, 'i') },
  })
}

/** Value to store on referee so it matches referrer stats queries. */
function canonicalReferrerCode(refUser) {
  if (!refUser || refUser.referral_code == null) return ''
  const s = String(refUser.referral_code).trim()
  if (!s) return ''
  const n = normalizeRefCode(s)
  if (n) return n
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

module.exports = {
  generateUniqueReferralCode,
  ensureUserReferralCode,
  normalizeRefCode,
  findUserByReferralCode,
  canonicalReferrerCode,
  escapeRegex,
}
