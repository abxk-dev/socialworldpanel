import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { TypeAnimation } from 'react-type-animation';
import { 
  Zap, Shield, Clock, Users, Globe, Headphones,
  Instagram, Youtube, Music, Twitter, Facebook, Send,
  ChevronRight, Star, ArrowRight, CreditCard, Wallet
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LiveOrderFeed from '../components/LiveOrderFeed';
import SEO from '../components/SEO';
import HomeSEOContent from '../components/HomeSEOContent';
import api from '../lib/axios';
import { useSettings } from '../App';
import { assetUrl } from '../config';

const DEFAULT_HERO_HEADLINE = 'Best YouTube Watchtime SMM Panel – High Retention Guaranteed';
const DEFAULT_HERO_DESCRIPTION = 'The #1 SMM Panel for instant social media growth. Get real followers, likes, views & more at the cheapest prices.';

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return '255, 90, 70';
  const h = hex.replace(/^#/, '');
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return '255, 90, 70';
}

function CountUpStat({ target, suffix = '', duration = 1500 }) {
  const elRef = React.useRef(null);
  const [display, setDisplay] = React.useState(0);
  const animatedRef = React.useRef(false);
  const numTarget = Math.max(0, parseInt(target, 10) || 0);

  React.useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || animatedRef.current) return;
          animatedRef.current = true;
          const step = numTarget / (duration / 16);
          let current = 0;
          const timer = setInterval(() => {
            current += step;
            if (current >= numTarget) {
              setDisplay(numTarget);
              clearInterval(timer);
            } else {
              setDisplay(Math.floor(current));
            }
          }, 16);
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [numTarget, duration]);

  return (
    <span ref={elRef}>
      {display.toLocaleString()}{suffix}
    </span>
  );
}

