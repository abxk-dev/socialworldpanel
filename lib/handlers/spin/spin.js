const { getDb } = require('../_db')
const getUserId = require('../../getUserId')
const { getUserSpendUsd, meetsSpendRequirement } = require('../../spinEligibility')

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

    if (!meetsSpendRequirement(spentUsd)) {
      return res.status(403).json({
        error: 'Spin wheel unlocks after you spend at least $1 or ₹100 on orders (lifetime).',
        code: 'spin_spend_required',
      })
    }

    const now = new Date()
    const lastSpin = user?.last_spin_at
    const canSpin = !lastSpin || (now - new Date(lastSpin)) > 24 * 60 * 60 * 1000
    if (!canSpin) {
      const nextSpin = new Date(new Date(lastSpin).getTime() + 24 * 60 * 60 * 1000)
      return res.status(400).json({ error: 'Already spun today', next_spin_at: nextSpin })
    }

    const prizes = (Array.isArray(settings?.spin_prizes) ? settings.spin_prizes : [])
      .map((p) => ({ ...p, weight: Number(p?.weight ?? p?.probability ?? 0) }))
      .filter((p) => Number(p?.weight || 0) > 0)
    if (!prizes.length) {
      return res.status(400).json({ error: 'No spin prizes configured' })
    }

    const totalWeight = prizes.reduce((sum, p) => sum + Number(p.weight || 0), 0)
    let roll = Math.random() * totalWeight
    let selectedIndex = 0
    for (let i = 0; i < prizes.length; i += 1) {
      roll -= Number(prizes[i].weight || 0)
      if (roll <= 0) {
        selectedIndex = i
        break
      }
    }
    const selected = prizes[selectedIndex]
    const prizeType = String(selected?.type || 'credit').toLowerCase()
    const prizeValue = Number(selected?.value || 0)
    const prizeLabel = selected?.label || 'Prize'
    const updateInc = { total_spins: 1 }
    let couponCode = null

    if (prizeType === 'credit') {
      updateInc.balance = prizeValue
      updateInc.spin_winnings = prizeValue
    } else if (prizeType === 'free_order') {
      updateInc.spin_free_views = prizeValue
    } else if (prizeType === 'discount') {
      couponCode = `SPIN${Date.now().toString().slice(-6)}`
    }

    const prevStreak = Number(user?.spin_streak || 0)
    const keepStreak = lastSpin && (now - new Date(lastSpin)) <= 48 * 60 * 60 * 1000
    const nextStreak = keepStreak ? (prevStreak + 1) : 1

    await db.collection('users').updateOne(
      { user_id: userId },
      {
        $set: { last_spin_at: now.toISOString(), spin_streak: nextStreak },
        ...(Object.keys(updateInc).length ? { $inc: updateInc } : {}),
      }
    )

    await db.collection('spin_history').insertOne({
      user_id: userId,
      prize: {
        label: prizeLabel,
        type: prizeType,
        value: prizeValue,
        color: selected?.color || null,
        coupon_code: couponCode,
      },
      prize_type: prizeType,
      coupon_code: couponCode,
      streak: nextStreak,
      spun_at: now.toISOString(),
      created_at: now.toISOString(),
    })

    const newBalance = Number(user?.balance || 0) + Number(updateInc.balance || 0)
    res.json({
      success: true,
      prize_index: selectedIndex,
      prize: {
        label: prizeLabel,
        type: prizeType,
        value: prizeValue,
        coupon_code: couponCode,
      },
      bonus_amount: 0,
      new_balance: newBalance,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

