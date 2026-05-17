import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const WHATSAPP_PLACEHOLDER = 'https://wa.me/639XXXXXXXXX?text=Hi!%20Gusto%20ko%20mag-order%20ng%20YouTube%20Monetization%20Package';

const PACKAGES = [
  {
    name: 'Monetization Starter',
    pricePhp: '₱1,499',
    priceUsd: '$25',
    features: [
      '4,000 Watch Hours',
      '1,000 Subscribers',
      'Safe & Gradual Delivery',
      'Refill Guarantee 30 Days',
      '24/7 Support',
    ],
    perfectFor: 'Bagong creators na gustong ma-monetize',
    featured: false,
  },
  {
    name: 'Channel Boost',
    pricePhp: '₱2,999',
    priceUsd: '$50',
    features: [
      '4,000 Watch Hours',
      '1,000 Subscribers',
      '100,000 Video Views',
      '500 Likes',
      '200 Comments (Custom)',
      'Priority Delivery',
      'Refill Guarantee 60 Days',
    ],
    perfectFor: 'Creators na gusto ng full channel growth',
    featured: true,
  },
  {
    name: 'Full Monetization Pro',
    pricePhp: '₱4,999',
    priceUsd: '$85',
    features: [
      'Everything in Package 2',
      '500,000 Views (spread across videos)',
      '2,000 Subscribers',
      '1,000 Likes',
      'Dedicated Account Manager',
      'Refill Guarantee 90 Days',
      'Monthly Progress Report',
    ],
    perfectFor: 'Serious creators at businesses',
    featured: false,
  },
];

const FAQS = [
  {
    q: 'Ligtas ba ito para sa aking channel?',
    a: 'Oo! Gumagamit kami ng safe at gradual delivery methods na hindi nagvi-violate ng YouTube Terms of Service. Libo-libo nang channels ang na-serve namin nang walang problema.',
  },
  {
    q: 'Gaano katagal bago makita ang results?',
    a: 'Karaniwang 7 hanggang 21 araw depende sa package. Guaranteed delivery within the timeframe or we refill free.',
  },
  {
    q: 'Kailangan ko bang ibigay ang password ng channel ko?',
    a: 'Hindi! Kailangan lang ng YouTube channel/video URL mo. Wala kaming access sa iyong account.',
  },
  {
    q: 'Anong payment methods ang tinatanggap?',
    a: 'GCash, Maya, Credit/Debit Card, Bank Transfer (BDO, BPI), at Crypto (USDT). Lahat ng popular na paraan sa Pilipinas.',
  },
  {
    q: 'May refund ba kung hindi magtrabaho?',
    a: 'Oo! May 30-day refill guarantee kami. Kung mag-drop ang count, libre naming ie-refill. Money-back kung hindi ma-deliver ang order.',
  },
  {
    q: 'Puwede bang mag-order para sa maraming videos?',
    a: 'Oo! Makipag-ugnayan sa amin sa WhatsApp para sa custom bulk packages.',
  },
];

const TESTIMONIALS = [
  {
    stars: 5,
    text: 'Nakuha ko na ang monetization ko after 2 weeks! Hindi ako naniniwala na magiging ganito kabilis.',
    author: 'Mark R., Lifestyle Vlogger, Cebu',
  },
  {
    stars: 5,
    text: 'Legit talaga! Ang daming nagtatanong sa akin kung paano ko na-achieve ang monetization so fast.',
    author: 'Jasmine T., Gaming Content Creator, Manila',
  },
  {
    stars: 5,
    text: 'Sulit ang bawat piso. From 200 subs to 1000+ in 3 weeks. Salamat Social World Panel!',
    author: 'Carlo M., Food Vlogger, Davao',
  },
];

const TICKER_ITEMS = [
  '4000 Watch Hours',
  '1000 Subscribers',
  'Mabilis na Results',
  'Safe at Legit',
  'Filipino Support',
  '500+ Creators',
];

