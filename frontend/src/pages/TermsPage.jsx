import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowUp, Printer } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const sections = [
  { id: 'section-1', title: 'SECTION 1: ACCEPTANCE OF TERMS' },
  { id: 'section-2', title: 'SECTION 2: ACCOUNT REGISTRATION & SECURITY' },
  { id: 'section-3', title: 'SECTION 3: SERVICES' },
  { id: 'section-4', title: 'SECTION 4: ORDERS & PAYMENTS' },
  { id: 'section-5', title: 'SECTION 5: REFUND POLICY' },
  { id: 'section-6', title: 'SECTION 6: WALLET & BALANCE' },
  { id: 'section-7', title: 'SECTION 7: RESELLER PROGRAM' },
  { id: 'section-8', title: 'SECTION 8: PROHIBITED ACTIVITIES' },
  { id: 'section-9', title: 'SECTION 9: INTELLECTUAL PROPERTY' },
  { id: 'section-10', title: 'SECTION 10: PRIVACY POLICY' },
  { id: 'section-11', title: 'SECTION 11: LIMITATION OF LIABILITY' },
  { id: 'section-12', title: 'SECTION 12: INDEMNIFICATION' },
  { id: 'section-13', title: 'SECTION 13: THIRD-PARTY SERVICES & LINKS' },
  { id: 'section-14', title: 'SECTION 14: SERVICE INTERRUPTIONS & MAINTENANCE' },
  { id: 'section-15', title: 'SECTION 15: ACCOUNT TERMINATION' },
  { id: 'section-16', title: 'SECTION 16: DISPUTE RESOLUTION' },
  { id: 'section-17', title: 'SECTION 17: CONTACT INFORMATION' },
];

