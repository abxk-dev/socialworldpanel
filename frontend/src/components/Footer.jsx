import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Youtube, Twitter, Send, Mail, MapPin, Phone, MessageCircle } from 'lucide-react';
import { useSettings } from '../App';
import { useReseller } from '../context/ResellerContext';
import { useTheme } from '../context/ThemeContext';

import { assetUrl } from '../config';

/** Build WhatsApp wa.me link from number (digits only). */
function whatsappLink(number) {
  if (!number || typeof number !== 'string') return null;
  const digits = number.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}`;
}

const Footer = () => {
  const { settings } = useSettings();
  const { isReseller, config: resellerConfig } = useReseller();
  const { isLight } = useTheme();
  const [logoError, setLogoError] = React.useState(false);
  const showResellerFooter = isReseller && resellerConfig?.brand?.hide_powered_by && resellerConfig?.brand?.footer_text;

  const resolvedLogo =
    isLight && settings?.panel_logo_light ? settings.panel_logo_light : settings?.panel_logo;
  const resolvedLogoUpdatedAt =
    isLight && settings?.panel_logo_light ? settings.panel_logo_light_updated_at : settings?.panel_logo_updated_at;

  React.useEffect(() => {
    setLogoError(false);
  }, [resolvedLogo]);

  return (
    <footer className="bg-deep-navy border-t border-white/5 pb-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {showResellerFooter ? (
          <p className="text-gray-400 text-center text-sm">{resellerConfig.brand.footer_text}</p>
        ) : (
        <>
        <div className="footer-grid grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {resolvedLogo && !logoError ? (
                <img
                  src={assetUrl(resolvedLogo, resolvedLogoUpdatedAt)}
                  alt={settings.panel_name || 'Logo'}
                  className="h-[50px] w-auto object-contain"
                  onError={() => setLogoError(true)}
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
              <a href="#" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-electric-blue transition-colors" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="#" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors" aria-label="YouTube">
                <Youtube size={20} />
              </a>
              <a href="#" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-sky-400 transition-colors" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-sky-500 transition-colors" aria-label="Telegram">
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
                { name: 'Terms & Conditions', path: '/terms' },
                { name: 'API Documentation', path: '/api-docs' },
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

          {/* Blogs */}
          <div>
            <h3 className="text-white font-exo font-bold mb-4">BLOGS</h3>
            <ul className="space-y-2">
              {[
                { name: 'Blog', path: '/blog' },
                { name: 'YT Monetization', path: '/youtube-monetization' },
                { name: 'Social Proof', path: '/proof' },
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
                { name: 'Terms & Conditions', path: '/terms' },
                { name: 'Privacy Policy', path: '/privacy' },
                { name: 'Refund Policy', path: '/terms#section-5' },
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
              {whatsappLink(settings?.whatsapp_support_number) && (
                <li>
                  <a
                    href={whatsappLink(settings.whatsapp_support_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-[var(--success)] transition-colors text-sm"
                    aria-label="Chat on WhatsApp"
                  >
                    <MessageCircle size={18} className="text-[var(--success)]" />
                    WhatsApp Support
                  </a>
                </li>
              )}
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
        {settings?.custom_footer_html && (
          <div
            className="mt-6 w-full text-xs text-gray-400"
            dangerouslySetInnerHTML={{ __html: settings.custom_footer_html }}
          />
        )}
        </>
        )}
      </div>
    </footer>
  );
};

export default Footer;
