/**
 * USD is base (1). Other values = units of that currency per 1 USD (display conversion).
 * Rates are approximate; override via admin_settings.exchange_rates in Mongo when needed.
 */
const DEFAULT_EXCHANGE_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83,
  PHP: 58,
  RUB: 97,
  AED: 3.67,
  SAR: 3.75,
  PKR: 278,
  BDT: 122,
  NGN: 1550,
  BRL: 5.75,
  CAD: 1.43,
  AUD: 1.55,
  JPY: 151,
  CNY: 7.25,
  TRY: 38,
  MXN: 20.5,
  IDR: 16200,
  THB: 36,
  KRW: 1380,
  ZAR: 18.8,
  CHF: 0.9,
  NZD: 1.69,
  SGD: 1.36,
  HKD: 7.78,
  PLN: 4.05,
  SEK: 11.2,
  NOK: 11.7,
  DKK: 7.06,
  MYR: 4.45,
  VND: 25400,
  EGP: 51,
  UAH: 41,
  COP: 3950,
  ARS: 1050,
  QAR: 3.64,
  KWD: 0.31,
  ILS: 3.65,
  CLP: 950,
  PEN: 3.7,
  CZK: 23.5,
  HUF: 395,
  LKR: 300,
  NPR: 280,
  KES: 129,
  GHS: 15.5,
  XOF: 620,
  MAD: 10,
  TWD: 32.5,
  BGN: 1.84,
  RON: 4.6,
};

const ORDER = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "PHP",
  "RUB",
  "AED",
  "SAR",
  "PKR",
  "BDT",
  "NGN",
  "BRL",
  "CAD",
  "AUD",
  "JPY",
  "CNY",
  "TRY",
  "MXN",
  "IDR",
  "THB",
  "KRW",
  "ZAR",
  "CHF",
  "NZD",
  "SGD",
  "HKD",
  "PLN",
  "SEK",
  "NOK",
  "DKK",
  "MYR",
  "VND",
  "EGP",
  "UAH",
  "COP",
  "ARS",
  "QAR",
  "KWD",
  "ILS",
  "CLP",
  "PEN",
  "CZK",
  "HUF",
  "LKR",
  "NPR",
  "KES",
  "GHS",
  "XOF",
  "MAD",
  "TWD",
  "BGN",
  "RON",
];

const DEFAULT_SUPPORTED_CURRENCIES = ORDER.filter((c) => DEFAULT_EXCHANGE_RATES[c]);

function normalizeRates(overrides) {
  const out = { ...DEFAULT_EXCHANGE_RATES };
  if (!overrides || typeof overrides !== "object") return out;
  for (const [k, v] of Object.entries(overrides)) {
    const code = String(k || "").toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[code] = n;
  }
  out.USD = 1;
  return out;
}

function normalizeSupported(list, rates) {
  const keys = new Set(Object.keys(rates));
  if (!Array.isArray(list) || list.length === 0) {
    return DEFAULT_SUPPORTED_CURRENCIES.filter((c) => keys.has(c));
  }
  const picked = [];
  const seen = new Set();
  for (const raw of list) {
    const c = String(raw || "").toUpperCase();
    if (!/^[A-Z]{3}$/.test(c) || !keys.has(c) || seen.has(c)) continue;
    seen.add(c);
    picked.push(c);
  }
  if (picked.length === 0) {
    return DEFAULT_SUPPORTED_CURRENCIES.filter((c) => keys.has(c));
  }
  if (!picked.includes("USD")) picked.unshift("USD");
  return picked;
}

/** True if code exists in static defaults (for quick checks without DB). */
function isAllowedCurrency(code) {
  const c = String(code || "").toUpperCase();
  return /^[A-Z]{3}$/.test(c) && Object.prototype.hasOwnProperty.call(DEFAULT_EXCHANGE_RATES, c);
}

module.exports = {
  DEFAULT_EXCHANGE_RATES,
  DEFAULT_SUPPORTED_CURRENCIES,
  normalizeRates,
  normalizeSupported,
  isAllowedCurrency,
};
