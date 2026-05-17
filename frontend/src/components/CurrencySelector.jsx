import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../App';
import { CURRENCY_FLAGS, CURRENCY_NAMES } from '../lib/currencyDisplay';

export default function CurrencySelector() {
  const { currency, setCurrency, supportedCurrencies, rates } = useCurrency();
  const { refreshUser } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    if (open) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
  }, [open]);

  const handleToggle = (e) => {
    e.stopPropagation();
    setOpen((o) => !o);
  };

  const handleSelect = async (c) => {
    setOpen(false);
    await setCurrency(c);
    refreshUser?.();
  };

  const supported = Array.isArray(supportedCurrencies) && supportedCurrencies.length > 0
    ? supportedCurrencies
    : ['USD'];

  const rateLine =
    currency === 'USD'
      ? 'Base currency'
      : `1 USD ≈ ${rates[currency] != null ? Number(rates[currency]).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'} ${currency}`;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-sm"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{CURRENCY_FLAGS[currency] || '💱'}</span>
        <span>{currency}</span>
        <span className="text-gray-500">▾</span>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 rounded-xl border border-white/10 bg-deep-navy shadow-xl z-[9999] w-[min(100vw-2rem,280px)] overflow-hidden flex flex-col max-h-[min(70vh,420px)]"
          role="listbox"
        >
          <div className="overflow-y-auto overscroll-contain py-1">
            {supported.map((c) => (
              <button
                key={c}
                type="button"
                role="option"
                aria-selected={c === currency}
                onClick={() => handleSelect(c)}
                className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                  c === currency
                    ? 'bg-neon-green/10 text-neon-green'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0">{CURRENCY_FLAGS[c] || '💱'}</span>
                  <span className="truncate">
                    <span className="font-medium text-inherit">{c}</span>
                    {CURRENCY_NAMES[c] ? (
                      <span className="block text-xs opacity-70 truncate">{CURRENCY_NAMES[c]}</span>
                    ) : null}
                  </span>
                </span>
                {c === currency && <span className="text-neon-green shrink-0">✓</span>}
              </button>
            ))}
          </div>
          <div className="border-t border-white/10 px-4 py-2 text-xs text-gray-500 shrink-0">
            {rateLine}
          </div>
        </div>
      )}
    </div>
  );
}
