import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Layers, Plus, Edit, Trash2, Loader2, GripVertical,
  Instagram, Youtube, Music2, Twitter, Facebook, Send, Linkedin, Globe
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth, API } from '../../App';
import axios from 'axios';
import { toast } from 'sonner';

const PLATFORM_ICONS = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  twitter: Twitter,
  facebook: Facebook,
  telegram: Send,
  spotify: Music2,
  linkedin: Linkedin,
  globe: Globe
};

const ICON_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'globe', label: 'Other' }
];

const COLOR_OPTIONS = [
  { value: '#E1306C', label: 'Instagram Pink' },
  { value: '#FF0000', label: 'YouTube Red' },
  { value: '#00F2EA', label: 'TikTok Cyan' },
  { value: '#1DA1F2', label: 'Twitter Blue' },
  { value: '#1877F2', label: 'Facebook Blue' },
  { value: '#0088CC', label: 'Telegram Blue' },
  { value: '#1DB954', label: 'Spotify Green' },
  { value: '#0A66C2', label: 'LinkedIn Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#F59E0B', label: 'Orange' },
  { value: '#10B981', label: 'Green' },
  { value: '#EF4444', label: 'Red' }
];

const AdminPlatforms = () => {
  const { token } = useAuth();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: 'globe',
    color: '#8B5CF6',
    order: 99,
    is_active: true
  });

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchPlatforms = async () => {
    try {
      const res = await axios.get(`${API}/admin/platforms`, { headers, withCredentials: true });
      setPlatforms(res.data || []);
    } catch (error) {
      toast.error('Failed to fetch platforms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlatform) {
        await axios.put(`${API}/admin/platforms/${editingPlatform.platform_id}`, formData, { headers, withCredentials: true });
        toast.success('Platform updated');
      } else {
        await axios.post(`${API}/admin/platforms`, formData, { headers, withCredentials: true });
        toast.success('Platform created');
      }
      setShowModal(false);
      resetForm();
      fetchPlatforms();
    } catch (error) {
      toast.error('Failed to save platform');
    }
  };

  const handleDelete = async (platformId) => {
    if (!confirm('Delete this platform? This will also remove its category.')) return;
    try {
      await axios.delete(`${API}/admin/platforms/${platformId}`, { headers, withCredentials: true });
      toast.success('Platform deleted');
      fetchPlatforms();
    } catch (error) {
      toast.error('Failed to delete platform');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', slug: '', icon: 'globe', color: '#8B5CF6', order: 99, is_active: true });
    setEditingPlatform(null);
  };

  const openEditModal = (platform) => {
    setEditingPlatform(platform);
    setFormData({
      name: platform.name,
      slug: platform.slug,
      icon: platform.icon,
      color: platform.color,
      order: platform.order,
      is_active: platform.is_active
    });
    setShowModal(true);
  };

  const getIconComponent = (iconName) => {
    const Icon = PLATFORM_ICONS[iconName] || Globe;
    return Icon;
  };

  if (loading) {
    return (
      <AdminLayout title="Platforms">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-cyber-purple animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Platforms">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-400 text-sm">Manage social media platforms and categories</p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-cyber-purple hover:bg-cyber-purple/80">
            <Plus size={18} className="mr-2" />
            Add Platform
          </Button>
        </div>

        {/* Platforms Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {platforms.length === 0 ? (
            <Card className="col-span-full glass p-12 border-cyber-purple/20 text-center">
              <Layers size={48} className="mx-auto mb-4 text-gray-500" />
              <p className="text-gray-500">No platforms configured. Add your first platform.</p>
            </Card>
          ) : (
            platforms.map((platform, idx) => {
              const IconComponent = getIconComponent(platform.icon);
              return (
                <motion.div
                  key={platform.platform_id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="glass p-4 border-cyber-purple/20 hover:border-cyber-purple/40 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${platform.color}20` }}
                      >
                        <IconComponent size={24} style={{ color: platform.color }} />
                      </div>
                      <Badge className={platform.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}>
                        {platform.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <h3 className="text-white font-bold mb-1">{platform.name}</h3>
                    <p className="text-gray-500 text-sm font-mono mb-3">{platform.slug}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">Order: {platform.order}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(platform)}>
                          <Edit size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400" onClick={() => handleDelete(platform.platform_id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Add/Edit Platform Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="glass border-cyber-purple/30 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="font-exo">{editingPlatform ? 'Edit Platform' : 'Add Platform'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Platform Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    name: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')
                  })}
                  placeholder="e.g., Instagram"
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
              
              <div>
                <Label>Slug (URL-safe name)</Label>
                <Input 
                  value={formData.slug} 
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  placeholder="e.g., instagram"
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Icon</Label>
                  <Select 
                    value={formData.icon} 
                    onValueChange={(val) => setFormData({ ...formData, icon: val })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Color</Label>
                  <Select 
                    value={formData.color} 
                    onValueChange={(val) => setFormData({ ...formData, color: val })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: formData.color }}></div>
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: opt.value }}></div>
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Display Order</Label>
                <Input 
                  type="number" 
                  value={formData.order} 
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch 
                  checked={formData.is_active} 
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              
              {/* Preview */}
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Preview</p>
                <div className="flex items-center gap-3">
                  {(() => {
                    const IconComponent = getIconComponent(formData.icon);
                    return (
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${formData.color}20` }}
                      >
                        <IconComponent size={20} style={{ color: formData.color }} />
                      </div>
                    );
                  })()}
                  <span className="text-white font-medium">{formData.name || 'Platform Name'}</span>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-cyber-purple hover:bg-cyber-purple/80">
                  {editingPlatform ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPlatforms;
