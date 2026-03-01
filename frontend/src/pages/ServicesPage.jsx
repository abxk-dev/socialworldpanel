import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Instagram, Youtube, Music, Twitter, Facebook, Send, Linkedin, ChevronDown } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';
import { API } from '../App';

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const platformIcons = {
    instagram: Instagram,
    youtube: Youtube,
    tiktok: Music,
    twitter: Twitter,
    facebook: Facebook,
    telegram: Send,
    linkedin: Linkedin,
    spotify: Music,
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, categoriesRes] = await Promise.all([
          axios.get(`${API}/services`),
          axios.get(`${API}/services/categories`)
        ]);
        setServices(servicesRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredServices = services.filter(service => {
    if (selectedCategory && service.category_id !== selectedCategory) return false;
    if (selectedPlatform && service.platform !== selectedPlatform) return false;
    if (search && !service.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const platforms = [...new Set(services.map(s => s.platform))];

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-exo font-bold mb-4">
            OUR <span className="neon-text">SERVICES</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Choose from 500+ services across all major social media platforms
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <Input
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-deep-navy border-white/10 focus:border-electric-blue"
              data-testid="services-search"
            />
          </div>

          {/* Platform Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedPlatform === null ? "default" : "outline"}
              onClick={() => setSelectedPlatform(null)}
              className={selectedPlatform === null ? "bg-electric-blue text-black" : "border-white/10"}
              data-testid="filter-all-platforms"
            >
              All Platforms
            </Button>
            {platforms.map(platform => {
              const Icon = platformIcons[platform] || Filter;
              return (
                <Button
                  key={platform}
                  variant={selectedPlatform === platform ? "default" : "outline"}
                  onClick={() => setSelectedPlatform(platform)}
                  className={selectedPlatform === platform ? "bg-electric-blue text-black" : "border-white/10"}
                  data-testid={`filter-${platform}`}
                >
                  <Icon size={16} className="mr-1" />
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <Card className="glass p-4 sticky top-24">
              <h3 className="font-exo font-bold text-white mb-4">Categories</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === null 
                      ? 'bg-electric-blue/20 text-electric-blue' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  data-testid="category-all"
                >
                  All Categories
                </button>
                {categories.map(cat => {
                  const Icon = platformIcons[cat.platform] || ChevronDown;
                  return (
                    <button
                      key={cat.category_id}
                      onClick={() => setSelectedCategory(cat.category_id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        selectedCategory === cat.category_id 
                          ? 'bg-electric-blue/20 text-electric-blue' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                      data-testid={`category-${cat.category_id}`}
                    >
                      <Icon size={16} />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Services Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full"></div>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                No services found. Try different filters.
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredServices.map((service, idx) => {
                  const PlatformIcon = platformIcons[service.platform] || Filter;
                  return (
                    <motion.div
                      key={service.service_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      <Card 
                        className="glass p-4 hover:border-electric-blue/50 transition-all"
                        data-testid={`service-${service.service_id}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center platform-${service.platform}`}>
                              <PlatformIcon size={20} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-white">{service.name}</h3>
                                {service.is_new && <Badge className="bg-neon-green/20 text-neon-green border-0">NEW</Badge>}
                                {service.is_popular && <Badge className="bg-electric-blue/20 text-electric-blue border-0">POPULAR</Badge>}
                              </div>
                              <p className="text-sm text-gray-500 mt-1">{service.description || 'High quality service'}</p>
                              <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
                                <span>Min: {service.min_order.toLocaleString()}</span>
                                <span>Max: {service.max_order.toLocaleString()}</span>
                                {service.avg_time && <span>Time: {service.avg_time}</span>}
                                {service.is_refillable && <Badge variant="outline" className="border-neon-green/30 text-neon-green text-xs">Refill</Badge>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-2xl font-exo font-bold text-electric-blue">${service.rate}</div>
                              <div className="text-xs text-gray-500">per 1000</div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ServicesPage;
