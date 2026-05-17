import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const WHATSAPP_PLACEHOLDER = 'https://wa.me/639XXXXXXXXX?text=Hi!%20Interesado%20ako%20sa%20Social%20World%20Panel';

const TESTIMONIALS = [
  { id: 1, name: 'Mark Reyes', location: 'Cebu City', channel: 'Mark Vlogs PH', niche: 'Lifestyle', avatar: '👨', rating: 5, package: 'Channel Boost Package', result: '4,000 Watch Hours + 1,200 Subscribers', days: 14, quote_tl: '"Hindi ako makapaniwala! 14 days lang, na-monetize na ang channel ko. Legit talaga ang Social World Panel!"', quote_en: '"I got my 4000 watch hours in just 2 weeks. The support team was very helpful throughout the process."', verified: true, date: 'January 2025' },
  { id: 2, name: 'Jasmine Torres', location: 'Manila', channel: 'JazziePlays', niche: 'Gaming', avatar: '👩', rating: 5, package: 'Monetization Starter', result: '4,000 Watch Hours + 1,050 Subscribers', days: 18, quote_tl: '"Grabe! Ang galing ng service. Yung mga subscribers parang organic, hindi mapapansin ng YouTube."', quote_en: '"Very smooth delivery. No issues with my channel. Already earning from AdSense now!"', verified: true, date: 'February 2025' },
  { id: 3, name: 'Carlo Mendoza', location: 'Davao City', channel: 'CarloEats', niche: 'Food', avatar: '👨', rating: 5, package: 'Full Monetization Pro', result: '500K Views + 2,100 Subscribers', days: 21, quote_tl: '"Sa lahat ng nasubukan ko, SWP lang ang pinaka-legit. Sulit ang bawat piso!"', quote_en: '"Professional service with real results. My food channel is now monetized and growing organically."', verified: true, date: 'January 2025' },
  { id: 4, name: 'Ana Santiago', location: 'Quezon City', channel: 'AnaBeautyPH', niche: 'Beauty', avatar: '👩', rating: 5, package: 'Channel Boost Package', result: '4,000 Watch Hours + 1,300 Subscribers', days: 12, quote_tl: '"12 days lang! Sobrang bilis. Recommend ko talaga sa lahat ng gusto mag-monetize."', quote_en: '"Fastest service I have ever tried. Beauty content creators should definitely try this."', verified: true, date: 'March 2025' },
  { id: 5, name: 'Rico Bautista', location: 'Pampanga', channel: 'Rico Tech Tips', niche: 'Technology', avatar: '👨', rating: 5, package: 'Full Monetization Pro', result: '4,000 Watch Hours + 2,500 Subscribers', days: 19, quote_tl: '"Bilang tech reviewer, importante sa akin ang credibility. SWP ay totoo at may garantiya."', quote_en: '"Transparent service with real delivery tracking. My tech channel hit monetization threshold fast."', verified: true, date: 'February 2025' },
  { id: 6, name: 'Maria Dela Cruz', location: 'Iloilo City', channel: 'MariaCooks', niche: 'Food', avatar: '👩', rating: 5, package: 'Monetization Starter', result: '4,200 Watch Hours + 1,100 Subscribers', days: 16, quote_tl: '"Sa Iloilo kami pero nag-order online, madali at mabilis! Salamat SWP!"', quote_en: '"Easy online ordering process. Results came faster than expected. Highly recommended!"', verified: true, date: 'March 2025' },
  { id: 7, name: 'Luis Fernandez', location: 'Cagayan de Oro', channel: 'Luis Travels', niche: 'Lifestyle', avatar: '👨', rating: 5, package: 'Channel Boost Package', result: '4,000 Watch Hours + 1,150 Subscribers', days: 15, quote_tl: '"Travel vlog channel ko na-monetize na. SWP ang naging secret weapon ko!"', quote_en: '"As a travel vlogger, getting monetized was a dream. SWP made it happen in 15 days."', verified: true, date: 'February 2025' },
  { id: 8, name: 'Patricia Gomez', location: 'Bacolod', channel: 'Patricia DIY', niche: 'Lifestyle', avatar: '👩', rating: 5, package: 'Monetization Starter', result: '4,100 Watch Hours + 1,080 Subscribers', days: 17, quote_tl: '"DIY channel ko, mabagal ang growth. After SWP, na-monetize na. Thank you!"', quote_en: '"My DIY channel was stuck. SWP delivery was gradual and looked 100% organic."', verified: true, date: 'March 2025' },
  { id: 9, name: 'Miguel Santos', location: 'Laguna', channel: 'Miguel Motors', niche: 'Technology', avatar: '👨', rating: 5, package: 'Full Monetization Pro', result: '4,500 Watch Hours + 2,200 Subscribers', days: 20, quote_tl: '"Car review channel — SWP delivered as promised. No drop, no problem."', quote_en: '"Automotive content needs credibility. SWP delivered watch hours that stuck."', verified: true, date: 'January 2025' },
  { id: 10, name: 'Elena Ramos', location: 'Baguio', channel: 'Elena Art PH', niche: 'Lifestyle', avatar: '👩', rating: 5, package: 'Channel Boost Package', result: '4,000 Watch Hours + 1,250 Subscribers', days: 13, quote_tl: '"Art channel ko maliit pa. 13 days lang, monetized na. Sobrang happy ako!"', quote_en: '"Small art channel, big results. SWP is the real deal for Filipino creators."', verified: true, date: 'March 2025' },
];