function useCountUp(end, duration = 1500) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const numEnd = typeof end === 'number' ? end : parseInt(String(end).replace(/\D/g, ''), 10) || 0;

    const tick = (now) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - (1 - progress) ** 2;
      const current = Math.round(easeOut * numEnd);
      setValue(current);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration]);

  return value;
}

export default function YouTubeMonetizationPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const stat1 = useCountUp(500);
  const stat2 = useCountUp(4000);
  const stat3Second = useCountUp(21, 1500);
  const stat3 = `7-${stat3Second}`;

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'YouTube Monetization Philippines | Get 4000 Watch Hours | Social World Panel';
    const setMeta = (name, content, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
      el.setAttribute(attr, name);
      el.setAttribute('content', content);
    };
    setMeta('description', 'I-monetize ang YouTube channel mo! Get 4000 Watch Hours at 1000 Subscribers para sa YouTube Partner Program. Trusted by 500+ Filipino creators. Safe, fast, guaranteed.');
    setMeta('keywords', 'youtube monetization philippines, 4000 watch hours, 1000 subscribers, youtube partner program, smm panel philippines, paano mag monetize ng youtube');
    setMeta('og:title', 'YouTube Monetization Service Philippines | Social World Panel', true);
    setMeta('og:description', 'Get 4000 Watch Hours & 1000 Subscribers faster. Trusted by Filipino creators.', true);
    const style = document.createElement('style');
    style.innerHTML = `@keyframes yt-floatUp{0%{opacity:0;transform:translateY(30px)}100%{opacity:1;transform:translateY(0)}}@keyframes yt-ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}.yt-ticker-wrap{overflow:hidden;background:linear-gradient(90deg,#00D4FF,#8B5CF6);padding:10px 0}.yt-ticker-inner{display:flex;white-space:nowrap;animation:yt-ticker 20s linear infinite}.yt-ticker-item{padding:0 40px;font-size:13px;font-weight:600;color:#030407;letter-spacing:0.05em;text-transform:uppercase}@media (max-width:768px){.yt-hero-title{font-size:38px!important}.yt-packages-grid{grid-template-columns:1fr!important}.yt-stats-grid{grid-template-columns:1fr 1fr!important}.yt-steps-grid{grid-template-columns:1fr!important}.yt-testimonials-grid{grid-template-columns:1fr!important}.yt-faq-grid{grid-template-columns:1fr!important}}`;
    document.head.appendChild(style);
    return () => {
      document.title = prevTitle || 'Social World Panel';
      if (style.parentNode) document.head.removeChild(style);
    };
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <Navbar />
      <div className="pt-navbar">
      <main>
        {/* Hero */}
        <section className="relative min-h-[85vh] flex items-center justify-center px-6 py-20 overflow-hidden bg-dark-bg">
          <div className="absolute inset-0 bg-gradient-to-b from-electric-blue/10 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="mb-5 animate-[yt-floatUp_0.6s_ease_both]">
              <span className="inline-block bg-electric-blue/20 text-electric-blue border border-electric-blue/40 px-5 py-2 rounded-full text-sm font-semibold">🇵🇭 Para sa mga Filipino Creator</span>
            </div>
            <h1 className="font-exo font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-6 animate-[yt-floatUp_0.6s_ease_0.1s_both] yt-hero-title">
              I-Monetize ang<br />YouTube Mo<br />Ngayon Na
            </h1>
            <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10 animate-[yt-floatUp_0.6s_ease_0.2s_both]">
              Get your 4,000 Watch Hours & 1,000 Subscribers para maabot ang YouTube Partner Program — Faster than doing it alone.
            </p>
            <div className="flex flex-wrap gap-4 justify-center mb-12 animate-[yt-floatUp_0.6s_ease_0.3s_both]">
              <Button asChild className="bg-electric-blue hover:bg-electric-blue/90 text-black font-bold px-8 py-6 rounded-full text-base">
                <Link to="#packages" onClick={(e) => { e.preventDefault(); scrollTo('packages'); }}>Tingnan ang mga Package</Link>
              </Button>
              <a href={WHATSAPP_PLACEHOLDER} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-8 py-4 rounded-full border-2 border-[#25D366] text-[#25D366] font-semibold hover:bg-[#25D366] hover:text-white transition-all">
                💬 Kausapin kami sa WhatsApp
              </a>
            </div>
            <div className="flex flex-wrap gap-6 justify-center text-sm text-gray-400 animate-[yt-floatUp_0.6s_ease_0.4s_both]">
              <span>✅ 500+ Filipino Creators Served</span>
              <span>🔒 Safe & Secure</span>
              <span>⚡ Results in 7-21 Days</span>
            </div>
          </div>
        </section>

        {/* Ticker */}
        <div className="yt-ticker-wrap">
          <div className="yt-ticker-inner">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="yt-ticker-item">★ {item}  ·  </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 yt-stats-grid">
            {[
              { value: stat1, label: 'Filipino Creators Served', sub: 'Delivered' },
              { value: stat2.toLocaleString(), label: 'Watch Hours', sub: 'Per Package' },
              { value: stat3, label: 'Days', sub: 'Average Delivery' },
              { value: '24/7', label: 'Support', sub: 'Available' },
            ].map((s, i) => (
              <Card key={i} className="glass border-white/10 p-8 text-center hover:border-electric-blue/50 transition-all">
                <div className="font-exo font-bold text-4xl text-electric-blue mb-2">{s.value}</div>
                <div className="text-lg font-semibold text-white">{s.label}</div>
                <div className="text-sm text-gray-400">{s.sub}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* Packages */}
        <section id="packages" className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <div className="w-14 h-0.5 bg-electric-blue mx-auto mb-5" />
            <h2 className="font-exo font-extrabold text-3xl sm:text-4xl text-white mb-2">Pumili ng Package</h2>
            <p className="text-gray-400">Choose Your Growth Package</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 yt-packages-grid">
            {PACKAGES.map((pkg, i) => (
              <Card
                key={i}
                className={`glass border-white/10 p-8 relative transition-all hover:border-electric-blue/50 hover:-translate-y-2 ${pkg.featured ? 'border-electric-blue/50 ring-1 ring-electric-blue/20' : ''}`}
              >
                {pkg.featured && (
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-electric-blue text-dark-bg rounded-full px-4 py-1 text-xs font-bold uppercase">PINAKA-POPULAR</div>
                )}
                <h3 className="font-exo font-bold text-xl text-white mt-0 mb-4">{pkg.name}</h3>
                <div className="mb-6">
                  <span className="font-exo font-bold text-3xl text-electric-blue">{pkg.pricePhp}</span>
                  <span className="text-sm text-gray-400 ml-2">(≈ {pkg.priceUsd} USD)</span>
                </div>
                <div className="border-t border-white/10 pt-6 mb-6 space-y-3">
                  {pkg.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2 text-gray-300">
                      <span className="text-neon-green">✅</span> {f}
                    </div>
                  ))}
                </div>
                <p className="text-gray-400 text-sm italic mb-6">Perfect for: &quot;{pkg.perfectFor}&quot;</p>
                <div className="flex flex-col gap-3">
                  <Button asChild className="w-full bg-electric-blue hover:bg-electric-blue/90 text-black font-bold py-6 rounded-full">
                    <Link to="/register">Mag-Order Na{pkg.featured ? ' →' : ''}</Link>
                  </Button>
                  <a href={WHATSAPP_PLACEHOLDER} target="_blank" rel="noopener noreferrer" className="text-center py-3 rounded-full border border-[#25D366] text-[#25D366] font-medium hover:bg-[#25D366]/10 transition-colors">💬 WhatsApp</a>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section id="paano" className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <div className="w-14 h-0.5 bg-electric-blue mx-auto mb-5" />
            <h2 className="font-exo font-extrabold text-3xl sm:text-4xl text-white mb-2">Paano Ito Gumagana?</h2>
            <p className="text-gray-400">How It Works</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 yt-steps-grid">
            {[
              { num: '01', icon: '📋', title: 'Pumili ng Package', desc: 'Choose your package that fits your goals' },
              { num: '02', icon: '💳', title: 'Mag-Order at Bayad', desc: 'Register, order, and pay securely online' },
              { num: '03', icon: '📈', title: 'Panoorin ang Growth', desc: 'Watch your watch hours, subs, and views grow!' },
            ].map((step, i) => (
              <Card key={i} className="glass border-white/10 p-8 relative hover:border-white/20 hover:-translate-y-1 transition-all">
                <div className="absolute top-5 right-6 font-exo text-6xl font-extrabold text-electric-blue/10">{step.num}</div>
                <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="font-exo font-bold text-lg text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed">{step.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <div className="w-14 h-0.5 bg-electric-blue mx-auto mb-5" />
            <h2 className="font-exo font-extrabold text-3xl sm:text-4xl text-white">Ano ang Sabi ng mga Filipino Creators?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 yt-testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <Card key={i} className="glass border-white/10 p-6 hover:border-electric-blue/50 hover:-translate-y-1 transition-all">
                <div className="text-amber-400 text-lg mb-4">{'★'.repeat(t.stars)}</div>
                <p className="text-gray-300 leading-relaxed mb-4">&quot;{t.text}&quot;</p>
                <p className="text-gray-500 text-sm">— {t.author}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-2xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <div className="w-14 h-0.5 bg-electric-blue mx-auto mb-5" />
            <h2 className="font-exo font-extrabold text-3xl sm:text-4xl text-white mb-2">Mga Tanong</h2>
            <p className="text-gray-400">Frequently Asked Questions</p>
          </div>
          <div className="space-y-0 yt-faq-grid">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="border-b border-white/10 py-6 cursor-pointer hover:border-electric-blue/30 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white">{faq.q}</span>
                  <span className={`text-electric-blue text-xl transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                </div>
                {openFaq === i && (
                  <p className="mt-4 text-gray-400 leading-relaxed animate-[yt-floatUp_0.3s_ease]">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Guarantee */}
        <section className="max-w-4xl mx-auto px-6 py-24">
          <div className="text-center mb-10">
            <div className="w-14 h-0.5 bg-electric-blue mx-auto mb-5" />
            <h2 className="font-exo font-bold text-2xl text-white mb-8">🛡️ 30-Day Refill Guarantee</h2>
            <div className="glass border border-neon-green/30 rounded-2xl p-8 flex items-center gap-4 max-w-lg mx-auto text-left">
              <span className="text-4xl">🛡️</span>
              <p className="text-gray-300 leading-relaxed m-0">
                Kung mag-drop ang iyong watch hours o subscribers within 30 days, libreng ie-refill namin — walang tanong.
              </p>
            </div>
            <div className="flex flex-wrap gap-8 justify-center mt-12 text-gray-400">
              <span>🔒 SSL Secured</span>
              <span>💳 Secure Payment</span>
              <span>🇵🇭 Filipino Support</span>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-br from-deep-navy to-cyber-purple/20 border-t border-white/10 py-24 px-6 text-center">
          <h2 className="font-exo font-extrabold text-3xl sm:text-4xl text-white mb-4">Handa Ka Na Bang I-Monetize ang Channel Mo?</h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-10">
            Sumali sa 500+ Filipino creators na nagtagumpay sa tulong ng Social World Panel.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mb-6">
            <Button asChild className="bg-electric-blue hover:bg-electric-blue/90 text-black font-bold px-8 py-6 rounded-full">
              <Link to="/register">Simulan Na — Mag-Order Ngayon</Link>
            </Button>
            <a href={WHATSAPP_PLACEHOLDER} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-8 py-4 rounded-full border-2 border-[#25D366] text-[#25D366] font-semibold hover:bg-[#25D366] hover:text-white transition-all">
              💬 WhatsApp
            </a>
          </div>
          <p className="text-sm text-gray-500">⚡ Mabilis na setup · 🔒 Secure · ✅ Guaranteed Results</p>
        </section>
      </main>
      <Footer />
      </div>
    </div>
  );
}
