import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, RefreshCw, Eye, EyeOff, Code, Terminal } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth } from '../../App';
import { API } from '../../config';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';

function getApiBaseUrl() {
  if (typeof window === 'undefined') return '';
  if (API && API.startsWith('http')) return API.replace(/\/api\/?$/, '');
  return window.location.origin;
}

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
        const response = await api.get('/user/api-key', { headers, withCredentials: true });
        const data = response.data;
        setApiKey((data && (data.api_key ?? data.key)) || '');
      } catch (error) {
        toast.error('Failed to load API key');
        setApiKey('');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchApiKey();
    else setLoading(false);
  }, [token]);

  const handleRegenerate = async () => {
    if (!window.confirm('Are you sure? This will invalidate your current API key.')) return;
    
    setRegenerating(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await api.post('/user/api-key/regenerate', {}, { headers, withCredentials: true });
      const data = response.data;
      setApiKey((data && (data.api_key ?? data.key)) || '');
      toast.success('API key regenerated');
    } catch (error) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      const msg = status === 401
        ? 'Session expired or unauthorized. Please log in again.'
        : (detail || 'Failed to regenerate API key');
      toast.error(msg);
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const apiUrl = `${getApiBaseUrl()}/api/v2`;

  const codeExamples = {
    curl: `# Get Balance
curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "${apiKey || 'YOUR_API_KEY'}", "action": "balance"}'

# Get Services (service_id, name, category, rate, min, max)
curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "${apiKey || 'YOUR_API_KEY'}", "action": "services"}'

# Place Order
curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "${apiKey || 'YOUR_API_KEY'}", "action": "add", "service": "srv_ig_followers", "link": "https://instagram.com/username", "quantity": 1000}'

# Check Order Status
curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "${apiKey || 'YOUR_API_KEY'}", "action": "status", "order": "ord_xxxxxxxx"}'

# Create Refill
curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "${apiKey || 'YOUR_API_KEY'}", "action": "refill", "order": "ord_xxxxxxxx"}'

# Cancel Orders
curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "${apiKey || 'YOUR_API_KEY'}", "action": "cancel", "orders": "ord_1,ord_2"}'`,

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
resp = requests.post(API_URL, json={
    "key": API_KEY,
    "action": "balance"
})
print(f"Balance: \\$" + str(resp.json().get("balance", 0)))

# Get Services
resp = requests.post(API_URL, json={
    "key": API_KEY,
    "action": "services"
})
services = resp.json()
for service in services[:5]:
    print(service.get("service") + ": " + service.get("name") + " - \\$" + str(service.get("rate", 0)) + "/1k")

# Place Order
resp = requests.post(API_URL, json={
    "key": API_KEY,
    "action": "add",
    "service": "srv_ig_followers",
    "link": "https://instagram.com/username",
    "quantity": 1000
})
print("Order ID: " + str(resp.json().get("order", "")))

# Check Status
resp = requests.post(API_URL, json={
    "key": API_KEY,
    "action": "status",
    "order": "ord_xxxxxxxx"
})
print(resp.json())`
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
                <h2 className="text-xl font-exo font-bold text-[var(--text-primary)]">Your API Key</h2>
                <p className="text-sm text-[var(--text-muted)]">Use this key to integrate with our API</p>
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
                      className="bg-deep-navy border-[var(--border)] font-mono pr-20"
                      data-testid="api-key-display"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(apiKey)}
                    className="border-[var(--border)]"
                    data-testid="copy-api-key"
                  >
                    <Copy size={18} />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="border-[var(--error)]/30 text-[var(--error)] hover:bg-[var(--error-bg)]"
                    data-testid="regenerate-api-key"
                  >
                    <RefreshCw size={18} className={regenerating ? 'animate-spin' : ''} />
                  </Button>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
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
            <h3 className="font-exo font-bold text-[var(--text-primary)] mb-4">API Endpoint</h3>
            <div className="flex gap-2">
              <Input
                value={apiUrl}
                readOnly
                className="bg-deep-navy border-[var(--border)] font-mono flex-1"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(apiUrl)}
                className="border-[var(--border)]"
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
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <Terminal className="text-electric-blue" size={24} />
                <h3 className="font-exo font-bold text-[var(--text-primary)]">Code Examples</h3>
              </div>
            </div>
            
            <Tabs defaultValue="curl" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b border-[var(--border)] bg-transparent p-0">
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
                    <pre className="p-6 overflow-x-auto text-sm text-[var(--text-secondary)] font-mono bg-black/30">
                      <code>{code}</code>
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(code)}
                      className="absolute top-4 right-4 border-[var(--border)]"
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
            <h3 className="font-exo font-bold text-[var(--text-primary)] mb-4">Available Actions</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { action: 'balance', desc: 'Get your account balance' },
                { action: 'services', desc: 'List all services with ID, name, category, rate, min, max' },
                { action: 'add', desc: 'Place a new order (service, link, quantity)' },
                { action: 'status', desc: 'Check order status' },
                { action: 'refill', desc: 'Create refill for an order' },
                { action: 'refill_status', desc: 'Get refill status' },
                { action: 'cancel', desc: 'Cancel orders (comma-separated IDs)' },
              ].map(item => (
                <div key={item.action} className="bg-[var(--bg-card)] rounded-lg p-4">
                  <code className="text-electric-blue font-bold">{item.action}</code>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Services Response Format */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="glass p-6">
            <h3 className="font-exo font-bold text-[var(--text-primary)] mb-2">Services Response (action: services)</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">Returns list of services with service_id, name, description, category, rate, min_order, max_order</p>
            <pre className="p-4 rounded-lg bg-black/40 text-[var(--text-secondary)] text-xs font-mono overflow-x-auto">
{`[
  {
    "service_id": "srv_ig_followers",
    "name": "Instagram Followers",
    "description": "High quality followers",
    "category": "Instagram",
    "rate": 2.50,
    "min_order": 100,
    "max_order": 100000,
    "refill": true
  },
  {
    "service_id": "srv_yt_views",
    "name": "YouTube Views",
    "description": "Organic views",
    "category": "YouTube",
    "rate": 1.20,
    "min_order": 1000,
    "max_order": 500000,
    "refill": false
  }
]`}
            </pre>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default ApiAccessPage;
