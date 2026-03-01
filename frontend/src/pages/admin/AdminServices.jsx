import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth, API } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import axios from 'axios';

const AdminServices = () => {
  const { token } = useAuth();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [newService, setNewService] = useState({
    name: '', category_id: '', platform: 'instagram', rate: 0, min_order: 100, max_order: 10000, description: '', is_active: true
  });

  const fetchData = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [srvRes, catRes] = await Promise.all([
        axios.get(`${API}/services`, { headers, withCredentials: true }),
        axios.get(`${API}/services/categories`, { headers, withCredentials: true })
      ]);
      setServices(srvRes.data);
      setCategories(catRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateService = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/admin/services`, newService, { headers, withCredentials: true });
      toast.success('Service created');
      setEditOpen(false);
      setNewService({ name: '', category_id: '', platform: 'instagram', rate: 0, min_order: 100, max_order: 10000, description: '', is_active: true });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create service');
    }
  };

  const handleUpdateService = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${API}/admin/services/${editingService.service_id}`, editingService, { headers, withCredentials: true });
      toast.success('Service updated');
      setEditOpen(false);
      setEditingService(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update service');
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`${API}/admin/services/${serviceId}`, { headers, withCredentials: true });
      toast.success('Service deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const platforms = ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'telegram', 'spotify', 'linkedin'];

  return (
    <AdminLayout title="Service Management">
      <Toaster position="top-right" theme="dark" />
      
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="pl-10 bg-deep-navy border-white/10"
            />
          </div>
          <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingService(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-cyber-purple text-white" data-testid="add-service-btn">
                <Plus size={18} className="mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-cyber-purple/30 max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-exo">{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editingService?.name || newService.name}
                    onChange={(e) => editingService ? setEditingService({...editingService, name: e.target.value}) : setNewService({...newService, name: e.target.value})}
                    className="mt-2 bg-deep-navy border-white/10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Platform</Label>
                    <Select 
                      value={editingService?.platform || newService.platform}
                      onValueChange={(val) => editingService ? setEditingService({...editingService, platform: val}) : setNewService({...newService, platform: val})}
                    >
                      <SelectTrigger className="mt-2 bg-deep-navy border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-deep-navy border-white/10">
                        {platforms.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select 
                      value={editingService?.category_id || newService.category_id}
                      onValueChange={(val) => editingService ? setEditingService({...editingService, category_id: val}) : setNewService({...newService, category_id: val})}
                    >
                      <SelectTrigger className="mt-2 bg-deep-navy border-white/10">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-deep-navy border-white/10">
                        {categories.map(c => <SelectItem key={c.category_id} value={c.category_id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Rate per 1000</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingService?.rate || newService.rate}
                      onChange={(e) => editingService ? setEditingService({...editingService, rate: parseFloat(e.target.value)}) : setNewService({...newService, rate: parseFloat(e.target.value)})}
                      className="mt-2 bg-deep-navy border-white/10"
                    />
                  </div>
                  <div>
                    <Label>Min Order</Label>
                    <Input
                      type="number"
                      value={editingService?.min_order || newService.min_order}
                      onChange={(e) => editingService ? setEditingService({...editingService, min_order: parseInt(e.target.value)}) : setNewService({...newService, min_order: parseInt(e.target.value)})}
                      className="mt-2 bg-deep-navy border-white/10"
                    />
                  </div>
                  <div>
                    <Label>Max Order</Label>
                    <Input
                      type="number"
                      value={editingService?.max_order || newService.max_order}
                      onChange={(e) => editingService ? setEditingService({...editingService, max_order: parseInt(e.target.value)}) : setNewService({...newService, max_order: parseInt(e.target.value)})}
                      className="mt-2 bg-deep-navy border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={editingService?.description || newService.description}
                    onChange={(e) => editingService ? setEditingService({...editingService, description: e.target.value}) : setNewService({...newService, description: e.target.value})}
                    className="mt-2 bg-deep-navy border-white/10"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={editingService?.is_active ?? newService.is_active}
                    onCheckedChange={(val) => editingService ? setEditingService({...editingService, is_active: val}) : setNewService({...newService, is_active: val})}
                  />
                </div>
                <Button
                  onClick={editingService ? handleUpdateService : handleCreateService}
                  className="w-full bg-cyber-purple text-white"
                >
                  {editingService ? 'Update Service' : 'Create Service'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Services Table */}
        <Card className="glass overflow-hidden border-cyber-purple/20">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-cyber-purple border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-cyber-purple/10">
                  <tr>
                    <th className="text-left p-4 text-gray-400 font-medium">Service</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Platform</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Rate</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Min/Max</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                    <th className="text-center p-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((service) => (
                    <tr key={service.service_id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <div className="text-white font-medium">{service.name}</div>
                        <div className="text-xs text-gray-500">{service.service_id}</div>
                      </td>
                      <td className="p-4 text-gray-400 capitalize">{service.platform}</td>
                      <td className="p-4 text-right text-electric-blue font-bold">${service.rate}</td>
                      <td className="p-4 text-right text-gray-400 text-sm">
                        {service.min_order.toLocaleString()} - {service.max_order.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <Badge className={service.is_active ? 'status-completed' : 'status-cancelled'}>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setEditingService(service); setEditOpen(true); }}
                            className="text-gray-400 hover:text-white"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteService(service.service_id)}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminServices;