const SCREENSHOTS = [
  { id: 1, type: 'monetization', title: 'YouTube Partner Program — Approved!', creator: 'Mark Reyes · Cebu', description: 'Na-monetize na ang channel ni Mark after 14 days' },
  { id: 2, type: 'monetization', title: 'Monetization Threshold Reached', creator: 'Jasmine Torres · Manila', description: '4,247 Watch Hours · 1,052 Subscribers' },
  { id: 3, type: 'order', title: 'Order Completed — 4000 Watch Hours', creator: 'Carlo Mendoza · Davao', description: 'Order #SWP-2847 · Delivered in 21 days' },
  { id: 4, type: 'analytics', title: 'Channel Analytics — Big Growth Spike', creator: 'Ana Santiago · QC', description: 'Views surged after SWP order' },
  { id: 5, type: 'payment', title: 'First AdSense Payment — ₱4,200', creator: 'Rico Bautista · Pampanga', description: 'First payout after hitting monetization' },
  { id: 6, type: 'monetization', title: 'YouTube Studio — Monetization ON ✅', creator: 'Maria Dela Cruz · Iloilo', description: 'Channel monetization enabled' },
];

const VIDEO_REVIEWS = [
  { id: 1, title: 'Paano Ko Na-Monetize ang Channel Ko in 2 Weeks | SWP Review', creator: 'Mark Reyes Vlogs', location: 'Cebu City', views: '12.4K', duration: '8:24', thumbnail_bg: 'linear-gradient(135deg, #1a0a0a, #2a0a0a)', thumbnail_emoji: '🎬' },
  { id: 2, title: 'Social World Panel Review — Legit Ba? Honest Review 2025', creator: 'JazziePlays', location: 'Manila', views: '8.7K', duration: '6:15', thumbnail_bg: 'linear-gradient(135deg, #0a1a0a, #0a2a0a)', thumbnail_emoji: '✅' },
  { id: 3, title: 'Nagsimula sa 0 Subscribers — Ngayon Monetized Na Ako!', creator: 'CarloEats PH', location: 'Davao City', views: '6.2K', duration: '10:42', thumbnail_bg: 'linear-gradient(135deg, #0a0a1a, #0a0a2a)', thumbnail_emoji: '🍜' },
];

