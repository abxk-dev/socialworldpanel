import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-exo font-bold mb-4 text-center">
              PRIVACY <span className="neon-text">POLICY</span>
            </h1>
            <p className="text-center text-gray-500 mb-12">Last updated: January 2024</p>

            <div className="glass rounded-2xl p-8 space-y-8">
              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">1. Information We Collect</h2>
                <p className="text-gray-400 mb-4">We collect the following types of information:</p>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>Account information (name, email, password)</li>
                  <li>Payment information (processed securely through payment providers)</li>
                  <li>Order information (services purchased, links provided)</li>
                  <li>Usage data (how you interact with our platform)</li>
                  <li>Device information (IP address, browser type)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">2. How We Use Your Information</h2>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>To provide and maintain our services</li>
                  <li>To process your orders and payments</li>
                  <li>To communicate with you about your account</li>
                  <li>To improve our services and user experience</li>
                  <li>To prevent fraud and ensure security</li>
                  <li>To comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">3. Data Security</h2>
                <p className="text-gray-400">
                  We implement industry-standard security measures to protect your data. This includes encryption, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">4. Third-Party Services</h2>
                <p className="text-gray-400">
                  We may use third-party services for payment processing, analytics, and service delivery. These third parties have their own privacy policies and we recommend reviewing them.
                </p>
              </section>

              <section id="cookies">
                <h2 className="text-xl font-exo font-bold text-white mb-4">5. Cookies</h2>
                <p className="text-gray-400 mb-4">We use cookies to:</p>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>Keep you logged in to your account</li>
                  <li>Remember your preferences</li>
                  <li>Analyze site traffic and usage</li>
                  <li>Improve our services</li>
                </ul>
                <p className="text-gray-400 mt-4">
                  You can control cookies through your browser settings. Disabling cookies may affect the functionality of our platform.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">6. Your Rights</h2>
                <p className="text-gray-400 mb-4">You have the right to:</p>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>Access your personal data</li>
                  <li>Request correction of your data</li>
                  <li>Request deletion of your data</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Export your data</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">7. Data Retention</h2>
                <p className="text-gray-400">
                  We retain your data for as long as your account is active or as needed to provide services. We may retain certain information for legal or business purposes after account deletion.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">8. Children's Privacy</h2>
                <p className="text-gray-400">
                  Our services are not intended for individuals under 18 years of age. We do not knowingly collect information from children.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">9. Changes to This Policy</h2>
                <p className="text-gray-400">
                  We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">10. Contact Us</h2>
                <p className="text-gray-400">
                  For questions about this Privacy Policy, please contact us at privacy@socialworldpanel.com
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PrivacyPage;
