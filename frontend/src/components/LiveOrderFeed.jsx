import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/axios';

const FEED_URL = '/public/live-feed';
const REFRESH_MS = 45000;
const TOAST_CYCLE_MS = 8000;
const TOAST_VISIBLE_MS = 4000;

export default function LiveOrderFeed({ mode = 'ticker' }) {
  const [data, setData] = useState({ enabled: false, feed: [], total_today: 0, speed_ms: 3000, show_toast: true });
  const [toastIndex, setToastIndex] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastDismissed, setToastDismissed] = useState(false);
  const refreshRef = useRef(null);
  const toastCycleRef = useRef(null);
  const toastHideRef = useRef(null);

  const fetchFeed = () => {
    api.get(FEED_URL)
      .then((res) => {
        const d = res.data || {};
        if (d.enabled && Array.isArray(d.feed) && d.feed.length > 0) {
          setData({
            enabled: true,
            feed: d.feed,
            total_today: d.total_today ?? 0,
            speed_ms: d.speed_ms ?? 3000,
            show_toast: d.show_toast !== false,
          });
        } else {
          setData((prev) => ({
            ...prev,
            enabled: false,
            feed: [],
            total_today: d.total_today ?? prev.total_today,
            speed_ms: d.speed_ms ?? prev.speed_ms,
            show_toast: d.show_toast !== false,
          }));
        }
      })
      .catch(() => setData((prev) => ({ ...prev, enabled: false, feed: [] })));
  };

  useEffect(() => {
    fetchFeed();
    refreshRef.current = setInterval(fetchFeed, REFRESH_MS);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, []);

  // Toast mode: cycle through feed every 8s, show 4s, skip when tab hidden
  useEffect(() => {
    if (mode !== 'toast' || !data.enabled || !data.show_toast || data.feed.length === 0) return;
    const run = () => {
      if (document.visibilityState !== 'visible') return;
      setToastDismissed(false);
      setToastVisible(true);
      setToastIndex((i) => (i + 1) % data.feed.length);
      if (toastHideRef.current) clearTimeout(toastHideRef.current);
      toastHideRef.current = setTimeout(() => setToastVisible(false), TOAST_VISIBLE_MS);
    };
    run();
    toastCycleRef.current = setInterval(run, TOAST_CYCLE_MS);
    return () => {
      if (toastCycleRef.current) clearInterval(toastCycleRef.current);
      if (toastHideRef.current) clearTimeout(toastHideRef.current);
    };
  }, [mode, data.enabled, data.feed.length, data.show_toast]);

  if (!data.enabled) return null;

  if (mode === 'ticker') {
    const speedSec = Math.max(20, Math.min(60, Math.round(data.speed_ms / 1000)));
    return (
      <div className="w-full bg-[#0a0a0f] border-y border-white/10 py-2 overflow-hidden">
        <div className="flex items-center">
          <span className="flex-shrink-0 px-4 flex items-center gap-2 text-sm font-semibold text-gray-300">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            LIVE ORDERS
          </span>
          <div className="flex-1 overflow-hidden">
            <div
              className="swp-ticker-track"
              style={{ animationDuration: `${speedSec}s` }}
            >
              {[...data.feed, ...data.feed].map((item, i) => (
                <span key={i} className="ticker-item inline-flex items-center gap-2 text-sm text-gray-400">
                  {item.flag ? <span className="ticker-flag">{item.flag}</span> : null}
                  <span className="ticker-text">
                    {item.country ? (
                      <>
                        Someone from <b className="text-white">{item.country}</b> ordered{' '}
                        <span style={{ color: '#22c55e' }}>{item.service}</span>
                      </>
                    ) : (
                      <span style={{ color: '#22c55e' }}>{item.service}</span>
                    )}
                  </span>
                  {item.time_ago ? <span className="ticker-time text-gray-500">{item.time_ago}</span> : null}
                  <span className="ticker-divider text-gray-600 mx-2">•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'toast') {
    const item = data.feed[toastIndex];
    if (!item || !toastVisible || toastDismissed) return null;
    return (
      <div
        className="swp-toast-enter fixed bottom-6 left-6 w-[280px] rounded-xl border border-[rgba(34,197,94,0.25)] bg-[#1a1a2e] p-3 shadow-xl z-[8888]"
        style={{ padding: '12px 16px' }}
      >
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="text-sm text-gray-300">
              {item.flag ? <span>{item.flag} </span> : null}
              {item.country ? <>Someone from {item.country}</> : <span>Live activity</span>}
            </div>
            <div className="text-xs text-gray-500">{item.country ? 'just ordered' : ''}</div>
            <div className="text-sm font-medium mt-1" style={{ color: '#22c55e' }}>
              {item.service}
              {item.country ? ' 🚀' : ''}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">{item.time_ago}</span>
            <button
              type="button"
              onClick={() => { setToastVisible(false); setToastDismissed(true); }}
              className="text-gray-400 hover:text-white p-0.5 leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
