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
import axios from 'axios';
import { API } from '../App';

const HomePage = () => {
  const [init, setInit] = useState(false);
  const [stats, setStats] = useState({ total_orders: 125000, total_users: 45000, total_services: 500, orders_today: 1200 });

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));

    // Fetch stats
    axios.get(`${API}/public/stats`).then(res => setStats(res.data)).catch(() => {});
  }, []);

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

  const platforms = [
    { name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
    { name: 'YouTube', icon: Youtube, color: 'text-red-500' },
    { name: 'TikTok', icon: Music, color: 'text-white' },
    { name: 'Twitter', icon: Twitter, color: 'text-sky-400' },
    { name: 'Facebook', icon: Facebook, color: 'text-blue-500' },
    { name: 'Telegram', icon: Send, color: 'text-sky-500' },
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
    <div className="min-h-screen bg-dark-bg overflow-hidden">
      {/* Particles Background */}
      {init && (
        <Particles
          id="tsparticles"
          particlesLoaded={particlesLoaded}
          options={particlesOptions}
          className="absolute inset-0 -z-10"
        />
      )}

      <Navbar />

      {/* Stats Ticker */}
      <div className="bg-deep-navy/80 border-b border-white/5 py-2 overflow-hidden">
        <div className="ticker-wrapper">
          <div className="ticker-content flex gap-16 items-center text-sm">
            {[...Array(2)].map((_, i) => (
              <React.Fragment key={i}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></span>
                  <span className="text-gray-400">Total Orders:</span>
                  <span className="text-electric-blue font-bold">{stats.total_orders.toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-electric-blue rounded-full animate-pulse"></span>
                  <span className="text-gray-400">Active Users:</span>
                  <span className="text-neon-green font-bold">{stats.total_users.toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyber-purple rounded-full animate-pulse"></span>
                  <span className="text-gray-400">Services:</span>
                  <span className="text-cyber-purple font-bold">{stats.total_services}+</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                  <span className="text-gray-400">Orders Today:</span>
                  <span className="text-yellow-400 font-bold">{stats.orders_today.toLocaleString()}</span>
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center px-6 py-20">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-exo font-black mb-6 leading-tight">
              <span className="text-white">GROW YOUR</span>
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
            </h1>
            <p className="text-base lg:text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
              The #1 SMM Panel for instant social media growth. Get real followers, likes, views & more at the cheapest prices.
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
                {stat.value.toLocaleString()}{stat.suffix}
              </div>
              <div className="text-sm text-gray-400">{stat.label}</div>
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
            <p className="text-gray-400 max-w-xl mx-auto">
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
                  <h3 className="text-xl font-exo font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.desc}</p>
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
            <p className="text-gray-400">Get started in 3 simple steps</p>
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
                  <h3 className="text-xl font-exo font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
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
            <p className="text-gray-400">We support all major social media platforms</p>
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
                <span className="text-sm text-gray-400">{platform.name}</span>
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
                      <Star key={i} className="text-yellow-400 fill-yellow-400" size={16} />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-4">"{review.text}"</p>
                  <div className="text-electric-blue font-bold">{review.name}</div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-xl font-exo font-bold mb-8 text-gray-400">ACCEPTED PAYMENT METHODS</h3>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { name: 'Stripe', icon: CreditCard },
              { name: 'Paytm', icon: Wallet },
              { name: 'Crypto', icon: Globe },
            ].map((method) => (
              <div key={method.name} className="glass px-6 py-3 rounded-lg flex items-center gap-2 text-gray-400">
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
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
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

      <Footer />
    </div>
  );
};

export default HomePage;