const TESTIMONIAL_FILTERS = ['Lahat', 'Lifestyle', 'Gaming', 'Food', 'Beauty', 'Technology'];
const SCREENSHOT_FILTERS = [
  { id: 'Lahat', type: null },
  { id: 'Monetization Approved', type: 'monetization' },
  { id: 'Order Proof', type: 'order' },
  { id: 'Analytics', type: 'analytics' },
  { id: 'AdSense Payment', type: 'payment' },
];

const RATING_BARS = [
  { stars: 5, pct: 89 },
  { stars: 4, pct: 9 },
  { stars: 3, pct: 2 },
  { stars: 2, pct: 0 },
  { stars: 1, pct: 0 },
];

function ScreenshotMockup({ item, compact }) {
  const isCompact = compact;
  if (item.type === 'monetization') {
    return (
      <div style={{ background: '#0f0f0f', color: '#f5f5f5', fontFamily: 'sans-serif', fontSize: isCompact ? 11 : 13, padding: isCompact ? 12 : 20, borderRadius: isCompact ? 8 : 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #2a2a2a' }}>
          <div style={{ width: 24, height: 24, background: '#FF0033', borderRadius: 4 }} />
          <span style={{ fontWeight: 700, color: '#888' }}>YouTube Studio</span>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Monetization</div>
          <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 8, padding: 12 }}>
            <span style={{ color: '#22c55e' }}>✅</span> Your channel is monetized
            <div style={{ color: '#888', fontSize: isCompact ? 10 : 11 }}>YouTube Partner Program Member</div>
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: '#888', marginBottom: 4 }}>Watch time (last 12 months)</div>
          <div style={{ height: 8, background: '#222', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: '#22c55e', borderRadius: 4 }} />
          </div>
          <span style={{ color: '#22c55e', marginLeft: 8 }}>4,247 hours ✅</span>
        </div>
        <div>
          <div style={{ color: '#888', marginBottom: 4 }}>Subscribers</div>
          <div style={{ height: 8, background: '#222', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: '#22c55e', borderRadius: 4 }} />
          </div>
          <span style={{ color: '#22c55e', marginLeft: 8 }}>1,052 ✅</span>
        </div>
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #222', color: '#666', fontSize: 10 }}>{item.creator}</div>
      </div>
    );
  }
  if (item.type === 'order') {
    return (
      <div style={{ background: '#0a0a0f', color: '#f5f5f5', fontFamily: 'sans-serif', fontSize: isCompact ? 11 : 13, padding: isCompact ? 12 : 20, borderRadius: isCompact ? 8 : 12, border: '1px solid #1e1e2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #2a2a2a' }}>
          <span style={{ color: '#7c3aed', fontWeight: 700 }}>●</span>
          <span style={{ fontWeight: 700 }}>Social World Panel</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 600 }}>Order #SWP-2847</span>
          <span style={{ background: '#22c55e', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>✅ Completed</span>
        </div>
        <div style={{ marginBottom: 6, color: '#888' }}>Service: 4000 Watch Hours</div>
        <div style={{ marginBottom: 6, color: '#888' }}>Quantity: 4,000</div>
        <div style={{ marginBottom: 6, color: '#888' }}>Start Count: 248 hours</div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#888' }}>Current Count</span>
            <span style={{ color: '#22c55e' }}>4,247 hours</span>
          </div>
          <div style={{ height: 8, background: '#222', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #7c3aed, #22c55e)', borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ color: '#888', fontSize: 12 }}>Delivered in: 21 days</div>
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #222', color: '#666', fontSize: 10 }}>{item.creator}</div>
      </div>
    );
  }
  if (item.type === 'analytics') {
    return (
      <div style={{ background: '#0f0f0f', color: '#f5f5f5', fontFamily: 'sans-serif', fontSize: isCompact ? 11 : 13, padding: isCompact ? 12 : 20, borderRadius: isCompact ? 8 : 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #2a2a2a' }}>
          <div style={{ width: 24, height: 24, background: '#FF0033', borderRadius: 4 }} />
          <span style={{ fontWeight: 700, color: '#888' }}>Channel Analytics</span>
        </div>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Views (last 28 days)</div>
        <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          {[40, 45, 42, 50, 55, 48, 52, 58, 62, 70, 85, 95, 88, 92].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, background: i >= 10 ? 'linear-gradient(180deg, #22c55e, #16a34a)' : '#333', borderRadius: 4 }} />
          ))}
        </div>
        <div style={{ marginTop: 8, color: '#22c55e', fontSize: 12 }}>Growth spike after SWP order</div>
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #222', color: '#666', fontSize: 10 }}>{item.creator}</div>
      </div>
    );
  }
  if (item.type === 'payment') {
    return (
      <div style={{ background: 'linear-gradient(145deg, #0a0a14, #0f0f1a)', color: '#f5f5f5', fontFamily: 'sans-serif', fontSize: isCompact ? 11 : 13, padding: isCompact ? 12 : 20, borderRadius: isCompact ? 8 : 12, border: '1px solid #1e2a3a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #2a2a3a' }}>
          <div style={{ width: 24, height: 24, background: '#4285f4', borderRadius: 4 }} />
          <span style={{ fontWeight: 700, color: '#888' }}>Google AdSense</span>
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: '#22c55e', fontWeight: 600 }}>Payment sent ✅</span>
        </div>
        <div style={{ marginBottom: 6 }}>Amount: <strong style={{ color: '#FFD700' }}>₱4,200.00</strong></div>
        <div style={{ marginBottom: 6, color: '#888' }}>Method: Bank Transfer</div>
        <div style={{ marginBottom: 6, color: '#888' }}>Date: February 21, 2025</div>
        <div style={{ marginTop: 12 }}>
          <span style={{ background: '#22c55e', color: 'white', padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>PAID</span>
        </div>
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #222', color: '#666', fontSize: 10 }}>{item.creator}</div>
      </div>
    );
  }
  return null;
}

