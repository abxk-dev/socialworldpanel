const { getDb } = require('../_db')
const getUserId = require('../../getUserId')

const METHOD_LABELS = {
  manual_qr: 'Paytm QR',
  manual: 'Manual',
  manual_qr_payment: 'Paytm QR',
  cashfree: 'Cashfree',
  upi: 'UPI',
  gcash: 'GCash',
  cryptomus: 'Crypto',
  admin_adjust: 'Admin adjustment',
}

async function loadInrRate(db) {
  const latest = await db.collection('admin_settings').findOne({}, { sort: { updated_at: -1, _id: -1 } }).catch(() => null)
  const manual = latest?.manual_qr && typeof latest.manual_qr === 'object' ? latest.manual_qr : {}
  let r = Number(manual.usd_to_inr_rate ?? manual.inr_per_usd)
  if (!(r > 0)) r = Number(process.env.USD_TO_INR_RATE) || 93
  return r
}

function transactionIdFrom(doc) {
  return (
    doc.order_id ||
    doc.invoice_id ||
    doc.cf_order_id ||
    doc.txn_id ||
    (doc.deposit_id && String(doc.deposit_id).startsWith('dep_') ? doc.deposit_id : null) ||
    null
  )
}

function paymentTypeKey(doc) {
  if (doc.payment_type) return String(doc.payment_type)
  if (doc.method) return String(doc.method)
  return 'unknown'
}

/**
 * Panel balance is USD; INR deposits store amount_inr / amount in rupees.
 * Exposes amount (USD) for UI and stable deposit_id for list keys.
 */
function normalizeDeposit(doc, inrRate) {
  const id = doc._id != null ? String(doc._id) : ''
  const deposit_id = doc.deposit_id || id
  const ptype = paymentTypeKey(doc)
  const methodLabel = METHOD_LABELS[ptype] || ptype.replace(/_/g, ' ')

  let amountUsd = null
  if (doc.amount_usd != null && doc.amount_usd !== '' && Number.isFinite(Number(doc.amount_usd))) {
    amountUsd = Number(doc.amount_usd)
  }
  if (amountUsd == null || !Number.isFinite(amountUsd)) {
    if (ptype === 'manual_qr' || doc.amount_currency === 'INR') {
      const inr = Number(doc.amount_inr ?? doc.amount ?? 0)
      if (inr > 0 && inrRate > 0) {
        amountUsd = Math.round((inr / inrRate) * 10000) / 10000
      }
    }
  }
  if (amountUsd == null || !Number.isFinite(amountUsd)) {
    amountUsd = Number(doc.amount ?? 0)
  }

  const { screenshot_base64: _drop, ...rest } = doc
  const amountInr =
    doc.amount_inr != null && doc.amount_inr !== ''
      ? Number(doc.amount_inr)
      : doc.amount_currency === 'INR'
        ? Number(doc.amount)
        : null

  return {
    ...rest,
    deposit_id,
    transaction_id: transactionIdFrom(doc),
    method: methodLabel,
    payment_type: ptype,
    amount: amountUsd,
    amount_usd: Number.isFinite(Number(doc.amount_usd)) ? Number(doc.amount_usd) : amountUsd,
    amount_inr: Number.isFinite(amountInr) ? amountInr : null,
  }
}

module.exports = async (req, res) => {
  try {
    const db = await getDb()
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20))
    const skip = (page - 1) * limit

    const inrRate = await loadInrRate(db)

    const pipeline = [
      { $match: { user_id: userId } },
      {
        $addFields: {
          _sortAt: {
            $ifNull: [
              { $convert: { input: '$created_at', to: 'date', onError: null, onNull: null } },
              { $toDate: '$_id' },
            ],
          },
        },
      },
      { $sort: { _sortAt: -1 } },
      {
        $facet: {
          slice: [{ $skip: skip }, { $limit: limit }, { $project: { screenshot_base64: 0 } }],
          total: [{ $count: 'n' }],
        },
      },
    ]

    const agg = await db.collection('deposits').aggregate(pipeline).toArray()
    const facet = agg[0] || {}
    const raw = facet.slice || []
    const total = facet.total?.[0]?.n ?? 0
    const pages = Math.max(1, Math.ceil(total / limit))

    const deposits = raw.map((d) => normalizeDeposit(d, inrRate))

    res.json({ success: true, deposits, total, page, limit, pages })
  } catch (err) {
    console.error('GET /deposits error:', err)
    res.status(500).json({ error: err.message })
  }
}
