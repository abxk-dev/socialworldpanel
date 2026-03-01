import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const PricingPage = () => {
  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      description: 'Perfect for trying out our services',
      features: [
        { text: 'Access to all services', included: true },
        { text: 'Standard delivery speed', included: true },
        { text: 'Email support', included: true },
        { text: 'API access', included: false },
        { text: 'Priority support', included: false },
        { text: 'Custom rates', included: false },
      ],
      cta: 'Get Started',
      popular: false
    },
    {
      name: 'Pro',
      price: '$50+',
      description: 'For growing influencers and businesses',
      features: [
        { text: 'Access to all services', included: true },
        { text: 'Fast delivery speed', included: true },
        { text: 'Priority email support', included: true },
        { text: 'Full API access', included: true },
        { text: '24/7 live chat support', included: true },
        { text: 'Custom rates', included: false },
      ],
      cta: 'Start Growing',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For agencies and high-volume users',
      features: [
        { text: 'Access to all services', included: true },
        { text: 'Instant delivery speed', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'Full API access', included: true },
        { text: '24/7 priority support', included: true },
        { text: 'Custom rates & discounts', included: true },
      ],
      cta: 'Contact Us',
      popular: false
    },
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
              SIMPLE, TRANSPARENT <span className="neon-text">PRICING</span>
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto">
              No hidden fees. Pay only for what you use. Volume discounts available.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, idx) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className={`glass p-6 h-full flex flex-col relative ${plan.popular ? 'border-electric-blue' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-electric-blue text-black px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Zap size={12} /> MOST POPULAR
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-6 pt-4">
                    <h3 className="text-xl font-exo font-bold text-white mb-2">{plan.name}</h3>
                    <div className="text-4xl font-exo font-black text-electric-blue mb-2">{plan.price}</div>
                    <p className="text-sm text-gray-500">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 flex-1 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        {feature.included ? (
                          <Check size={18} className="text-neon-green" />
                        ) : (
                          <X size={18} className="text-gray-600" />
                        )}
                        <span className={feature.included ? 'text-gray-300' : 'text-gray-600'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/register">
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-electric-blue text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      data-testid={`pricing-${plan.name.toLowerCase()}`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* API Pricing */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-16"
          >
            <h2 className="text-2xl font-exo font-bold text-white text-center mb-8">API Pricing</h2>
            <Card className="glass overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left p-4 text-gray-400 font-medium">Monthly Volume</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Discount</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Benefits</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { volume: '$0 - $100', discount: '0%', benefits: 'Standard rates' },
                    { volume: '$100 - $500', discount: '5%', benefits: 'Priority processing' },
                    { volume: '$500 - $1000', discount: '10%', benefits: 'Priority processing + Dedicated support' },
                    { volume: '$1000+', discount: '15%+', benefits: 'Custom rates + Account manager' },
                  ].map((tier, i) => (
                    <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-4 text-white font-bold">{tier.volume}</td>
                      <td className="p-4 text-neon-green font-bold">{tier.discount}</td>
                      <td className="p-4 text-gray-400">{tier.benefits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;