export default function SocialProofPage() {
  const [activeFilter, setActiveFilter] = useState('Lahat');
  const [screenshotFilter, setScreenshotFilter] = useState('Lahat');
  const [langToggle, setLangToggle] = useState({});
  const [lightboxItem, setLightboxItem] = useState(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [counts, setCounts] = useState({ creators: 0, rating: 0, success: 0, daysHigh: 0 });

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Creators Who Reached Monetization | Social Proof | Social World Panel';
    const style = document.createElement('style');
    style.innerHTML = `@keyframes sp-ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}.sp-ticker-wrap{overflow:hidden;background:linear-gradient(90deg,#00D4FF,#8B5CF6);padding:10px 0}.sp-ticker-inner{display:flex;white-space:nowrap;animation:sp-ticker 25s linear infinite}.sp-ticker-item{padding:0 40px;font-size:13px;font-weight:600;color:#030407;letter-spacing:0.05em}@media (max-width:768px){.sp-hero-title{font-size:36px!important}.sp-proof-grid{grid-template-columns:1fr!important}.sp-screenshots-grid{grid-template-columns:1fr 1fr!important}.sp-video-grid{grid-template-columns:1fr!important}.sp-stats-grid{grid-template-columns:1fr 1fr!important}}`;
    document.head.appendChild(style);
    return () => {
      document.title = prevTitle || 'Social World Panel';
      if (style.parentNode) document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const targets = { creators: 500, rating: 4.9, success: 98, daysHigh: 21 };
    const duration = 1500;
    const steps = 60;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      setCounts({
        creators: Math.floor(targets.creators * progress),
        rating: parseFloat((targets.rating * progress).toFixed(1)),
        success: Math.floor(targets.success * progress),
        daysHigh: Math.floor(targets.daysHigh * progress),
      });
      if (step >= steps) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredTestimonials = activeFilter === 'Lahat'
    ? TESTIMONIALS
    : TESTIMONIALS.filter((t) => t.niche === activeFilter);

  const filteredScreenshots = screenshotFilter === 'Lahat'
    ? SCREENSHOTS
    : SCREENSHOTS.filter((s) => s.type === SCREENSHOT_FILTERS.find((f) => f.id === screenshotFilter)?.type);

  const getLang = (id) => langToggle[id] || 'tl';

  const toggleLang = (id) => setLangToggle((prev) => ({ ...prev, [id]: prev[id] === 'tl' ? 'en' : 'tl' }));

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <Navbar />
      <div className="pt-navbar">
      <main>
        {/* Hero */}
        <section className="relative min-h-[80vh] flex items-center justify-center px-6 py-20 overflow-hidden bg-dark-bg">
          <div className="absolute inset-0 bg-gradient-to-b from-electric-blue/10 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="mb-5">
              <span className="inline-flex items-center gap-1.5 bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-semibold px-3 py-1.5 rounded-full">✓ VERIFIED RESULTS</span>
            </div>
            <h1 className="font-exo font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-5 sp-hero-title">
              Mga Filipino Creator<br />Na Na-Monetize Na
            </h1>
            <p className="text-gray-400 text-lg mb-12">
              Real results mula sa tunay na Filipino creators. Hindi kami nagbebenta ng pangarap — nagde-deliver kami ng resulta.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-12 sp-stats-grid">
              {[
                { icon: '🏆', value: counts.creators + '+', label: 'Creators Served' },
                { icon: '⭐', value: counts.rating + '/5', label: 'Average Rating' },
                { icon: '✅', value: counts.success + '%', label: 'Success Rate' },
                { icon: '📅', value: `7-${counts.daysHigh}`, label: 'Days Avg.' },
              ].map((s, i) => (
                <Card key={i} className="glass border-white/10 p-6 text-center">
                  <span className="text-3xl block mb-2">{s.icon}</span>
                  <span className="font-exo font-bold text-2xl text-electric-blue">{s.value}</span>
                  <div className="text-sm text-gray-400 mt-1">{s.label}</div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Ticker */}
        <div className="sp-ticker-wrap">
          <div className="sp-ticker-inner">
            {['★ VERIFIED RESULTS', '500+ CREATORS', 'LEGIT & SAFE', 'TRUSTED SA PILIPINAS'].flatMap((item) => [item, item]).map((item, i) => (
              <span key={i} className="sp-ticker-item">{item}  ·  </span>
            ))}
          </div>
        </div>

        {/* Rating Bar */}
        <section className="max-w-2xl mx-auto px-6 py-20">
          <Card className="glass border-white/10 p-12 text-center">
            <div className="text-amber-400 text-3xl tracking-widest">★★★★★</div>
            <div className="font-exo font-bold text-3xl text-white mt-2">4.9 out of 5</div>
            <p className="text-gray-400 mt-2">Based on 500+ verified orders</p>
            <div className="mt-8 text-left space-y-3">
              {RATING_BARS.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-10 text-gray-400">{r.stars}★</span>
                  <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="w-9 text-gray-400 text-sm">{r.pct}%</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-10">
            <div className="w-14 h-0.5 bg-electric-blue mx-auto mb-5" />
            <h2 className="font-exo font-extrabold text-3xl sm:text-4xl text-white">Mga Kwento ng mga Creator</h2>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {TESTIMONIAL_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${activeFilter === f ? 'bg-electric-blue text-dark-bg' : 'bg-white/5 border border-white/10 text-gray-400 hover:border-electric-blue/50 hover:text-white'}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6 sp-proof-grid">
            {filteredTestimonials.map((t) => (
              <Card key={t.id} className="glass border-white/10 p-7 hover:border-electric-blue/50 hover:-translate-y-1 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{t.avatar}</span>
                    <div>
                      <div className="font-bold text-white">{t.name}</div>
                      <div className="text-sm text-gray-400">📍 {t.location} · 🎬 {t.channel}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.niche}</div>
                    </div>
                  </div>
                  {t.verified && <span className="inline-flex items-center gap-1 bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-semibold px-2.5 py-1 rounded-full">✓ Verified</span>}
                </div>
                <div className="mb-3 text-amber-400">{'★'.repeat(t.rating)} <span className="text-gray-400 text-sm">· {t.date}</span></div>
                <div className="text-sm text-gray-400 mb-2">Package: {t.package}</div>
                <div className="text-sm text-gray-400 mb-2">Result: {t.result}</div>
                <div className="text-sm text-neon-green mb-4">✅ {t.days} days</div>
                <div className="border-t border-white/10 pt-4 mt-2">
                  <p className="text-gray-300 leading-relaxed mb-3">{getLang(t.id) === 'tl' ? t.quote_tl : t.quote_en}</p>
                  <button type="button" onClick={() => toggleLang(t.id)} className="text-electric-blue text-sm font-medium hover:underline">
                    {getLang(t.id) === 'tl' ? 'Show English ▼' : 'Show Tagalog ▼'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Screenshots */}
        <section id="screenshots" className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-8">
            <div className="w-14 h-0.5 bg-electric-blue mx-auto mb-5" />
            <h2 className="font-exo font-extrabold text-3xl sm:text-4xl text-white">📸 Proof Screenshots / Mga Patunay</h2>
            <p className="text-gray-400 mt-2">Actual results mula sa aming mga customers</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {SCREENSHOT_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${screenshotFilter === f.id ? 'bg-electric-blue text-dark-bg' : 'bg-white/5 border border-white/10 text-gray-400 hover:border-electric-blue/50'}`}
                onClick={() => setScreenshotFilter(f.id)}
              >
                {f.id}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-5 sp-screenshots-grid">
            {filteredScreenshots.map((item) => (
              <Card key={item.id} className="glass border-white/10 overflow-hidden cursor-pointer hover:border-neon-green/50 hover:scale-[1.02] transition-all" onClick={() => setLightboxItem(item)}>
                <div className="p-4">
                  <ScreenshotMockup item={item} compact />
                </div>
                <div className="px-4 py-3 border-t border-white/10 text-sm text-gray-400">{item.title}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* Video Reviews */}
        <section id="videos" className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-10">
            <div className="w-14 h-0.5 bg-electric-blue mx-auto mb-5" />
            <h2 className="font-exo font-extrabold text-3xl sm:text-4xl text-white">🎥 Video Reviews ng mga Creator</h2>
            <p className="text-gray-400 mt-2">Pakinggan ang kwento ng mga nagtagumpay</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 sp-video-grid">
            {VIDEO_REVIEWS.map((v) => (
              <Card key={v.id} className="glass border-white/10 overflow-hidden cursor-pointer hover:border-electric-blue/50 hover:-translate-y-1 transition-all" onClick={() => setVideoModalOpen(true)}>
                <div className="h-44 flex items-center justify-center relative" style={{ background: v.thumbnail_bg }}>
                  <span className="text-6xl">{v.thumbnail_emoji}</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-electric-blue/90 flex items-center justify-center text-xl text-dark-bg">▶</div>
                  </div>
                  <div className="absolute top-3 right-3 bg-black/80 text-white px-2 py-1 rounded text-xs">{v.duration}</div>
                </div>
                <div className="p-4">
                  <div className="font-semibold text-white mb-2 leading-snug">{v.title}</div>
                  <div className="text-sm text-gray-400">{v.creator} · {v.location} · {v.views} views</div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Trust Badges */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: '🔒', label: 'SSL Secured' },
              { icon: '💳', label: 'GCash & Maya Accepted' },
              { icon: '🇵🇭', label: 'Filipino Support' },
              { icon: '⚡', label: 'Fast Delivery' },
              { icon: '🛡️', label: '30-Day Guarantee' },
              { icon: '✅', label: '500+ Served' },
            ].map((b, i) => (
              <Card key={i} className="glass border-white/10 p-6 text-center">
                <div className="text-3xl mb-2">{b.icon}</div>
                <div className="text-sm text-gray-400">{b.label}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* Comparison */}
        <section className="max-w-2xl mx-auto px-6 py-20">
          <div className="text-center mb-10">
            <div className="w-14 h-0.5 bg-electric-blue mx-auto mb-5" />
            <h2 className="font-exo font-extrabold text-3xl sm:text-4xl text-white">Bakit Pipiliin ang Social World Panel?</h2>
          </div>
          <Card className="glass border-white/10 overflow-hidden">
            <div className="grid grid-cols-3 gap-0">
              <div className="p-4 border-b border-white/10 font-bold text-gray-400" />
              <div className="p-4 border-b border-white/10 font-bold text-neon-green text-center">SWP ✅</div>
              <div className="p-4 border-b border-white/10 font-bold text-gray-400 text-center">Iba pang Panel ❌</div>
              {[
                ['Filipino Support', '✅ OO', '❌ WALA'],
                ['Tagalog Communication', '✅ OO', '❌ English Only'],
                ['GCash/Maya Payment', '✅ OO', '❌ Crypto Only'],
                ['Refill Guarantee', '✅ 30-90 Days', '❌ Wala'],
                ['Verified Results', '✅ 500+ Proof', '❌ Walang Proof'],
                ['24/7 WhatsApp Support', '✅ OO', '❌ Ticket Only'],
              ].map((row, i) => (
                <React.Fragment key={i}>
                  <div className="p-3.5 border-b border-white/10 last:border-0 text-gray-300">{row[0]}</div>
                  <div className="p-3.5 border-b border-white/10 last:border-0 text-neon-green text-center">{row[1]}</div>
                  <div className="p-3.5 border-b border-white/10 last:border-0 text-gray-500 text-center">{row[2]}</div>
                </React.Fragment>
              ))}
            </div>
          </Card>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-br from-deep-navy to-cyber-purple/20 border-t border-white/10 py-24 px-6 text-center">
          <h2 className="font-exo font-extrabold text-3xl sm:text-4xl text-white mb-4">Handa Ka Na Ring Maging Monetized?</h2>
          <p className="text-gray-400 mb-10">Sumali sa 500+ Filipino creators na nagtagumpay na.</p>
          <div className="flex flex-wrap gap-4 justify-center mb-6">
            <Button asChild className="bg-electric-blue hover:bg-electric-blue/90 text-black font-bold px-8 py-6 rounded-full">
              <Link to="/register">Simulan Na — Mag-Order</Link>
            </Button>
            <a href={WHATSAPP_PLACEHOLDER} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-8 py-4 rounded-full border-2 border-white/20 text-white font-medium hover:bg-white/10 transition-all">
              💬 WhatsApp Us
            </a>
          </div>
          <p className="text-sm text-gray-500">⚡ Quick setup · 🔒 Secure · ✅ Guaranteed</p>
        </section>
      </main>
      <Footer />

      </div>

      {/* Lightbox */}
      {lightboxItem && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-5" onClick={() => setLightboxItem(null)}>
          <div className="relative glass border border-white/10 rounded-2xl overflow-hidden max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="absolute top-3 right-4 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-electric-blue z-10 text-xl leading-none" onClick={() => setLightboxItem(null)} aria-label="Close">×</button>
            <div className="p-6">
              <ScreenshotMockup item={lightboxItem} compact={false} />
            </div>
            <div className="px-6 py-4 border-t border-white/10 text-gray-400 text-sm">{lightboxItem.title} — {lightboxItem.creator}</div>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-5" onClick={() => setVideoModalOpen(false)}>
          <div className="glass border border-white/10 rounded-2xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-exo font-bold text-xl mb-4">Video review coming soon!</h3>
            <p className="text-gray-400 leading-relaxed mb-6">Follow us on Facebook: @SocialWorldPanel para sa pinakabagong creator stories.</p>
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" className="border-white/20" onClick={() => setVideoModalOpen(false)}>Close</Button>
              <Button asChild className="bg-electric-blue text-black font-bold">
                <a href="https://facebook.com/SocialWorldPanel" target="_blank" rel="noopener noreferrer">Visit Facebook Page</a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
