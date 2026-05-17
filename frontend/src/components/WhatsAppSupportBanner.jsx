import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useSettings } from '../App';

function whatsappLink(number) {
  if (!number || typeof number !== 'string') return null;
  const digits = number.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}`;
}

const DEFAULT_WHATSAPP_NUMBER = '+917998328000';

const WhatsAppSupportBanner = () => {
  const { settings } = useSettings();
  const rawNumber = settings?.whatsapp_support_number || DEFAULT_WHATSAPP_NUMBER;
  const link = whatsappLink(rawNumber);
  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full flex-shrink-0 flex items-center justify-between gap-3 rounded-xl bg-emerald-900/90 border border-emerald-500/50 px-4 py-3 text-xs sm:text-sm text-emerald-50 shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/90">
          <MessageCircle size={18} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold">Need help? Chat with us on WhatsApp</span>
          <span className="text-[11px] sm:text-xs text-emerald-100/80">
            Support: {rawNumber}
          </span>
        </div>
      </div>
      <span className="hidden sm:inline text-[11px] text-emerald-100/70">
        We usually reply within a few minutes.
      </span>
    </a>
  );
};

export default WhatsAppSupportBanner;

