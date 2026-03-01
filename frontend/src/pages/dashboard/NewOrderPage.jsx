import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link as LinkIcon, Hash, DollarSign, Clock, Info, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth, API } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import axios from 'axios';

const NewOrderPage = () => {
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catRes, srvRes] = await Promise.all([
          axios.get(`${API}/services/categories`),
          axios.get(`${API}/services`)
        ]);
        setCategories(catRes.data);
        setServices(srvRes.data);
      } catch (error) {
        toast.error('Failed to load services');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredServices = selectedCategory 
    ? services.filter(s => s.category_id === selectedCategory)
    : services;

  const calculatePrice = () => {
    if (!selectedService || !quantity) return 0;
    return ((parseInt(quantity) / 1000) * selectedService.rate).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService || !link || !quantity) {
      toast.error('Please fill all fields');
      return;
    }

    const qty = parseInt(quantity);
    if (qty < selectedService.min_order) {
      toast.error(`Minimum order: ${selectedService.min_order}`);
      return;
    }
    if (qty > selectedService.max_order) {
      toast.error(`Maximum order: ${selectedService.max_order}`);
      return;
    }

    setSubmitting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(
        `${API}/orders`,
        { service_id: selectedService.service_id, link, quantity: qty },
        { headers, withCredentials: true }
      );
      toast.success(`Order placed! ID: ${response.data.order_id}`);
      await refreshUser();
      navigate('/dashboard/orders');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="New Order">
      <Toaster position="top-right" theme="dark" />
      
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass p-6 md:p-8">
            <h2 className="text-2xl font-exo font-bold text-white mb-6">Place New Order</h2>

            {loading ? (
              <div className="py-20 text-center">
                <div className="animate-spin w-10 h-10 border-4 border-electric-blue border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Category Select */}
                <div>
                  <Label className="text-gray-400">Category</Label>
                  <Select value={selectedCategory} onValueChange={(val) => { setSelectedCategory(val); setSelectedService(null); }}>
                    <SelectTrigger className="mt-2 bg-deep-navy border-white/10" data-testid="order-category-select">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-deep-navy border-white/10">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.category_id} value={cat.category_id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Select */}
                <div>
                  <Label className="text-gray-400">Service</Label>
                  <Select 
                    value={selectedService?.service_id || ''} 
                    onValueChange={(val) => {
                      const srv = services.find(s => s.service_id === val);
                      setSelectedService(srv);
                      if (srv) setQuantity(String(srv.min_order));
                    }}
                  >
                    <SelectTrigger className="mt-2 bg-deep-navy border-white/10" data-testid="order-service-select">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent className="bg-deep-navy border-white/10 max-h-80">
                      {filteredServices.map(srv => (
                        <SelectItem key={srv.service_id} value={srv.service_id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{srv.name}</span>
                            <span className="text-electric-blue ml-2">${srv.rate}/1k</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Info */}
                {selectedService && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-electric-blue/5 border border-electric-blue/20 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Info size={20} className="text-electric-blue mt-1" />
                      <div className="flex-1">
                        <h4 className="font-bold text-white">{selectedService.name}</h4>
                        <p className="text-sm text-gray-400 mt-1">{selectedService.description || 'High quality service with fast delivery'}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm">
                          <span className="text-gray-400">Rate: <span className="text-electric-blue">${selectedService.rate}/1000</span></span>
                          <span className="text-gray-400">Min: <span className="text-white">{selectedService.min_order.toLocaleString()}</span></span>
                          <span className="text-gray-400">Max: <span className="text-white">{selectedService.max_order.toLocaleString()}</span></span>
                          {selectedService.avg_time && <span className="text-gray-400">Time: <span className="text-white">{selectedService.avg_time}</span></span>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Link Input */}
                <div>
                  <Label className="text-gray-400">Link</Label>
                  <div className="relative mt-2">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <Input
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://instagram.com/username or post link"
                      className="pl-10 bg-deep-navy border-white/10 focus:border-electric-blue"
                      required
                      data-testid="order-link-input"
                    />
                  </div>
                </div>

                {/* Quantity Input */}
                <div>
                  <Label className="text-gray-400">Quantity</Label>
                  <div className="relative mt-2">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder={selectedService ? `Min: ${selectedService.min_order}` : 'Enter quantity'}
                      className="pl-10 bg-deep-navy border-white/10 focus:border-electric-blue"
                      min={selectedService?.min_order || 1}
                      max={selectedService?.max_order || 1000000}
                      required
                      data-testid="order-quantity-input"
                    />
                  </div>
                  {selectedService && (
                    <p className="text-xs text-gray-500 mt-1">
                      Min: {selectedService.min_order.toLocaleString()} | Max: {selectedService.max_order.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Price Preview */}
                {selectedService && quantity && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="gradient-border p-6 text-center"
                  >
                    <div className="text-gray-400 mb-2">Total Cost</div>
                    <div className="text-4xl font-exo font-black text-electric-blue" data-testid="order-total-price">
                      ${calculatePrice()}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      {parseInt(quantity).toLocaleString()} × ${selectedService.rate}/1000
                    </div>
                  </motion.div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={submitting || !selectedService || !link || !quantity}
                  className="w-full bg-neon-green hover:bg-neon-green/90 text-black font-bold py-6 text-lg"
                  data-testid="order-submit-btn"
                >
                  {submitting ? (
                    <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <DollarSign size={20} className="mr-2" />
                      Place Order - ${calculatePrice()}
                    </>
                  )}
                </Button>

                {/* Info */}
                <div className="flex items-start gap-2 text-sm text-gray-500">
                  <AlertCircle size={16} className="mt-0.5 text-yellow-500" />
                  <p>Orders are processed automatically. Make sure your link is correct before placing the order.</p>
                </div>
              </form>
            )}
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default NewOrderPage;
