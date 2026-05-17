const { getDb } = require('../_db')
const getUserId = require('../../getUserId')
const { getUserSpendUsd, spendRequirementPayload } = require('../../spinEligibility')

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const [user, settings, spentUsd] = await Promise.all([
      db.collection('users').findOne({ user_id: userId }),
      db.collection('admin_settings').findOne({ panel_name: { $exists: true } }, { projection: { spin_prizes: 1 } }),
      getUserSpendUsd(db, userId),
    ])

    const spendReq = spendRequirementPayload(spentUsd)

    const lastSpin = user?.last_spin_at
    const now = new Date()
    const cooldownReady = !lastSpin || (now - new Date(lastSpin)) > 24 * 60 * 60 * 1000
    const nextSpinAt = lastSpin ? new Date(new Date(lastSpin).getTime() + 24 * 60 * 60 * 1000) : null
    const prizes = Array.isArray(settings?.spin_prizes) ? settings.spin_prizes : []
    const canSpin = cooldownReady && spendReq.met

    res.json({
      success: true,
      can_spin: canSpin,
      cooldown_ready: cooldownReady,
      spend_requirement: spendReq,
      last_spin_at: lastSpin || null,
      next_spin_at: nextSpinAt,
      total_spins: Number(user?.total_spins || 0),
      total_won: Number(user?.spin_winnings || 0),
      total_earned: Number(user?.spin_winnings || 0),
      streak: Number(user?.spin_streak || 0),
      prizes: prizes.map((p) => ({
        label: p?.label || '',
        type: p?.type || 'credit',
        value: Number(p?.value || 0),
        weight: Number(p?.weight ?? p?.probability ?? 0),
        color: p?.color || '#00d2ff',
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

