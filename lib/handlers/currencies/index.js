const { getDb } = require("../../db");
const {
  normalizeRates,
  normalizeSupported,
} = require("../../currencyDefaults");

/**
 * Public GET /api/currencies
 * - exchange_rates: units of each currency per 1 USD
 * - supported_currencies: codes users may select
 * Optional admin_settings.exchange_rates / supported_currencies override defaults.
 */
module.exports = async function currenciesIndex(req, res) {
  let rates = normalizeRates(null);
  let supported = normalizeSupported(null, rates);

  try {
    const db = await getDb();
    if (db) {
      const doc =
        (await db
          .collection("admin_settings")
          .findOne({}, { sort: { updated_at: -1, _id: -1 } })) || {};
      rates = normalizeRates(doc.exchange_rates);
      supported = normalizeSupported(doc.supported_currencies, rates);
    }
  } catch (e) {
    console.error("[currencies]", e.message);
  }

  return res.json({
    base_currency: "USD",
    exchange_rates: rates,
    supported_currencies: supported,
  });
};
