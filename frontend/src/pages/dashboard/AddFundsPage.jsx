import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Wallet, Globe, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth, API } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import axios from 'axios';

const AddFundsPage = () => {
  const { token, refreshUser } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const paymentMethods = [
    { 
      id: 'stripe', 
      name: 'Stripe', 
      icon: CreditCard, 
      description: 'Credit/Debit Card',
      minAmount: 5,
      maxAmount: 1000,
      fee: '0%',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10'
    },
    { 
      id: 'paytm', 
      name: 'Paytm', 
      icon: Wallet, 
      description: 'UPI, Wallet, Net Banking',
      minAmount: 1,
      maxAmount: 500,
      fee: '0%',
      color: 'text-sky-400',
      bgColor: 'bg-sky-400/10'
    },
    { 
      id: 'cryptomus', 
      name: 'Crypto', 
      icon: Globe, 
      description: 'Bitcoin, USDT, ETH & more',
      minAmount: 10,
      maxAmount: 10000,
      fee: '0%',
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10'
    },
  ];

  const presetAmounts = [10, 25, 50, 100, 250, 500];

  const handleDeposit = async () => {
    if (!selectedMethod || !amount) {
      toast.error('Please select a payment method and enter amount');
      return;
    }

    const method = paymentMethods.find(m => m.id === selectedMethod);
    const amountNum = parseFloat(amount);

    if (amountNum < method.minAmount) {
      toast.error(`Minimum amount: $${method.minAmount}`);
      return;
    }
    if (amountNum > method.maxAmount) {
      toast.error(`Maximum amount: $${method.maxAmount}`);
      return;
    }

    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(
        `${API}/deposits`,
        { amount: amountNum, method: selectedMethod },
        { headers, withCredentials: true }
      );
      setSuccess(true);
      await refreshUser();
      toast.success(`$${amountNum.toFixed(2)} added to your balance!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout title="Add Funds">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="glass p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-neon-green" size={40} />
              </div>
              <h2 className="text-2xl font-exo font-bold text-white mb-2">Payment Successful!</h2>
              <p className="text-gray-400 mb-6">
                ${parseFloat(amount).toFixed(2)} has been added to your balance.
              </p>
              <Button 
                onClick={() => { setSuccess(false); setAmount(''); setSelectedMethod(null); }}
                className="bg-electric-blue text-black"
              >
                Add More Funds
              </Button>
            </Card>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Add Funds">
      <Toaster position="top-right" theme="dark" />
      
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Demo Notice */}
          <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
            <AlertCircle className="text-yellow-500 mt-0.5" size={20} />
            <div>
              <p className="text-yellow-500 font-medium">Demo Mode</p>
              <p className="text-yellow-500/80 text-sm">Payments are simulated. Balance will be added instantly for testing purposes.</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Payment Methods */}
            <Card className="glass p-6">
              <h2 className="text-xl font-exo font-bold text-white mb-6">Select Payment Method</h2>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <motion.button
                    key={method.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full p-4 rounded-xl border transition-all text-left ${
                      selectedMethod === method.id 
                        ? 'border-electric-blue bg-electric-blue/10' 
                        : 'border-white/10 hover:border-white/20 bg-white/5'
                    }`}
                    data-testid={`payment-method-${method.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${method.bgColor}`}>
                        <method.icon className={method.color} size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{method.name}</h3>
                        <p className="text-sm text-gray-500">{method.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Fee: {method.fee}</div>
                        <div className="text-xs text-gray-500">${method.minAmount} - ${method.maxAmount}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </Card>

            {/* Amount Selection */}
            <Card className="glass p-6">
              <h2 className="text-xl font-exo font-bold text-white mb-6">Enter Amount</h2>
              
              {/* Preset Amounts */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {presetAmounts.map((preset) => (
                  <Button
                    key={preset}
                    variant={amount === String(preset) ? "default" : "outline"}
                    onClick={() => setAmount(String(preset))}
                    className={amount === String(preset) ? "bg-electric-blue text-black" : "border-white/10"}
                    data-testid={`preset-${preset}`}
                  >
                    ${preset}
                  </Button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="mb-6">
                <Label className="text-gray-400">Custom Amount</Label>
                <div className="relative mt-2">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="pl-10 bg-deep-navy border-white/10 text-2xl font-bold"
                    data-testid="custom-amount-input"
                  />
                </div>
              </div>

              {/* Summary */}
              {amount && selectedMethod && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white/5 rounded-lg p-4 mb-6"
                >
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Amount</span>
                    <span className="text-white">${parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Fee</span>
                    <span className="text-neon-green">$0.00</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-white font-bold">Total</span>
                      <span className="text-electric-blue font-bold text-xl">${parseFloat(amount).toFixed(2)}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleDeposit}
                disabled={loading || !selectedMethod || !amount}
                className="w-full bg-neon-green hover:bg-neon-green/90 text-black font-bold py-6 text-lg"
                data-testid="deposit-submit"
              >
                {loading ? (
                  <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
                ) : (
                  <>
                    <CreditCard size={20} className="mr-2" />
                    Proceed to Payment
                  </>
                )}
              </Button>
            </Card>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default AddFundsPage;