const HomePage = () => {
  const { settings } = useSettings();
  const [init, setInit] = useState(false);
  const [stats, setStats] = useState(null);
  const [liveOnline, setLiveOnline] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem('swp_live_online');
      const n = raw ? parseInt(raw, 10) : NaN;
      if (!Number.isNaN(n) && n > 0) return n;
    } catch {
      // ignore storage errors
    }
    // default base range when nothing stored
    return 120 + Math.floor(Math.random() * 80); // 120–199
  });

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));

    // Fetch stats
    api.get('/public/stats')
      .then(res => setStats(res.data))
      .catch(() => setStats({ total_orders: 0, total_users: 0, total_services: 0, orders_today: 0 }));
  }, []);

  useEffect(() => {
    if (!stats?.config?.auto_increment) return;
    const { min, max, interval } = stats.config;
    const intervalMs = (interval || 5) * 1000;

    const timer = setInterval(() => {
      setStats(prev => {
        if (!prev) return prev;
        const inc = Math.floor(Math.random() * (max - min + 1)) + min;
        return {
          ...prev,
          total_orders: prev.total_orders + inc,
          orders_today: prev.orders_today + inc
        };
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [stats?.config]);

  // Gently vary the \"online\" number but keep it stable between refreshes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const baseRaw = localStorage.getItem('swp_live_online');
      const baseVal = baseRaw ? parseInt(baseRaw, 10) : NaN;
      const base = !Number.isNaN(baseVal) && baseVal > 0 ? baseVal : liveOnline;
      // small delta between -10 and +10 on each load
      const delta = Math.floor(Math.random() * 21) - 10;
      const next = Math.max(20, Math.min(800, base + delta));
      setLiveOnline(next);
      localStorage.setItem('swp_live_online', String(next));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const img = document.getElementById("swp-hero-img");
    const wrapper = document.getElementById("swp-hero-wrapper");
    if (!img || !wrapper) return;

    const getGlowRgb = () => wrapper.dataset.heroGlowRgb || '255, 90, 70';
    let isHovering = false;
    let animFrame;

    const cursor = document.createElement("div");
    cursor.className = "swp-cursor";
    document.body.appendChild(cursor);

    const onMouseMove = (e) => {
      cursor.style.left = e.clientX + "px";
      cursor.style.top  = e.clientY + "px";
      if (!isHovering) return;

      const rect = wrapper.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width  / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const tiltX = dy * -18;
      const tiltY = dx *  18;
      const rgb = getGlowRgb();

      cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(() => {
        img.style.animation = "none";
        img.style.transform =
          `perspective(800px) rotateX(${tiltX}deg)
           rotateY(${tiltY}deg) scale(1.04) translateZ(20px)`;
        img.style.filter =
          `drop-shadow(${tiltY * -1}px ${tiltX}px 40px rgba(${rgb},0.55))`;
      });
    };

    const onMouseEnter = () => {
      isHovering = true;
      cursor.classList.add("visible", "hovering");
    };

    const onMouseLeave = () => {
      isHovering = false;
      cursor.classList.remove("hovering");
      const rgb = getGlowRgb();
      img.style.transition =
        "transform 0.7s cubic-bezier(0.23,1,0.32,1), filter 0.6s ease";
      img.style.transform =
        "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)";
      img.style.filter =
        `drop-shadow(0 24px 48px rgba(${rgb},0.35))`;
      setTimeout(() => {
        img.style.animation =
          "swp-float 3.5s ease-in-out infinite, swp-glow 3.5s ease-in-out infinite";
        img.style.transition =
          "transform 0.1s ease-out, filter 0.3s ease";
      }, 700);
    };

    const onBodyLeave = () =>
      cursor.classList.remove("visible");

    wrapper.addEventListener("mouseenter", onMouseEnter);
    wrapper.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mousemove",  onMouseMove);
    document.body.addEventListener("mouseleave", onBodyLeave);

    let lastTX = 0, lastTY = 0;

    const onTouchStart = (e) => {
      lastTX = e.touches[0].clientX;
      lastTY = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      const dx = (e.touches[0].clientX - lastTX) * 0.8;
      const dy = (e.touches[0].clientY - lastTY) * 0.8;
      lastTX = e.touches[0].clientX;
      lastTY = e.touches[0].clientY;

      cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(() => {
        img.style.animation = "none";
        img.style.transform =
          `perspective(600px)
           rotateY(${Math.min(Math.max(dx * 2,-15),15)}deg)
           rotateX(${Math.min(Math.max(dy*-2,-15),15)}deg)
           scale(1.03)`;
      });
    };

    const onTouchEnd = () => {
      img.style.transition =
        "transform 0.8s cubic-bezier(0.23,1,0.32,1)";
      img.style.transform =
        "perspective(600px) rotateX(0) rotateY(0) scale(1)";
      setTimeout(() => {
        img.style.animation =
          "swp-float 3.5s ease-in-out infinite, swp-glow 3.5s ease-in-out infinite";
        img.style.transition = "transform 0.1s ease-out";
      }, 800);
    };

    wrapper.addEventListener("touchstart", onTouchStart);
    wrapper.addEventListener("touchmove",  onTouchMove,
      { passive: true });
    wrapper.addEventListener("touchend",   onTouchEnd);

    let gyroOn = false;

    const onGyro = (e) => {
      if (!e.beta && !e.gamma) return;
      gyroOn = true;
      const tX = Math.min(Math.max(e.beta  * 0.4, -20), 20);
      const tY = Math.min(Math.max(e.gamma * 0.4, -20), 20);
      const rgb = getGlowRgb();
      cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(() => {
        img.style.animation = "none";
        img.style.transform =
          `perspective(600px)
           rotateX(${tX * -1}deg)
           rotateY(${tY}deg) scale(1.02)`;
        img.style.filter =
          `drop-shadow(${tY*-0.5}px ${tX*0.5}px 35px rgba(${rgb},0.45))`;
      });
    };

    const startGyro = () => {
      if (typeof DeviceOrientationEvent !== "undefined"
        && typeof DeviceOrientationEvent.requestPermission
          === "function") {
        DeviceOrientationEvent.requestPermission()
          .then(p => {
            if (p === "granted")
              window.addEventListener("deviceorientation", onGyro);
          }).catch(console.error);
      } else {
        window.addEventListener("deviceorientation", onGyro);
      }
    };

    const onFirstTouch = () => {
      if (!gyroOn) startGyro();
      wrapper.removeEventListener("touchstart", onFirstTouch);
    };
    wrapper.addEventListener("touchstart", onFirstTouch);

    const onScroll = () => {
      if (isHovering || gyroOn) return;
      const p = window.scrollY * 0.07;
      img.style.transform = `translateY(${p}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      wrapper.removeEventListener("mouseenter", onMouseEnter);
      wrapper.removeEventListener("mouseleave", onMouseLeave);
      wrapper.removeEventListener("touchstart", onTouchStart);
      wrapper.removeEventListener("touchmove",  onTouchMove);
      wrapper.removeEventListener("touchend",   onTouchEnd);
      document.removeEventListener("mousemove", onMouseMove);
      document.body.removeEventListener("mouseleave", onBodyLeave);
      window.removeEventListener("deviceorientation", onGyro);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(animFrame);
      if (cursor.parentNode)
        cursor.parentNode.removeChild(cursor);
    };
  }, [stats]);

  const particlesLoaded = useCallback(async container => {}, []);

  const particlesOptions = useMemo(() => ({
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    particles: {
      color: { value: ["#00D4FF", "#8B5CF6", "#00FF88"] },
      links: {
        color: "#00D4FF",
        distance: 150,
        enable: true,
        opacity: 0.2,
        width: 1
      },
      move: {
        enable: true,
        speed: 1,
        direction: "none",
        random: true,
        straight: false,
        outModes: { default: "bounce" }
      },
      number: { density: { enable: true, area: 800 }, value: 60 },
      opacity: { value: { min: 0.1, max: 0.5 } },
      size: { value: { min: 1, max: 3 } }
    },
    detectRetina: true
  }), []);

  if (!stats) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-electric-blue border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const platforms = [
    { name: 'Instagram', icon: Instagram, color: 'text-[var(--accent-secondary)]' },
    { name: 'YouTube', icon: Youtube, color: 'text-[var(--accent)]' },
    { name: 'TikTok', icon: Music, color: 'text-[var(--accent)]' },
    { name: 'Twitter', icon: Twitter, color: 'text-[var(--accent-secondary)]' },
    { name: 'Facebook', icon: Facebook, color: 'text-[var(--accent)]' },
    { name: 'Telegram', icon: Send, color: 'text-[var(--accent-secondary)]' },
  ];

  const features = [
    { icon: Zap, title: 'Instant Delivery', desc: 'Orders start within minutes' },
    { icon: Shield, title: 'Safe & Secure', desc: '100% secure payment methods' },
    { icon: Clock, title: '24/7 Support', desc: 'Round the clock assistance' },
    { icon: Users, title: 'Real Engagement', desc: 'High quality social growth' },
    { icon: Globe, title: 'Global Reach', desc: 'Services for all platforms' },
    { icon: Headphones, title: 'API Access', desc: 'Reseller API available' },
  ];

  const reviews = [
    { name: 'Alex M.', text: 'Amazing service! Got 10k followers overnight. Best SMM panel ever!', rating: 5 },
    { name: 'Sarah K.', text: 'Fast delivery and great prices. My go-to panel for all social media.', rating: 5 },
    { name: 'Mike R.', text: 'Been using for 6 months. Never had any issues. Highly recommend!', rating: 5 },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] overflow-hidden text-[var(--text-primary)] relative isolate">
      <SEO
        page="home"
        title="YouTube Watchtime SMM Panel – Buy 4000 Hours Instantly | SocialWorldPanel"
        description="SocialWorldPanel is the #1 YouTube Watchtime SMM Panel. Buy 4000 hours high retention watchtime, Instagram followers, TikTok likes & more. Instant delivery, cheapest prices, 24/7 support."
      />
      {/* Particles Background */}
      {init && (
        <Particles
          id="tsparticles"
          particlesLoaded={particlesLoaded}
          options={particlesOptions}
          className="absolute inset-0 -z-10 pointer-events-none"
        />
      )}

      <Navbar />

      <div className="pt-navbar">
      {/* Live Stats Bar - Mobile Friendly */}
      <div className="relative bg-gradient-to-r from-electric-blue/5 via-cyber-purple/5 to-neon-green/5 border-b border-[var(--border)]">
        {/* Animated gradient line on top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-electric-blue via-cyber-purple to-neon-green opacity-60"></div>
        
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3 gap-2 overflow-x-auto scrollbar-hide">
            {/* Live Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--error-bg)] rounded-md border border-[var(--error)]/30 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--error)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--error)]"></span>
              </span>
              <span className="text-[var(--error)] text-xs font-bold">LIVE</span>
            </div>

            {/* Stats Container */}
            <div className="flex items-center gap-3 sm:gap-6 md:gap-8">
              {/* Total Orders */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex w-7 h-7 rounded-md bg-electric-blue/20 items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-electric-blue" />
                </div>
                <div className="text-center sm:text-left">
                  <span className="text-electric-blue font-exo font-black text-sm sm:text-base">{Number(stats.total_orders || 0).toLocaleString()}</span>
                  <span className="hidden sm:inline text-[var(--text-muted)] text-xs ml-1">orders</span>
                  <p className="sm:hidden text-[9px] text-[var(--text-muted)] leading-none">ORDERS</p>
                </div>
              </div>

              <span className="text-[var(--text-secondary)]">•</span>

              {/* Active Users */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex w-7 h-7 rounded-md bg-neon-green/20 items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-neon-green" />
                </div>
                <div className="text-center sm:text-left">
                  <span className="text-neon-green font-exo font-black text-sm sm:text-base">{Number(stats.total_users || 0).toLocaleString()}</span>
                  <span className="hidden sm:inline text-[var(--text-muted)] text-xs ml-1">users</span>
                  <p className="sm:hidden text-[9px] text-[var(--text-muted)] leading-none">USERS</p>
                </div>
              </div>

              <span className="text-[var(--text-secondary)]">•</span>

              {/* Services */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex w-7 h-7 rounded-md bg-cyber-purple/20 items-center justify-center">
                  <Globe className="w-3.5 h-3.5 text-cyber-purple" />
                </div>
                <div className="text-center sm:text-left">
                  <span className="text-cyber-purple font-exo font-black text-sm sm:text-base">{stats.total_services}+</span>
                  <span className="hidden sm:inline text-[var(--text-muted)] text-xs ml-1">services</span>
                  <p className="sm:hidden text-[9px] text-[var(--text-muted)] leading-none">SERVICES</p>
                </div>
              </div>

              <span className="text-[var(--text-secondary)] hidden sm:inline">•</span>

              {/* Orders Today */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <div className="w-7 h-7 rounded-md bg-[var(--warning-bg)] flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-[var(--warning)]" />
                </div>
                <div>
                  <span className="text-[var(--warning)] font-exo font-black text-base">{Number(stats.orders_today || 0).toLocaleString()}</span>
                  <span className="text-[var(--text-muted)] text-xs ml-1">today</span>
                </div>
              </div>
            </div>

            {/* Online Users Indicator (randomized but stable) */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-neon-green/10 rounded-md border border-neon-green/30 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
              </span>
              <span className="text-neon-green text-xs font-medium">
                {Number(liveOnline || stats?.online_users || 0).toLocaleString()} online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Order Ticker */}
      <LiveOrderFeed mode="ticker" />

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center px-6 py-20">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-exo font-bold text-[var(--text-primary)] mb-6">
              {settings?.hero_headline?.trim() || DEFAULT_HERO_HEADLINE}
            </h2>
            <div
              className="hero-image-wrapper"
              id="swp-hero-wrapper"
              style={{ ['--hero-glow-rgb']: hexToRgb(settings?.hero_glow_color || '#00d2ff') }}
              data-hero-glow-rgb={hexToRgb(settings?.hero_glow_color || '#00d2ff')}
            >
              <img
                src={settings?.hero_image ? assetUrl(settings.hero_image, settings.hero_image_updated_at) : '/swp-hero.jpg?v=2'}
                alt="SocialWorldPanel"
                className="swp-hero-img"
                id="swp-hero-img"
                onError={(e) => e.target.style.display = "none"}
              />
            </div>
            <h3 className="text-4xl sm:text-5xl lg:text-7xl font-exo font-black mb-6 leading-tight">
              <span className="text-[var(--text-primary)]">GROW YOUR</span>
              <br />
              <TypeAnimation
                sequence={[
                  'SOCIAL EMPIRE',
                  2000,
                  'INSTAGRAM',
                  1500,
                  'YOUTUBE',
                  1500,
                  'TIKTOK',
                  1500,
                  'SOCIAL EMPIRE',
                  2000,
                ]}
                wrapper="span"
                speed={50}
                className="neon-text"
                repeat={Infinity}
              />
            </h3>
            <p className="text-base lg:text-lg text-[var(--text-muted)] mb-8 max-w-2xl mx-auto">
              {settings?.hero_description?.trim() || DEFAULT_HERO_DESCRIPTION}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button 
                  data-testid="hero-get-started-btn"
                  className="btn-skew bg-neon-green hover:bg-neon-green/90 text-black px-8 py-6 text-lg font-bold animate-glow-pulse"
                >
                  <span>GET STARTED FREE</span>
                </Button>
              </Link>
              <Link to="/services">
                <Button 
                  data-testid="hero-view-services-btn"
                  variant="outline" 
                  className="btn-skew border-electric-blue text-electric-blue hover:bg-electric-blue/10 px-8 py-6 text-lg"
                >
                  <span>VIEW SERVICES</span>
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Floating Platform Icons */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {platforms.map((platform, idx) => (
              <motion.div
                key={platform.name}
                className={`absolute ${platform.color}`}
                style={{
                  top: `${20 + (idx * 15) % 60}%`,
                  left: `${(idx * 18) % 80 + 5}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 4 + idx,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <platform.icon size={32 + idx * 4} className="opacity-30" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges Row */}
      <section className="py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { title: 'Instant Delivery', value: 'Instant delivery' },
              { title: '24/7 Support', value: 'Round-the-clock help' },
              { title: '50K+ Customers', value: 'Trusted by creators' },
              { title: 'Best Rates', value: 'Competitive pricing' },
            ].map((b) => (
              <div
                key={b.title}
                className="glass p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]"
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'var(--accent-light)',
                      border: '1px solid var(--accent-border)',
                    }}
                  >
                    <span style={{ color: 'var(--accent)', fontWeight: 900 }}>✓</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-exo font-bold text-[var(--text-primary)] truncate">
                      {b.title}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">{b.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free Trial Section - Public */}
      {settings?.free_trial_show_on_homepage !== false && (
        <section className="py-12 px-6">
          <div className="max-w-4xl mx-auto">
            <div
              className="rounded-2xl border p-8 md:p-10 relative overflow-hidden"
              style={{
                borderColor: 'color-mix(in srgb, var(--success) 35%, transparent)',
                background:
                  'linear-gradient(135deg, color-mix(in srgb, var(--success) 8%, transparent), color-mix(in srgb, var(--success) 3%, transparent))',
              }}
            >
              <div
                className="absolute top-3 right-4 px-3 py-1 rounded-full text-xs font-bold animate-pulse"
                style={{ backgroundColor: 'var(--success)', color: 'var(--text-inverse)' }}
              >
                FREE
              </div>
              <h2 className="text-2xl md:text-3xl font-exo font-bold text-[var(--text-primary)] text-center mb-2">
                🎁 TRY BEFORE YOU BUY
              </h2>
              <p className="text-[var(--text-muted)] text-center mb-6">
                Get your first order completely FREE. No credit card • No risk • Real results
              </p>
              <ul className="space-y-2 mb-8 text-[var(--text-secondary)] text-sm md:text-base max-w-md mx-auto">
                <li className="flex items-center gap-2"><span className="text-neon-green">✅</span> {settings?.free_trial_label || '50 Real YouTube Views'}</li>
                <li className="flex items-center gap-2"><span className="text-neon-green">✅</span> Delivered in 1–6 hours</li>
                <li className="flex items-center gap-2"><span className="text-neon-green">✅</span> Safe for your account</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link to="/register">
                  <Button
                    className="bg-[var(--success)] hover:opacity-90 text-[var(--text-inverse)] font-bold px-8 py-6"
                  >
                    GET FREE TRIAL →
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    variant="outline"
                    className="border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  >
                    Already tried? Sign in →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Orders Completed', value: stats.total_orders, suffix: '+' },
            { label: 'Active Users', value: stats.total_users, suffix: '+' },
            { label: 'Services Available', value: stats.total_services, suffix: '+' },
            { label: 'Orders Today', value: stats.orders_today, suffix: '' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="gradient-border p-6 text-center"
            >
              <div className="text-3xl md:text-4xl font-exo font-black text-electric-blue mb-2">
                <CountUpStat target={stat?.value ?? 0} suffix={stat?.suffix || ''} />
              </div>
              <div className="text-sm text-[var(--text-muted)]">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-exo font-bold mb-4">
              WHY CHOOSE <span className="neon-text">SOCIAL WORLD PANEL</span>?
            </h2>
            <p className="text-[var(--text-muted)] max-w-xl mx-auto">
              We provide the best SMM services with unmatched quality and support
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="glass p-6 h-full hover:border-electric-blue/50 transition-all group">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-electric-blue/20 to-cyber-purple/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="text-electric-blue" size={28} />
                  </div>
                  <h3 className="text-xl font-exo font-bold text-[var(--text-primary)] mb-2">{feature.title}</h3>
                  <p className="text-[var(--text-muted)]">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-deep-navy/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-exo font-bold mb-4">
              HOW IT <span className="neon-text">WORKS</span>
            </h2>
            <p className="text-[var(--text-muted)]">Get started in 3 simple steps</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up for free in seconds' },
              { step: '02', title: 'Add Funds', desc: 'Choose from multiple payment methods' },
              { step: '03', title: 'Place Orders', desc: 'Select service and watch your growth' },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.2 }}
                className="relative"
              >
                <div className="glass p-8 rounded-2xl text-center relative z-10">
                  <div className="text-6xl font-exo font-black text-electric-blue/20 mb-4">{item.step}</div>
                  <h3 className="text-xl font-exo font-bold text-[var(--text-primary)] mb-2">{item.title}</h3>
                  <p className="text-[var(--text-muted)]">{item.desc}</p>
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 z-20">
                    <ChevronRight className="text-electric-blue" size={32} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Table */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-exo font-bold mb-4">
              OUR <span className="neon-text">SERVICES</span>
            </h2>
            <p className="text-[var(--text-muted)] max-w-xl mx-auto">
              Popular watchtime & engagement services for fast, reliable delivery.
            </p>
          </motion.div>

          <div className="glass rounded-2xl p-0 overflow-hidden" style={{ borderColor: 'var(--table-border)' }}>
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ background: 'var(--table-header-bg)', color: 'var(--table-header-text)' }}
            >
              <div className="text-xs font-bold tracking-wider uppercase">Service</div>
              <div className="text-xs font-bold tracking-wider uppercase">Delivery</div>
              <div className="text-xs font-bold tracking-wider uppercase">Best For</div>
            </div>
            <div>
              {[
                { name: 'YouTube Watchtime', delivery: 'Instant starts', for: 'Monetization watch hours' },
                { name: 'Instagram Followers', delivery: 'Fast & steady', for: 'Growth and social proof' },
                { name: 'TikTok Views', delivery: 'High retention', for: 'Viral momentum' },
                { name: 'Twitter Engagement', delivery: 'Reliable delivery', for: 'Visibility & reach' },
              ].map((row) => (
                <div
                  key={row.name}
                  className="px-6 py-4 flex items-center justify-between border-t"
                  style={{
                    borderTopColor: 'var(--table-border)',
                  }}
                >
                  <div className="min-w-0 font-exo font-bold text-[var(--text-primary)]">{row.name}</div>
                  <div className="text-sm text-[var(--text-secondary)] px-3">{row.delivery}</div>
                  <div className="text-sm text-[var(--text-muted)] text-right">{row.for}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Supported Platforms */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-exo font-bold mb-4">
              SUPPORTED <span className="neon-text">PLATFORMS</span>
            </h2>
            <p className="text-[var(--text-muted)]">We support all major social media platforms</p>
          </motion.div>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
            {platforms.map((platform, idx) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="glass p-6 rounded-xl text-center hover:border-electric-blue/50 transition-all cursor-pointer group"
              >
                <platform.icon className={`mx-auto mb-2 ${platform.color} group-hover:scale-125 transition-transform`} size={40} />
                <span className="text-sm text-[var(--text-muted)]">{platform.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-20 px-6 bg-deep-navy/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-exo font-bold mb-4">
              WHAT OUR <span className="neon-text">CUSTOMERS SAY</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map((review, idx) => (
              <motion.div
                key={review.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="glass p-6 h-full">
                  <div className="flex gap-1 mb-4">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="text-[var(--warning)] fill-[var(--warning)]" size={16} />
                    ))}
                  </div>
                  <p className="text-[var(--text-secondary)] mb-4">"{review.text}"</p>
                  <div className="text-electric-blue font-bold">{review.name}</div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-exo font-bold mb-4">
              FREQUENTLY <span className="neon-text">ASKED</span> QUESTIONS
            </h2>
            <p className="text-[var(--text-muted)] max-w-xl mx-auto">Quick answers to common questions.</p>
          </motion.div>

          <FAQAccordion />
        </div>
      </section>

      {/* Payment Methods */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-xl font-exo font-bold mb-8 text-[var(--text-muted)]">ACCEPTED PAYMENT METHODS</h3>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { name: 'Stripe', icon: CreditCard },
              { name: 'Paytm', icon: Wallet },
              { name: 'Crypto', icon: Globe },
            ].map((method) => (
              <div key={method.name} className="glass px-6 py-3 rounded-lg flex items-center gap-2 text-[var(--text-muted)]">
                <method.icon size={20} />
                <span>{method.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="glass-heavy rounded-3xl p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-electric-blue/10 to-cyber-purple/10"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-exo font-bold mb-4">
                READY TO <span className="neon-text">GROW</span>?
              </h2>
              <p className="text-[var(--text-muted)] mb-8 max-w-xl mx-auto">
                Join thousands of satisfied customers and start growing your social media presence today!
              </p>
              <Link to="/register">
                <Button 
                  data-testid="cta-start-now-btn"
                  className="btn-skew bg-neon-green hover:bg-neon-green/90 text-black px-10 py-6 text-lg font-bold animate-glow-pulse"
                >
                  <span className="flex items-center gap-2">
                    START NOW <ArrowRight size={20} />
                  </span>
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live order toast (cycles every 8s) */}
      <LiveOrderFeed mode="toast" />

      {/* SEO content section for on-page optimization */}
      <HomeSEOContent />

      <Footer />
      </div>
    </div>
  );
};

export default HomePage;

// Simple FAQ accordion (kept local to preserve HomePage functionality).
function FAQAccordion() {
  const [openIdx, setOpenIdx] = React.useState(0);
  const items = [
    {
      q: 'How fast do orders start?',
      a: 'Most orders begin within minutes, and delivery time depends on the service selected.',
    },
    {
      q: 'Are services safe for my account?',
      a: 'Yes. We focus on delivery methods that are designed to be safe and consistent.',
    },
    {
      q: 'Can I reorder the same service later?',
      a: 'Yes. Your order history makes it easy to reorder quickly.',
    },
    {
      q: 'Do you offer support?',
      a: 'Absolutely. Our team provides support whenever you need help.',
    },
  ];

  return (
    <div className="grid gap-3">
      {items.map((it, idx) => {
        const open = openIdx === idx;
        return (
          <div
            key={it.q}
            className="glass rounded-2xl overflow-hidden border"
            style={{
              borderColor: open ? 'var(--accent-border)' : 'var(--card-border)',
            }}
          >
            <button
              type="button"
              className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
              style={{ background: open ? 'var(--accent-light)' : 'transparent' }}
              onClick={() => setOpenIdx(open ? -1 : idx)}
            >
              <span className="font-exo font-bold text-[var(--text-primary)]">{it.q}</span>
              <span
                className="shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: open ? 'var(--accent-gradient)' : 'var(--bg-card)',
                  color: open ? 'white' : 'var(--accent)',
                  border: open ? 'none' : '1px solid var(--border)',
                }}
              >
                {open ? '-' : '+'}
              </span>
            </button>
            {open && (
              <div className="px-6 pb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {it.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
