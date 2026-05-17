const { DEFAULT_EXCHANGE_RATES } = require('./currencyDefaults')

/** Minimum lifetime order spend to use the spin wheel (either threshold is enough). */
const MIN_SPEND_USD = 1
const MIN_SPEND_INR = 100

function inrPerUsd() {
  const r = Number(DEFAULT_EXCHANGE_RATES.INR)
  return Number.isFinite(r) && r > 0 ? r : 83
}

/**
 * Sum panel-currency spend from orders (same idea as loyalty: prefer charge, else price).
 */
async function getUserSpendUsd(db, userId) {
  if (!db || !userId) return 0
  const orders = await db
    .collection('orders')
    .find({ user_id: userId }, { projection: { charge: 1, price: 1 } })
    .toArray()
  return orders.reduce((s, o) => {
    const c = Number(o.charge)
    if (Number.isFinite(c) && c > 0) return s + c
    return s + (Number(o.price) || 0)
  }, 0)
}

function meetsSpendRequirement(spentUsd) {
  const usd = Number(spentUsd) || 0
  if (usd >= MIN_SPEND_USD) return true
  const inrEq = usd * inrPerUsd()
  return inrEq >= MIN_SPEND_INR
}

function spendRequirementPayload(spentUsd) {
  const usd = Number(spentUsd) || 0
  const inr = inrPerUsd()
  const spentInrEquiv = usd * inr
  return {
    met: meetsSpendRequirement(usd),
    spent_usd: usd,
    spent_inr_equivalent: spentInrEquiv,
    min_usd: MIN_SPEND_USD,
    min_inr: MIN_SPEND_INR,
    inr_per_usd: inr,
  }
}

module.exports = {
  MIN_SPEND_USD,
  MIN_SPEND_INR,
  getUserSpendUsd,
  meetsSpendRequirement,
  spendRequirementPayload,
}
