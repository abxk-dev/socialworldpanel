import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Gift, Plus, Edit, Trash2, Save, Loader2, Calendar, 
  DollarSign, Percent, CreditCard, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth, API } from '../../App';
import axios from 'axios';
import { toast } from 'sonner';

const AdminBonuses = () => {
  const { token } = useAuth();
  const [tiers, setTiers] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [settings, setSettings] = useState({
    enabled: true,
    first_deposit_bonus: false,
    first_deposit_percent: 10,
    first_deposit_min: 10
  });
  const [loading, setLoading] = useState(true);
  const [showTierModal, setShowTierModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [editingPromo, setEditingPromo] = useState(null);
  const [saving, setSaving] = useState(false);

  const [tierForm, setTierForm] = useState({
    min_amount: '',
    max_amount: '',
    bonus_percent: '',
    is_active: true
  });

  const [promoForm, setPromoForm] = useState({
    title: '',
    bonus_percent: '',
    min_deposit: '',
    max_bonus: '',
    start_date: '',
    end_date: '',
    is_active: true
  });

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchData = async () => {
    try {
      const [tiersRes, promosRes, settingsRes] = await Promise.all([
        axios.get(`${API}/admin/bonus/tiers`, { headers, withCredentials: true }),
        axios.get(`${API}/admin/bonus/promotions`, { headers, withCredentials: true }),
        axios.get(`${API}/admin/bonus/settings`, { headers, withCredentials: true })
      ]);
      setTiers(tiersRes.data);
      setPromotions(promosRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      toast.error('Failed to fetch bonus data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/bonus/settings`, settings, { headers, withCredentials: true });
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTierSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTier) {
        await axios.put(`${API}/admin/bonus/tiers/${editingTier.tier_id}`, tierForm, { headers, withCredentials: true });
        toast.success('Tier updated');
      } else {
        await axios.post(`${API}/admin/bonus/tiers`, tierForm, { headers, withCredentials: true });
        toast.success('Tier created');
      }
      setShowTierModal(false);
      resetTierForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save tier');
    }
  };

  const handlePromoSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...promoForm,
        start_date: new Date(promoForm.start_date).toISOString(),
        end_date: new Date(promoForm.end_date).toISOString()
      };
      if (editingPromo) {
        await axios.put(`${API}/admin/bonus/promotions/${editingPromo.promo_id}`, data, { headers, withCredentials: true });
        toast.success('Promotion updated');
      } else {
        await axios.post(`${API}/admin/bonus/promotions`, data, { headers, withCredentials: true });
        toast.success('Promotion created');
      }
      setShowPromoModal(false);
      resetPromoForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save promotion');
    }
  };

  const deleteTier = async (tierId) => {
    if (!confirm('Delete this tier?')) return;
    try {
      await axios.delete(`${API}/admin/bonus/tiers/${tierId}`, { headers, withCredentials: true });
      toast.success('Tier deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete tier');
    }
  };

  const deletePromo = async (promoId) => {
    if (!confirm('Delete this promotion?')) return;
    try {
      await axios.delete(`${API}/admin/bonus/promotions/${promoId}`, { headers, withCredentials: true });
      toast.success('Promotion deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete promotion');
    }
  };

  const resetTierForm = () => {
    setTierForm({ min_amount: '', max_amount: '', bonus_percent: '', is_active: true });
    setEditingTier(null);
  };

  const resetPromoForm = () => {
    setPromoForm({ title: '', bonus_percent: '', min_deposit: '', max_bonus: '', start_date: '', end_date: '', is_active: true });
    setEditingPromo(null);
  };

  const openEditTier = (tier) => {
    setEditingTier(tier);
    setTierForm({
      min_amount: tier.min_amount,
      max_amount: tier.max_amount,
      bonus_percent: tier.bonus_percent,
      is_active: tier.is_active
    });
    setShowTierModal(true);
  };

  const openEditPromo = (promo) => {
    setEditingPromo(promo);
    setPromoForm({
      title: promo.title,
      bonus_percent: promo.bonus_percent,
      min_deposit: promo.min_deposit,
      max_bonus: promo.max_bonus || '',
      start_date: promo.start_date?.slice(0, 16) || '',
      end_date: promo.end_date?.slice(0, 16) || '',
      is_active: promo.is_active
    });
    setShowPromoModal(true);
  };

  const isPromoActive = (promo) => {
    if (!promo.is_active) return false;
    const now = new Date();
    const start = new Date(promo.start_date);
    const end = new Date(promo.end_date);
    return now >= start && now <= end;
  };

  if (loading) {
    return (
      <AdminLayout title="Bonus Management">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-cyber-purple animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Bonus Management">
      <div className="space-y-6">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="settings" className="data-[state=active]:bg-cyber-purple">Settings</TabsTrigger>
            <TabsTrigger value="tiers" className="data-[state=active]:bg-cyber-purple">Deposit Tiers</TabsTrigger>
            <TabsTrigger value="promotions" className="data-[state=active]:bg-cyber-purple">Promotions</TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass p-6 border-cyber-purple/20">
                <h3 className="text-lg font-exo font-bold text-white mb-6">Bonus System Settings</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Enable Bonus System</h4>
                      <p className="text-gray-400 text-sm">Turn the entire bonus system on or off</p>
                    </div>
                    <Switch 
                      checked={settings.enabled}
                      onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">First Deposit Bonus</h4>
                      <p className="text-gray-400 text-sm">Extra bonus on user's first deposit only</p>
                    </div>
                    <Switch 
                      checked={settings.first_deposit_bonus}
                      onCheckedChange={(checked) => setSettings({ ...settings, first_deposit_bonus: checked })}
                    />
                  </div>

                  {settings.first_deposit_bonus && (
                    <div className="grid md:grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg">
                      <div>
                        <Label>First Deposit Bonus %</Label>
                        <Input 
                          type="number"
                          value={settings.first_deposit_percent}
                          onChange={(e) => setSettings({ ...settings, first_deposit_percent: Number(e.target.value) })}
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                      <div>
                        <Label>Minimum Deposit for First Bonus ($)</Label>
                        <Input 
                          type="number"
                          value={settings.first_deposit_min}
                          onChange={(e) => setSettings({ ...settings, first_deposit_min: Number(e.target.value) })}
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                    </div>
                  )}

                  <Button onClick={saveSettings} disabled={saving} className="bg-cyber-purple hover:bg-cyber-purple/80">
                    {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                    Save Settings
                  </Button>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Tiers Tab */}
          <TabsContent value="tiers" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-exo font-bold text-white">Deposit Bonus Tiers</h3>
                  <p className="text-gray-400 text-sm">Set bonus percentages based on deposit amounts</p>
                </div>
                <Button onClick={() => { resetTierForm(); setShowTierModal(true); }} className="bg-cyber-purple hover:bg-cyber-purple/80">
                  <Plus size={18} className="mr-2" />
                  Add Tier
                </Button>
              </div>

              <Card className="glass border-cyber-purple/20 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-cyber-purple/20">
                      <TableHead className="text-gray-400">Min Amount</TableHead>
                      <TableHead className="text-gray-400">Max Amount</TableHead>
                      <TableHead className="text-gray-400">Bonus %</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-12">
                          No tiers configured. Add your first tier.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tiers.map((tier) => (
                        <TableRow key={tier.tier_id} className="border-cyber-purple/10 hover:bg-white/5">
                          <TableCell className="text-white font-bold">${tier.min_amount}</TableCell>
                          <TableCell className="text-white font-bold">${tier.max_amount}</TableCell>
                          <TableCell>
                            <Badge className="bg-neon-green/20 text-neon-green">
                              +{tier.bonus_percent}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={tier.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}>
                              {tier.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEditTier(tier)}>
                              <Edit size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-400" onClick={() => deleteTier(tier.tier_id)}>
                              <Trash2 size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Promotions Tab */}
          <TabsContent value="promotions" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-exo font-bold text-white">Time-Limited Promotions</h3>
                  <p className="text-gray-400 text-sm">Create special bonus promotions with start/end dates</p>
                </div>
                <Button onClick={() => { resetPromoForm(); setShowPromoModal(true); }} className="bg-cyber-purple hover:bg-cyber-purple/80">
                  <Plus size={18} className="mr-2" />
                  Add Promotion
                </Button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {promotions.length === 0 ? (
                  <Card className="glass p-8 border-cyber-purple/20 col-span-full text-center text-gray-500">
                    No promotions yet. Create your first promotion.
                  </Card>
                ) : (
                  promotions.map((promo) => (
                    <Card key={promo.promo_id} className={`glass p-4 border-cyber-purple/20 ${isPromoActive(promo) ? 'ring-2 ring-neon-green' : ''}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-white font-bold">{promo.title}</h4>
                          <Badge className={isPromoActive(promo) ? 'bg-neon-green/20 text-neon-green' : 'bg-gray-500/20 text-gray-400'}>
                            {isPromoActive(promo) ? 'ACTIVE' : promo.is_active ? 'Scheduled' : 'Inactive'}
                          </Badge>
                        </div>
                        <span className="text-2xl font-exo font-bold text-neon-green">+{promo.bonus_percent}%</span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <DollarSign size={14} />
                          <span>Min: ${promo.min_deposit}</span>
                          {promo.max_bonus && <span>| Max: ${promo.max_bonus}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          <span>{new Date(promo.start_date).toLocaleDateString()} - {new Date(promo.end_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="ghost" size="sm" onClick={() => openEditPromo(promo)}>
                          <Edit size={14} className="mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400" onClick={() => deletePromo(promo.promo_id)}>
                          <Trash2 size={14} className="mr-1" /> Delete
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Tier Modal */}
        <Dialog open={showTierModal} onOpenChange={setShowTierModal}>
          <DialogContent className="glass border-cyber-purple/30 text-white">
            <DialogHeader>
              <DialogTitle className="font-exo">{editingTier ? 'Edit Tier' : 'Add Tier'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleTierSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Amount ($)</Label>
                  <Input 
                    type="number"
                    value={tierForm.min_amount}
                    onChange={(e) => setTierForm({ ...tierForm, min_amount: Number(e.target.value) })}
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>
                <div>
                  <Label>Max Amount ($)</Label>
                  <Input 
                    type="number"
                    value={tierForm.max_amount}
                    onChange={(e) => setTierForm({ ...tierForm, max_amount: Number(e.target.value) })}
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Bonus Percentage (%)</Label>
                <Input 
                  type="number"
                  value={tierForm.bonus_percent}
                  onChange={(e) => setTierForm({ ...tierForm, bonus_percent: Number(e.target.value) })}
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch 
                  checked={tierForm.is_active}
                  onCheckedChange={(checked) => setTierForm({ ...tierForm, is_active: checked })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setShowTierModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-cyber-purple hover:bg-cyber-purple/80">
                  {editingTier ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Promotion Modal */}
        <Dialog open={showPromoModal} onOpenChange={setShowPromoModal}>
          <DialogContent className="glass border-cyber-purple/30 text-white">
            <DialogHeader>
              <DialogTitle className="font-exo">{editingPromo ? 'Edit Promotion' : 'Add Promotion'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePromoSubmit} className="space-y-4">
              <div>
                <Label>Promotion Title</Label>
                <Input 
                  value={promoForm.title}
                  onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                  placeholder="Summer Sale Bonus"
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bonus Percentage (%)</Label>
                  <Input 
                    type="number"
                    value={promoForm.bonus_percent}
                    onChange={(e) => setPromoForm({ ...promoForm, bonus_percent: Number(e.target.value) })}
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>
                <div>
                  <Label>Min Deposit ($)</Label>
                  <Input 
                    type="number"
                    value={promoForm.min_deposit}
                    onChange={(e) => setPromoForm({ ...promoForm, min_deposit: Number(e.target.value) })}
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Max Bonus (optional)</Label>
                <Input 
                  type="number"
                  value={promoForm.max_bonus}
                  onChange={(e) => setPromoForm({ ...promoForm, max_bonus: e.target.value ? Number(e.target.value) : '' })}
                  placeholder="Leave empty for no limit"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input 
                    type="datetime-local"
                    value={promoForm.start_date}
                    onChange={(e) => setPromoForm({ ...promoForm, start_date: e.target.value })}
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input 
                    type="datetime-local"
                    value={promoForm.end_date}
                    onChange={(e) => setPromoForm({ ...promoForm, end_date: e.target.value })}
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch 
                  checked={promoForm.is_active}
                  onCheckedChange={(checked) => setPromoForm({ ...promoForm, is_active: checked })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setShowPromoModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-cyber-purple hover:bg-cyber-purple/80">
                  {editingPromo ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminBonuses;
