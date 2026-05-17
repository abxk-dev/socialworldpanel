import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../App';

function whatsappLink(number) {
  if (!number || typeof number !== 'string') return null;
  const digits = number.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}`;
}

const DEFAULT_WHATSAPP_NUMBER = '+917998328000';

const WhatsAppSupportButton = () => {
  const { settings } = useSettings();
  const location = useLocation();

  // Hide on admin and reseller-admin routes
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/reseller-admin')) {
    return null;
  }

  const rawNumber = settings?.whatsapp_support_number || DEFAULT_WHATSAPP_NUMBER;
  const link = whatsappLink(rawNumber);
  if (!link) return null;

  return (
    <>
      {/* Floating round button in bottom-right */}
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[100] flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#20BD5A] hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 focus:ring-offset-deep-navy"
        aria-label="Chat on WhatsApp"
        title="WhatsApp Support"
      >
        <MessageCircle size={28} strokeWidth={2} />
      </a>
    </>
  );
};

export default WhatsAppSupportButton;
