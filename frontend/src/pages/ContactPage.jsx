import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Send, MapPin, Clock } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';

const ContactPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Message sent! We\'ll get back to you soon.');
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />
      <Toaster position="top-right" theme="dark" />

      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-exo font-bold mb-4">
              GET IN <span className="neon-text">TOUCH</span>
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto">
              Have questions? We're here to help. Send us a message and we'll respond as soon as possible.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1 space-y-4"
            >
              {[
                { icon: Mail, title: 'Email Us', info: 'support@socialworldpanel.com', desc: 'We respond within 24 hours' },
                { icon: MessageSquare, title: 'Live Chat', info: 'Available 24/7', desc: 'Get instant help' },
                { icon: MapPin, title: 'Location', info: 'Global Services', desc: 'Serving customers worldwide' },
                { icon: Clock, title: 'Business Hours', info: '24/7', desc: 'Always available' },
              ].map((item, idx) => (
                <Card key={idx} className="glass p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-electric-blue/10 flex items-center justify-center">
                      <item.icon className="text-electric-blue" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{item.title}</h3>
                      <p className="text-electric-blue">{item.info}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2"
            >
              <Card className="glass p-6 md:p-8">
                <h2 className="text-xl font-exo font-bold text-white mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400">Your Name</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="mt-2 bg-deep-navy border-white/10"
                        required
                        data-testid="contact-name"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400">Email Address</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="mt-2 bg-deep-navy border-white/10"
                        required
                        data-testid="contact-email"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-400">Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="How can we help?"
                      className="mt-2 bg-deep-navy border-white/10"
                      required
                      data-testid="contact-subject"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Message</Label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Your message..."
                      className="mt-2 bg-deep-navy border-white/10 min-h-[150px]"
                      required
                      data-testid="contact-message"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-electric-blue text-black font-bold py-6"
                    data-testid="contact-submit"
                  >
                    {sending ? (
                      <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Send size={18} className="mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
