import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Youtube, Twitter, Send, Mail, MapPin, Phone } from 'lucide-react';
import { useSettings } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Footer = () => {
  const { settings } = useSettings();
  return (
    <footer className="bg-deep-navy border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {settings?.panel_logo ? (
                <img
                  src={`${BACKEND_URL}${settings.panel_logo}`}
                  alt={settings.panel_name || 'Logo'}
                  className="h-[50px] w-auto object-contain"
                />
              ) : (
                <>
                  <div className="w-[50px] h-[50px] rounded-lg bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
                    <span className="text-white font-exo font-black text-xl">SW</span>
                  </div>
                  <span className="text-white font-exo font-bold text-lg">
                    Social World<span className="text-electric-blue">Panel</span>
                  </span>
                </>
              )}
            </div>
            <p className="text-gray-400 text-sm mb-4">
              The #1 SMM Panel for instant social media growth. Get real followers, likes, views & more at the cheapest prices.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-electric-blue transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-red-500 transition-colors">
                <Youtube size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-sky-400 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-sky-500 transition-colors">
                <Send size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-exo font-bold mb-4">QUICK LINKS</h3>
            <ul className="space-y-2">
              {[
                { name: 'Services', path: '/services' },
                { name: 'Pricing', path: '/pricing' },
                { name: 'API Documentation', path: '/api-docs' },
                { name: 'Blog', path: '/blog' },
                { name: 'Contact Us', path: '/contact' },
              ].map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path} 
                    className="text-gray-400 hover:text-electric-blue transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-exo font-bold mb-4">LEGAL</h3>
            <ul className="space-y-2">
              {[
                { name: 'Terms of Service', path: '/terms' },
                { name: 'Privacy Policy', path: '/privacy' },
                { name: 'Refund Policy', path: '/terms#refund' },
                { name: 'Cookie Policy', path: '/privacy#cookies' },
              ].map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path} 
                    className="text-gray-400 hover:text-electric-blue transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-exo font-bold mb-4">CONTACT</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <Mail size={16} className="text-electric-blue" />
                support@socialworldpanel.com
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <MapPin size={16} className="text-electric-blue" />
                Global Services
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <Phone size={16} className="text-electric-blue" />
                24/7 Live Chat Support
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Social World Panel. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm">Accepted Payments:</span>
            <div className="flex gap-2">
              <div className="glass px-3 py-1 rounded text-xs text-gray-400">Stripe</div>
              <div className="glass px-3 py-1 rounded text-xs text-gray-400">Paytm</div>
              <div className="glass px-3 py-1 rounded text-xs text-gray-400">Crypto</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
