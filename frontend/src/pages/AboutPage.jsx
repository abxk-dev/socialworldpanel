import React from 'react';
import { motion } from 'framer-motion';
import { Users, Target, Award, Globe } from 'lucide-react';
import { Card } from '../components/ui/card';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const AboutPage = () => {
  const stats = [
    { value: '45,000+', label: 'Active Users' },
    { value: '125,000+', label: 'Orders Completed' },
    { value: '500+', label: 'Services' },
    { value: '24/7', label: 'Support' },
  ];

  const values = [
    { icon: Users, title: 'Customer First', desc: 'We prioritize our customers satisfaction above everything else.' },
    { icon: Target, title: 'Quality Focus', desc: 'We deliver only high-quality services that provide real results.' },
    { icon: Award, title: 'Reliability', desc: 'Consistent and dependable service you can trust.' },
    { icon: Globe, title: 'Global Reach', desc: 'Serving customers worldwide with localized support.' },
  ];

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />

      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-exo font-bold mb-4">
              ABOUT <span className="neon-text">SOCIAL WORLD PANEL</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              We're on a mission to help individuals and businesses grow their social media presence with affordable, reliable, and high-quality SMM services.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="gradient-border p-6 text-center"
              >
                <div className="text-3xl font-exo font-black text-electric-blue mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Story */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-16"
          >
            <Card className="glass p-8 md:p-12">
              <h2 className="text-2xl font-exo font-bold text-white mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  Social World Panel was founded with a simple goal: to make social media growth accessible to everyone. We understand that building a strong social media presence takes time and resources that not everyone has.
                </p>
                <p>
                  That's why we've built a platform that offers high-quality SMM services at affordable prices. Whether you're an influencer looking to grow your following, a business wanting to increase brand awareness, or an agency managing multiple clients – we have the services you need.
                </p>
                <p>
                  Our team is dedicated to providing exceptional customer service and ensuring that every order is processed quickly and efficiently. We're constantly updating our services to stay ahead of the latest social media trends and algorithm changes.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Values */}
          <div>
            <h2 className="text-2xl font-exo font-bold text-white text-center mb-8">Our Values</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, idx) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                >
                  <Card className="glass p-6 text-center h-full">
                    <div className="w-14 h-14 rounded-xl bg-electric-blue/10 flex items-center justify-center mx-auto mb-4">
                      <value.icon className="text-electric-blue" size={28} />
                    </div>
                    <h3 className="font-exo font-bold text-white mb-2">{value.title}</h3>
                    <p className="text-gray-400 text-sm">{value.desc}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
