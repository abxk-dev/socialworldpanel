/**
 * MongoDB user_id is inconsistent across docs (string vs number). These helpers
 * match/update the same logical user for both shapes (critical for IP tracking).
 */

function expandUserIdsForIn(ids) {
  const set = new Set()
  for (const id of ids) {
    const s = String(id ?? '').trim()
    if (!s) continue
    set.add(s)
    if (/^\d+$/.test(s)) {
      const n = parseInt(s, 10)
      if (Number.isSafeInteger(n)) set.add(n)
    }
  }
  return [...set]
}

/** Filter for updateOne/findOne on a single user by user_id. */
function userIdEqualityFilter(uid) {
  const s = String(uid ?? '').trim()
  if (!s) return null
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10)
    if (Number.isSafeInteger(n)) return { $or: [{ user_id: s }, { user_id: n }] }
  }
  return { user_id: s }
}

/** Exclude the current user when user_id may be stored as string or number. */
function userIdNotSelfFilter(uid) {
  const s = String(uid ?? '').trim()
  if (!s) return {}
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10)
    if (Number.isSafeInteger(n)) return { user_id: { $nin: [s, n] } }
  }
  return { user_id: { $ne: s } }
}

module.exports = {
  expandUserIdsForIn,
  userIdEqualityFilter,
  userIdNotSelfFilter,
}