const TermsPage = () => {
  const [activeId, setActiveId] = useState('section-1');
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-40% 0px -55% 0px',
        threshold: 0,
      }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleScrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const sectionOptions = useMemo(
    () => sections.map((s) => ({ value: s.id, label: s.title.replace('SECTION ', '') })),
    []
  );

  return (
    <div className="min-h-screen bg-dark-bg print:bg-white print:text-black">
      <Navbar />

      <div className="pt-navbar">
      <main className="px-4 md:px-6 lg:px-8 py-10 md:py-16 print:px-8 print:py-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-10">
          {/* Sidebar – hidden on print */}
          <aside className="lg:w-64 shrink-0 lg:sticky lg:top-24 self-start hidden lg:block print:hidden">
            <div className="glass border-white/10 rounded-xl p-4 space-y-3">
              <h2 className="text-xs font-semibold text-gray-400 tracking-[0.2em]">
                TERMS INDEX
              </h2>
              <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
                {sections.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleScrollTo(s.id)}
                    className={`w-full text-left text-xs rounded-lg px-3 py-2 flex items-center gap-2 transition-colors ${
                      activeId === s.id
                        ? 'bg-electric-blue/10 text-electric-blue border border-electric-blue/40'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className="font-mono text-[10px] text-gray-500">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate">{s.title.replace('SECTION ', '')}</span>
                    {activeId === s.id && <ChevronRight size={14} className="ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Content */}
          <section className="flex-1 min-w-0">
            <motion.header
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 print:flex-row print:items-center print:justify-between"
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-exo font-bold text-white print:text-black">
                  Terms &amp; Conditions
                </h1>
                <p className="text-sm text-gray-400 mt-1 print:text-gray-700">
                  SocialWorldPanel &bull; Last Updated: <span className="font-semibold">March 2026</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Mobile jump dropdown */}
                <div className="lg:hidden">
                  <label className="sr-only" htmlFor="section-jump">
                    Jump to section
                  </label>
                  <select
                    id="section-jump"
                    className="bg-deep-navy border border-white/15 rounded-lg px-3 py-2 text-xs text-gray-200 print:hidden"
                    value={activeId}
                    onChange={(e) => handleScrollTo(e.target.value)}
                  >
                    {sectionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/10 print:hidden"
                >
                  <Printer size={14} />
                  Print / Download PDF
                </button>
              </div>
            </motion.header>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass border-white/10 rounded-2xl p-5 md:p-7 lg:p-8 space-y-8 print:border-0 print:p-0 print:bg-transparent"
            >
              {/* Intro */}
              <section id="section-0" className="space-y-3">
                <p className="text-xs font-mono tracking-[0.2em] text-electric-blue uppercase">
                  TERMS AND CONDITIONS
                </p>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Welcome to SocialWorldPanel. By accessing or using our platform, you agree to be bound by
                  these Terms and Conditions. Please read them carefully before using our services.
                </p>
              </section>

              {/* SECTION 1 */}
              <section id="section-1" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 1: ACCEPTANCE OF TERMS
                </h2>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>1.1 You have read, understood, and agree to these Terms and Conditions in full.</li>
                  <li>
                    1.2 You are at least 18 years of age or have the legal capacity to enter into a binding
                    agreement in your jurisdiction.
                  </li>
                  <li>
                    1.3 You agree to comply with all applicable local, national, and international laws and
                    regulations while using our platform.
                  </li>
                  <li>
                    1.4 If you do not agree to any part of these terms, you must immediately discontinue use
                    of the platform.
                  </li>
                  <li>
                    1.5 We reserve the right to update or modify these Terms at any time without prior
                    notice. Continued use of the platform after changes constitutes your acceptance of the
                    revised Terms.
                  </li>
                </ul>
              </section>

              {/* SECTION 2 */}
              <section id="section-2" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 2: ACCOUNT REGISTRATION &amp; SECURITY
                </h2>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    2.1 You must provide accurate, current, and complete information during registration.
                    False or misleading information will result in immediate account termination.
                  </li>
                  <li>
                    2.2 You are solely responsible for maintaining the confidentiality of your account
                    credentials (username, password, API keys).
                  </li>
                  <li>
                    2.3 You must notify us immediately at support@socialworldpanel.com if you suspect any
                    unauthorized access to your account.
                  </li>
                  <li>
                    2.4 SocialWorldPanel is not liable for any loss or damage arising from unauthorized
                    access to your account due to your failure to keep credentials secure.
                  </li>
                  <li>
                    2.5 One person or entity may only maintain one account. Multiple accounts created to
                    abuse promotions, bonuses, or services will result in permanent bans of all associated
                    accounts.
                  </li>
                  <li>2.6 Account sharing is strictly prohibited. Your account is personal and non-transferable.</li>
                </ul>
              </section>

              {/* SECTION 3 */}
              <section id="section-3" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 3: SERVICES
                </h2>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    3.1 SocialWorldPanel provides social media marketing services including but not limited
                    to: followers, likes, views, comments, shares, and other engagement services across
                    various social media platforms ("Services").
                  </li>
                  <li>
                    3.2 All services are delivered digitally. We do not guarantee specific delivery times
                    unless explicitly stated on the service listing.
                  </li>
                  <li>
                    3.3 Service availability is subject to change without notice. We reserve the right to
                    modify, suspend, or discontinue any service at any time.
                  </li>
                  <li>
                    3.4 Results may vary depending on the target social media platform&apos;s algorithms,
                    policies, and technical changes. We do not guarantee permanent results.
                  </li>
                  <li>
                    3.5 Some services may experience drops due to third-party platform changes. Refill
                    guarantees, where offered, are subject to the specific service terms displayed on the
                    service page.
                  </li>
                  <li>
                    3.6 You are responsible for ensuring that the use of our services complies with the terms
                    of service of the respective social media platforms.
                  </li>
                  <li>
                    3.7 We do not require your social media account passwords to deliver services. Never share
                    your passwords with anyone claiming to be from SocialWorldPanel.
                  </li>
                </ul>
              </section>

              {/* SECTION 4 */}
              <section id="section-4" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 4: ORDERS &amp; PAYMENTS
                </h2>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    4.1 All orders placed on SocialWorldPanel are binding once confirmed. Review your order
                    carefully before placement.
                  </li>
                  <li>
                    4.2 Prices are displayed in the currency shown on the platform and are subject to change
                    without notice.
                  </li>
                  <li>
                    4.3 Payments must be made in advance. We do not offer credit or deferred payment unless
                    explicitly agreed upon in writing.
                  </li>
                  <li>
                    4.4 We accept payments through the methods displayed on our platform including but not
                    limited to: UPI, Paytm, Cashfree, bank transfer, and cryptocurrency where available.
                  </li>
                  <li>
                    4.5 All transactions are processed securely. We do not store your complete payment
                    information on our servers.
                  </li>
                  <li>
                    4.6 In case of a failed transaction where money is deducted but the order is not placed,
                    please contact support within 48 hours with transaction proof. Funds will be credited to
                    your wallet after verification.
                  </li>
                  <li>
                    4.7 Currency conversion fees, bank charges, or transaction fees charged by your payment
                    provider are your responsibility and will not be refunded.
                  </li>
                  <li>
                    4.8 Promotional codes and discounts are subject to their own terms and cannot be combined
                    unless explicitly stated.
                  </li>
                </ul>
              </section>

              {/* SECTION 5 */}
              <section id="section-5" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 5: REFUND POLICY
                </h2>
                <p className="text-sm text-gray-300">
                  5.1 Once an order is placed and processing has begun, it cannot be cancelled and is
                  non-refundable unless:
                </p>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-8">
                  <li>(a) The service was not delivered within the specified timeframe</li>
                  <li>(b) We are unable to deliver the service due to a technical error on our end</li>
                  <li>(c) A duplicate order was placed due to a system error</li>
                </ul>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    5.2 Refunds are issued as wallet balance credits, not to the original payment method,
                    unless required by applicable law.
                  </li>
                  <li>
                    5.3 Refund requests must be submitted within 7 days of the order date through our support
                    system with full order details.
                  </li>
                  <li>5.4 Refunds will NOT be issued for:</li>
                </ul>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-8">
                  <li>(a) Orders where delivery has started or is in progress</li>
                  <li>(b) Services that experienced drops after delivery completion</li>
                  <li>(c) Wrong link or information provided by the user</li>
                  <li>(d) Account privacy settings that prevented delivery</li>
                  <li>(e) Orders cancelled by the user after processing began</li>
                  <li>(f) Dissatisfaction with results that met the stated service description</li>
                </ul>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    5.5 Wallet balance refunds are non-withdrawable and can only be used for future orders on
                    the platform.
                  </li>
                  <li>
                    5.6 Chargeback requests filed with your bank or payment provider without first contacting
                    our support will result in immediate permanent account suspension and may result in legal
                    action.
                  </li>
                </ul>
              </section>

              {/* SECTION 6 */}
              <section id="section-6" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 6: WALLET &amp; BALANCE
                </h2>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    6.1 Funds added to your SocialWorldPanel wallet are non-refundable to your original
                    payment method except as required by applicable law.
                  </li>
                  <li>
                    6.2 Wallet balance has no cash value and cannot be transferred to other users or
                    withdrawn unless explicitly allowed by the platform.
                  </li>
                  <li>
                    6.3 We reserve the right to expire wallet balances that have been inactive for more than
                    12 consecutive months, with 30 days prior notice.
                  </li>
                  <li>
                    6.4 Any wallet balance obtained through fraudulent means, chargebacks, or system exploits
                    will be reversed immediately and the account will be suspended.
                  </li>
                  <li>
                    6.5 Loyalty points earned through the platform have no cash value and are subject to
                    their own terms displayed in the Loyalty Program section.
                  </li>
                </ul>
              </section>

              {/* SECTION 7 */}
              <section id="section-7" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 7: RESELLER PROGRAM
                </h2>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    7.1 Resellers are independent operators who access our services at wholesale rates to
                    resell to their own customers.
                  </li>
                  <li>
                    7.2 Resellers are responsible for their own customer relationships, pricing, and support.
                    SocialWorldPanel provides backend service delivery only.
                  </li>
                  <li>
                    7.3 Resellers must not misrepresent the nature of services or make guarantees beyond what
                    SocialWorldPanel officially provides.
                  </li>
                  <li>
                    7.4 SocialWorldPanel is not responsible for disputes between resellers and their end
                    customers.
                  </li>
                  <li>
                    7.5 Reseller accounts found engaging in fraud, abuse, or misrepresentation will be
                    terminated without refund.
                  </li>
                  <li>7.6 Sub-resellers created under a reseller account are the sole responsibility of that reseller.</li>
                  <li>
                    7.7 White-label features are provided as-is. Customization limitations are the reseller&apos;s
                    responsibility to communicate to their customers.
                  </li>
                </ul>
              </section>

              {/* SECTION 8 */}
              <section id="section-8" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 8: PROHIBITED ACTIVITIES
                </h2>
                <p className="text-sm text-gray-300">
                  You agree NOT to use SocialWorldPanel for:
                </p>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4 border-l-2 border-red-500/40 rounded-sm bg-red-500/5 py-2 pl-5">
                  <li>
                    8.1 Any illegal activity or in violation of any local, state, national, or international
                    law or regulation.
                  </li>
                  <li>
                    8.2 Promoting hate speech, violence, terrorism, discrimination based on race, gender,
                    religion, nationality, sexual orientation, disability, or age.
                  </li>
                  <li>8.3 Distributing malware, viruses, or any harmful code.</li>
                  <li>
                    8.4 Attempting to gain unauthorized access to our systems, servers, databases, or other
                    user accounts.
                  </li>
                  <li>
                    8.5 Using automated scripts, bots, or scraping tools to access the platform without our
                    express written permission.
                  </li>
                  <li>
                    8.6 Reselling our services in a manner that violates these terms or applicable law.
                  </li>
                  <li>
                    8.7 Creating fake reviews, fraudulent orders, or manipulating our rating systems.
                  </li>
                  <li>
                    8.8 Using services to target accounts in a harassing, abusive, or threatening manner.
                  </li>
                  <li>
                    8.9 Reverse engineering, decompiling, or attempting to extract source code from our
                    platform.
                  </li>
                  <li>8.10 Impersonating SocialWorldPanel, our employees, or other users.</li>
                </ul>
                <p className="text-sm text-gray-300 mt-2">
                  Violation of any prohibited activity will result in immediate account termination without
                  refund and may result in legal action.
                </p>
              </section>

              {/* SECTION 9 */}
              <section id="section-9" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 9: INTELLECTUAL PROPERTY
                </h2>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    9.1 All content on SocialWorldPanel including but not limited to: logos, design, text,
                    graphics, software, and code are the exclusive property of SocialWorldPanel and protected
                    by applicable intellectual property laws.
                  </li>
                  <li>
                    9.2 You may not copy, reproduce, distribute, modify, or create derivative works without
                    our express written permission.
                  </li>
                  <li>
                    9.3 By using our platform you do not acquire any ownership rights to our intellectual
                    property.
                  </li>
                  <li>
                    9.4 User-submitted content (such as support messages or feedback) may be used by us to
                    improve our services without compensation.
                  </li>
                </ul>
              </section>

              {/* SECTION 10 */}
              <section id="section-10" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 10: PRIVACY POLICY
                </h2>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    10.1 Your use of SocialWorldPanel is also governed by our Privacy Policy, which is
                    incorporated into these Terms by reference.
                  </li>
                  <li>
                    10.2 We collect and process personal data as described in our Privacy Policy in
                    compliance with applicable data protection laws.
                  </li>
                  <li>10.3 We do not sell your personal data to third parties.</li>
                  <li>
                    10.4 We use industry-standard security measures to protect your data but cannot guarantee
                    absolute security against all threats.
                  </li>
                  <li>
                    10.5 By using the platform you consent to the collection and use of your information as
                    outlined in our Privacy Policy.
                  </li>
                </ul>
              </section>

              {/* SECTION 11 */}
              <section id="section-11" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 11: LIMITATION OF LIABILITY
                </h2>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    11.1 SocialWorldPanel provides all services on an &quot;as is&quot; and &quot;as
                    available&quot; basis without warranties of any kind, either express or implied.
                  </li>
                  <li>11.2 We do not warrant that:</li>
                </ul>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-8">
                  <li>(a) The platform will be uninterrupted or error-free</li>
                  <li>(b) Results from services will meet your specific expectations</li>
                  <li>(c) Any errors in the platform will be corrected</li>
                </ul>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>11.3 To the maximum extent permitted by law, SocialWorldPanel shall not be liable for:</li>
                </ul>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-8">
                  <li>(a) Any indirect, incidental, special, or consequential damages</li>
                  <li>(b) Loss of profits, revenue, data, or business opportunities</li>
                  <li>(c) Damages resulting from third-party platform policy changes</li>
                  <li>(d) Any unauthorized access to your account or data</li>
                </ul>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    11.4 Our total liability to you for any claim shall not exceed the amount you paid to us
                    in the 30 days preceding the claim.
                  </li>
                </ul>
              </section>

              {/* SECTION 12 */}
              <section id="section-12" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 12: INDEMNIFICATION
                </h2>
                <p className="text-sm text-gray-300">
                  12.1 You agree to indemnify, defend, and hold harmless SocialWorldPanel, its officers,
                  directors, employees, and agents from any claims, damages, losses, liabilities, costs, and
                  expenses (including legal fees) arising from:
                </p>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-8">
                  <li>(a) Your use or misuse of the platform</li>
                  <li>(b) Your violation of these Terms</li>
                  <li>(c) Your violation of any third-party rights</li>
                  <li>(d) Any content you submit through the platform</li>
                </ul>
              </section>

              {/* SECTION 13 */}
              <section id="section-13" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 13: THIRD-PARTY SERVICES &amp; LINKS
                </h2>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    13.1 Our platform may integrate with or link to third-party services and websites. We
                    have no control over and assume no responsibility for their content, privacy policies, or
                    practices.
                  </li>
                  <li>
                    13.2 Third-party payment processors have their own terms and privacy policies which
                    govern your transactions with them.
                  </li>
                  <li>
                    13.3 Social media platforms (Instagram, YouTube, TikTok, etc.) have their own terms of
                    service. Compliance with those terms is your responsibility.
                  </li>
                </ul>
              </section>

              {/* SECTION 14 */}
              <section id="section-14" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 14: SERVICE INTERRUPTIONS &amp; MAINTENANCE
                </h2>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    14.1 We may perform scheduled or emergency maintenance that temporarily interrupts
                    service availability.
                  </li>
                  <li>
                    14.2 We will attempt to provide advance notice of scheduled maintenance but are not
                    obligated to do so.
                  </li>
                  <li>
                    14.3 SocialWorldPanel is not liable for any losses incurred during service interruptions.
                  </li>
                  <li>
                    14.4 Orders placed during maintenance periods may be delayed and will be processed once
                    services resume.
                  </li>
                </ul>
              </section>

              {/* SECTION 15 */}
              <section id="section-15" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 15: ACCOUNT TERMINATION
                </h2>
                <p className="text-sm text-gray-300">
                  15.1 We reserve the right to suspend or terminate your account at any time for:
                </p>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-8">
                  <li>(a) Violation of these Terms</li>
                  <li>(b) Fraudulent or abusive behavior</li>
                  <li>(c) Chargeback requests</li>
                  <li>(d) Inactivity exceeding 24 months</li>
                  <li>(e) Any reason we deem necessary to protect the platform and its users</li>
                </ul>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>15.2 Upon termination:</li>
                </ul>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-8">
                  <li>(a) Your access to the platform will be immediately revoked</li>
                  <li>(b) Pending orders may be cancelled without refund</li>
                  <li>
                    (c) Remaining wallet balance may be forfeited if termination is due to Terms violation
                  </li>
                </ul>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    15.3 You may terminate your account at any time by contacting support. Unused wallet
                    balance at the time of voluntary termination is non-refundable.
                  </li>
                </ul>
              </section>

              {/* SECTION 16 */}
              <section id="section-16" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 16: DISPUTE RESOLUTION
                </h2>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>
                    16.1 Before initiating any formal dispute, you agree to contact our support team at
                    support@socialworldpanel.com and allow 14 business days for resolution.
                  </li>
                  <li>
                    16.2 Any disputes arising from these Terms shall first be attempted to be resolved through
                    good-faith negotiation.
                  </li>
                  <li>
                    16.3 If negotiation fails, disputes shall be resolved through binding arbitration rather
                    than in court, except where prohibited by law.
                  </li>
                  <li>
                    16.4 These Terms are governed by and construed in accordance with the laws of India. Any
                    legal proceedings shall be conducted in the courts of [Your City], India.
                  </li>
                </ul>
              </section>

              {/* SECTION 17 */}
              <section id="section-17" className="space-y-3">
                <h2 className="text-lg md:text-xl font-exo font-bold text-white print:text-black">
                  SECTION 17: CONTACT INFORMATION
                </h2>
                <p className="text-sm text-gray-300">
                  For questions about these Terms and Conditions, please contact us:
                </p>
                <ul className="space-y-1.5 text-sm text-gray-300 pl-4">
                  <li>SocialWorldPanel</li>
                  <li>Email: support@socialworldpanel.com</li>
                  <li>Website: https://socialworldpanel.com</li>
                  <li>Support Hours: Monday – Saturday, 10:00 AM – 7:00 PM IST</li>
                </ul>
                <p className="text-sm text-gray-300 mt-2">
                  For urgent issues, please use the in-platform support ticket system for faster response.
                </p>
                <p className="text-sm text-gray-300 mt-4">
                  By using SocialWorldPanel, you acknowledge that you have read, understood, and agree to be
                  bound by these Terms and Conditions.
                </p>
              </section>
            </motion.div>
          </section>
        </div>
      </main>

      <Footer />

      {/* Back to top button – hidden on print */}
      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 rounded-full bg-electric-blue text-black p-3 shadow-lg hover:bg-electric-blue/90 transition-transform hover:scale-105 print:hidden min-w-[48px] min-h-[48px]"
          aria-label="Back to top"
        >
          <ArrowUp size={18} />
        </button>
      )}
      </div>
    </div>
  );
};

export default TermsPage;
