import { useCallback } from 'react';
import { useSettings } from '../App';
import { useCurrency } from '../context/CurrencyContext';
import { CURRENCY_SYMBOLS } from '../lib/currencyDisplay';

/** Decimal places for each rates_rounding value (admin Advanced settings). */
const ROUNDING_DECIMALS = {
  none: 6,
  whole: 0,
  tenth: 1,
  hundredth: 2,
  thousandth: 3,
  ten_thousandth: 4,
  hundred_thousandth: 5,
};

/**
 * Formats a service rate (price per 1000) using admin "Rates rounding" setting.
 * Use this for displaying service.rate / per 1000 / per 1k everywhere on the user side.
 * Also returns formatPriceWithRateDecimals(amount) for order totals so they use the same decimals.
 */
export function useFormatRate() {
  const { settings } = useSettings();
  const { convertPrice, currency } = useCurrency();

  const rounding = settings?.rates_rounding || 'hundredth';
  const rateDecimals = ROUNDING_DECIMALS[rounding] ?? 2;

  const formatRate = useCallback((rate, toCurrency = currency) => {
    const converted = convertPrice(rate, toCurrency);
    const symbol = CURRENCY_SYMBOLS[toCurrency] || toCurrency + ' ';
    return `${symbol}${Number(converted).toFixed(rateDecimals)}`;
  }, [rateDecimals, convertPrice, currency]);

  /** Format an order total (or any price) with the same decimal places as rates. Use for Total Cost / Place Order. */
  const formatPriceWithRateDecimals = useCallback((amount, toCurrency = currency, opts = {}) => {
    const converted = convertPrice(amount, toCurrency);
    const symbol = CURRENCY_SYMBOLS[toCurrency] || toCurrency + ' ';
    const decimals = rateDecimals;
    const balanceMode = String(settings?.balance_format || 'default');
    const forBalance = !!opts?.forBalance;

    if (forBalance && balanceMode === 'compact') {
      const compact = new Intl.NumberFormat(undefined, {
        notation: 'compact',
        maximumFractionDigits: decimals,
      }).format(Number(converted) || 0);
      return `${symbol}${compact}`;
    }

    if (forBalance && balanceMode === 'symbol_only') {
      return symbol.trim();
    }

    // default/full -> fixed decimal display like 10.83 / 0.00
    return `${symbol}${Number(converted).toFixed(decimals)}`;
  }, [convertPrice, currency, rateDecimals, settings?.balance_format]);

  return { formatRate, formatPriceWithRateDecimals };
}

export default useFormatRate;
