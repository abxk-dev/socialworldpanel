import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const TermsPage = () => {
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
              TERMS OF <span className="neon-text">SERVICE</span>
            </h1>
            <p className="text-center text-gray-500 mb-12">Last updated: January 2024</p>

            <div className="glass rounded-2xl p-8 space-y-8">
              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-400">
                  By accessing and using Social World Panel, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">2. Service Description</h2>
                <p className="text-gray-400">
                  Social World Panel provides social media marketing services including but not limited to followers, likes, views, and engagement for various social media platforms. We act as an intermediary between service providers and customers.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">3. User Responsibilities</h2>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>You must be at least 18 years old to use our services</li>
                  <li>You are responsible for maintaining the confidentiality of your account</li>
                  <li>You agree not to use our services for any illegal purposes</li>
                  <li>You must provide accurate information when placing orders</li>
                  <li>You understand that social media platforms may have their own terms regarding engagement services</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">4. Payment Terms</h2>
                <p className="text-gray-400">
                  All payments are final and non-refundable unless otherwise specified. We accept various payment methods including credit cards, cryptocurrency, and local payment options. Prices are subject to change without notice.
                </p>
              </section>

              <section id="refund">
                <h2 className="text-xl font-exo font-bold text-white mb-4">5. Refund Policy</h2>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>Refunds are only issued for undelivered orders</li>
                  <li>Partial refunds may be issued for partially completed orders</li>
                  <li>No refunds for completed orders</li>
                  <li>Refunds are processed within 5-7 business days</li>
                  <li>Refunds are credited to your panel balance by default</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">6. Service Delivery</h2>
                <p className="text-gray-400">
                  We strive to deliver all orders within the estimated timeframe. However, delivery times may vary depending on the service and platform. We do not guarantee specific results or that services will result in any particular outcome.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">7. Limitation of Liability</h2>
                <p className="text-gray-400">
                  Social World Panel shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services. Our total liability shall not exceed the amount paid by you for the specific service in question.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">8. Changes to Terms</h2>
                <p className="text-gray-400">
                  We reserve the right to modify these terms at any time. Continued use of our services after any changes constitutes acceptance of the new terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-exo font-bold text-white mb-4">9. Contact</h2>
                <p className="text-gray-400">
                  For questions about these Terms of Service, please contact us at support@socialworldpanel.com
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

export default TermsPage;
