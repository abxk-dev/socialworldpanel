/**
 * Shared MongoDB filter for GET /admin/users (Node admin + adminSafe).
 * @param {Record<string, string | undefined>} q - req.query
 * @returns {import('mongodb').Filter}
 */
function buildAdminUsersFilter(q) {
  const and = []

  if (q?.search) {
    const s = String(q.search).trim()
    and.push({
      $or: [
        { email: { $regex: s, $options: 'i' } },
        { username: { $regex: s, $options: 'i' } },
        { name: { $regex: s, $options: 'i' } },
        { user_id: s },
      ],
    })
  }

  if (q?.role && q.role !== 'all') {
    if (q.role === 'admin_all') {
      and.push({ role: { $in: ['admin', 'main_admin'] } })
    } else {
      and.push({ role: q.role })
    }
  }

  if (q?.country && q.country !== 'all') {
    const cc = String(q.country).trim().toUpperCase().slice(0, 2)
    if (cc.length === 2) {
      and.push({
        $or: [
          { 'location.country_code': cc },
          { 'location.country_code': cc.toLowerCase() },
          { country_code: cc },
          { country_code: cc.toLowerCase() },
        ],
      })
    }
  }

  if (q?.same_ip) {
    const ip = String(q.same_ip).trim()
    if (ip) {
      and.push({
        $or: [{ last_login_ip: ip }, { last_ip: ip }, { known_ips: ip }],
      })
    }
  }

  const status = String(q?.status || 'all')
  if (status === 'active') {
    and.push({
      is_suspended: { $ne: true },
      $or: [{ is_active: true }, { is_active: { $exists: false } }],
    })
  } else if (status === 'suspended') {
    and.push({
      $or: [{ is_suspended: true }, { is_active: false }],
    })
  }

  const signup = String(q?.signup || 'all')
  if (signup === 'google') {
    and.push({
      $or: [
        { google_id: { $exists: true, $nin: [null, ''] } },
        { google_sub: { $exists: true, $nin: [null, ''] } },
      ],
    })
  } else if (signup === 'email') {
    and.push({
      $and: [
        { $or: [{ google_id: { $exists: false } }, { google_id: null }, { google_id: '' }] },
        { $or: [{ google_sub: { $exists: false } }, { google_sub: null }, { google_sub: '' }] },
      ],
    })
  }

  if (q?.joined_after) {
    const d = String(q.joined_after).trim()
    if (d) and.push({ created_at: { $gte: d } })
  }
  if (q?.joined_before) {
    const d = String(q.joined_before).trim()
    if (d) and.push({ created_at: { $lte: `${d}T23:59:59.999Z` } })
  }

  const bmin = q?.balance_min
  if (bmin !== undefined && bmin !== '' && bmin != null) {
    const n = Number(bmin)
    if (Number.isFinite(n)) and.push({ balance: { $gte: n } })
  }
  const bmax = q?.balance_max
  if (bmax !== undefined && bmax !== '' && bmax != null) {
    const n = Number(bmax)
    if (Number.isFinite(n)) and.push({ balance: { $lte: n } })
  }

  return and.length ? { $and: and } : {}
}

module.exports = { buildAdminUsersFilter }
