import React from 'react';
import { motion } from 'framer-motion';
import { Code, Terminal, Copy, ChevronRight } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';

const ApiDocsPage = () => {
  const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api/v2`;

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard');
  };

  const endpoints = [
    {
      action: 'balance',
      description: 'Get your account balance',
      params: ['key (required)'],
      response: '{"balance": "100.00", "currency": "USD"}'
    },
    {
      action: 'services',
      description: 'Get list of all available services',
      params: ['key (required)'],
      response: '[{"service": "1", "name": "Instagram Followers", "rate": "2.50", "min": "100", "max": "10000"}]'
    },
    {
      action: 'add',
      description: 'Place a new order',
      params: ['key (required)', 'service (required)', 'link (required)', 'quantity (required)'],
      response: '{"order": "ord_abc123"}'
    },
    {
      action: 'status',
      description: 'Check order status',
      params: ['key (required)', 'order (required)'],
      response: '{"status": "completed", "charge": "2.50", "start_count": "1000", "remains": "0"}'
    },
  ];

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />
      <Toaster position="top-right" theme="dark" />

      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-exo font-bold mb-4">
              API <span className="neon-text">DOCUMENTATION</span>
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto">
              Integrate our services into your own applications with our powerful API
            </p>
          </motion.div>

          {/* Getting Started */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <Card className="glass p-6">
              <h2 className="text-xl font-exo font-bold text-white mb-4 flex items-center gap-2">
                <Terminal className="text-electric-blue" />
                Getting Started
              </h2>
              <div className="space-y-4 text-gray-300">
                <p>To use the API, you'll need an API key. Get your key from the <a href="/dashboard/api" className="text-electric-blue hover:underline">API Access</a> page in your dashboard.</p>
                <div className="bg-black/30 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-500 text-sm">API Endpoint</span>
                    <Button size="sm" variant="ghost" onClick={() => copyCode(apiUrl)} className="text-gray-400">
                      <Copy size={14} />
                    </Button>
                  </div>
                  <code className="text-electric-blue font-mono">{apiUrl}</code>
                </div>
                <p className="text-sm text-gray-500">All requests must be POST with Content-Type: application/json</p>
              </div>
            </Card>
          </motion.div>

          {/* Endpoints */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-exo font-bold text-white">Endpoints</h2>
            
            {endpoints.map((endpoint, idx) => (
              <motion.div
                key={endpoint.action}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
              >
                <Card className="glass overflow-hidden">
                  <div className="p-6 border-b border-white/5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-exo font-bold text-white flex items-center gap-2">
                          <Code className="text-electric-blue" size={20} />
                          {endpoint.action}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">{endpoint.description}</p>
                      </div>
                      <span className="bg-neon-green/20 text-neon-green text-xs px-2 py-1 rounded font-mono">POST</span>
                    </div>
                  </div>
                  
                  <Tabs defaultValue="params" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b border-white/5 bg-transparent p-0">
                      <TabsTrigger value="params" className="rounded-none border-b-2 border-transparent data-[state=active]:border-electric-blue data-[state=active]:bg-transparent">
                        Parameters
                      </TabsTrigger>
                      <TabsTrigger value="response" className="rounded-none border-b-2 border-transparent data-[state=active]:border-electric-blue data-[state=active]:bg-transparent">
                        Response
                      </TabsTrigger>
                      <TabsTrigger value="example" className="rounded-none border-b-2 border-transparent data-[state=active]:border-electric-blue data-[state=active]:bg-transparent">
                        Example
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="params" className="p-4">
                      <ul className="space-y-2">
                        {endpoint.params.map((param, i) => (
                          <li key={i} className="flex items-center gap-2 text-gray-300">
                            <ChevronRight size={14} className="text-electric-blue" />
                            <code className="font-mono text-sm">{param}</code>
                          </li>
                        ))}
                      </ul>
                    </TabsContent>
                    
                    <TabsContent value="response" className="p-4">
                      <pre className="bg-black/30 rounded-lg p-4 overflow-x-auto">
                        <code className="text-neon-green font-mono text-sm">{endpoint.response}</code>
                      </pre>
                    </TabsContent>
                    
                    <TabsContent value="example" className="p-4">
                      <pre className="bg-black/30 rounded-lg p-4 overflow-x-auto">
                        <code className="text-gray-300 font-mono text-sm">{`curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "YOUR_API_KEY",
    "action": "${endpoint.action}"${endpoint.action === 'add' ? `,
    "service": "srv_ig_followers",
    "link": "https://instagram.com/username",
    "quantity": 1000` : endpoint.action === 'status' ? `,
    "order": "ord_abc123"` : ''}
  }'`}</code>
                      </pre>
                    </TabsContent>
                  </Tabs>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Error Codes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12"
          >
            <h2 className="text-2xl font-exo font-bold text-white mb-6">Error Codes</h2>
            <Card className="glass overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left p-4 text-gray-400 font-medium">Error</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { code: 'Invalid API key', desc: 'The provided API key is incorrect or invalid' },
                    { code: 'Service not found', desc: 'The specified service ID does not exist' },
                    { code: 'Insufficient balance', desc: 'Your account balance is too low for this order' },
                    { code: 'Invalid action', desc: 'The specified action is not supported' },
                    { code: 'Order not found', desc: 'The specified order ID does not exist' },
                  ].map((error, i) => (
                    <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-4 text-red-400 font-mono">{error.code}</td>
                      <td className="p-4 text-gray-400">{error.desc}</td>
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

export default ApiDocsPage;
