import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, RefreshCw, Eye, EyeOff, Code, Terminal } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth, API } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import axios from 'axios';

const ApiAccessPage = () => {
  const { token } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API}/user/api-key`, { headers, withCredentials: true });
        setApiKey(response.data.api_key);
      } catch (error) {
        toast.error('Failed to load API key');
      } finally {
        setLoading(false);
      }
    };
    fetchApiKey();
  }, [token]);

  const handleRegenerate = async () => {
    if (!window.confirm('Are you sure? This will invalidate your current API key.')) return;
    
    setRegenerating(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`${API}/user/api-key/regenerate`, {}, { headers, withCredentials: true });
      setApiKey(response.data.api_key);
      toast.success('API key regenerated');
    } catch (error) {
      toast.error('Failed to regenerate API key');
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api/v2`;

  const codeExamples = {
    curl: `# Get Balance
curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "${apiKey || 'YOUR_API_KEY'}",
    "action": "balance"
  }'

# Get Services
curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "${apiKey || 'YOUR_API_KEY'}",
    "action": "services"
  }'

# Place Order
curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "${apiKey || 'YOUR_API_KEY'}",
    "action": "add",
    "service": "srv_ig_followers",
    "link": "https://instagram.com/username",
    "quantity": 1000
  }'

# Check Order Status
curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "${apiKey || 'YOUR_API_KEY'}",
    "action": "status",
    "order": "ord_xxxxxxxx"
  }'`,

    php: `<?php
$api_url = "${apiUrl}";
$api_key = "${apiKey || 'YOUR_API_KEY'}";

// Get Balance
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $api_url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'key' => $api_key,
    'action' => 'balance'
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
$balance = json_decode($response, true);
echo "Balance: $" . $balance['balance'];

// Place Order
$order_data = [
    'key' => $api_key,
    'action' => 'add',
    'service' => 'srv_ig_followers',
    'link' => 'https://instagram.com/username',
    'quantity' => 1000
];
// ... same curl setup
?>`,

    python: `import requests

API_URL = "${apiUrl}"
API_KEY = "${apiKey || 'YOUR_API_KEY'}"

# Get Balance
response = requests.post(API_URL, json={
    "key": API_KEY,
    "action": "balance"
})
print(f"Balance: ${response.json()['balance']}")

# Get Services
response = requests.post(API_URL, json={
    "key": API_KEY,
    "action": "services"
})
services = response.json()
for service in services[:5]:
    print(f"{service['service']}: {service['name']} - ${service['rate']}/1k")

# Place Order
response = requests.post(API_URL, json={
    "key": API_KEY,
    "action": "add",
    "service": "srv_ig_followers",
    "link": "https://instagram.com/username",
    "quantity": 1000
})
print(f"Order ID: {response.json()['order']}")

# Check Status
response = requests.post(API_URL, json={
    "key": API_KEY,
    "action": "status",
    "order": "ord_xxxxxxxx"
})
print(response.json())`
  };

  return (
    <DashboardLayout title="API Access">
      <Toaster position="top-right" theme="dark" />
      
      <div className="max-w-4xl mx-auto space-y-6">
        {/* API Key Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-electric-blue/10">
                <Code className="text-electric-blue" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-exo font-bold text-white">Your API Key</h2>
                <p className="text-sm text-gray-500">Use this key to integrate with our API</p>
              </div>
            </div>

            {loading ? (
              <div className="py-4 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      readOnly
                      className="bg-deep-navy border-white/10 font-mono pr-20"
                      data-testid="api-key-display"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(apiKey)}
                    className="border-white/10"
                    data-testid="copy-api-key"
                  >
                    <Copy size={18} />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    data-testid="regenerate-api-key"
                  >
                    <RefreshCw size={18} className={regenerating ? 'animate-spin' : ''} />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Keep your API key secure. Never share it publicly or commit it to version control.
                </p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* API Endpoint */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass p-6">
            <h3 className="font-exo font-bold text-white mb-4">API Endpoint</h3>
            <div className="flex gap-2">
              <Input
                value={apiUrl}
                readOnly
                className="bg-deep-navy border-white/10 font-mono flex-1"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(apiUrl)}
                className="border-white/10"
              >
                <Copy size={18} />
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Code Examples */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Terminal className="text-electric-blue" size={24} />
                <h3 className="font-exo font-bold text-white">Code Examples</h3>
              </div>
            </div>
            
            <Tabs defaultValue="curl" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b border-white/5 bg-transparent p-0">
                {['curl', 'php', 'python'].map(lang => (
                  <TabsTrigger
                    key={lang}
                    value={lang}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-electric-blue data-[state=active]:bg-transparent uppercase"
                  >
                    {lang}
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.entries(codeExamples).map(([lang, code]) => (
                <TabsContent key={lang} value={lang} className="p-0 mt-0">
                  <div className="relative">
                    <pre className="p-6 overflow-x-auto text-sm text-gray-300 font-mono bg-black/30">
                      <code>{code}</code>
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(code)}
                      className="absolute top-4 right-4 border-white/10"
                    >
                      <Copy size={14} className="mr-1" />
                      Copy
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </Card>
        </motion.div>

        {/* API Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass p-6">
            <h3 className="font-exo font-bold text-white mb-4">Available Actions</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { action: 'balance', desc: 'Get your account balance' },
                { action: 'services', desc: 'List all available services' },
                { action: 'add', desc: 'Place a new order' },
                { action: 'status', desc: 'Check order status' },
              ].map(item => (
                <div key={item.action} className="bg-white/5 rounded-lg p-4">
                  <code className="text-electric-blue font-bold">{item.action}</code>
                  <p className="text-sm text-gray-400 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default ApiAccessPage;
