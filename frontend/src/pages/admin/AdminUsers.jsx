import React, { useState, useEffect } from 'react';
import { Search, Edit, UserX, UserCheck, DollarSign } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth, API } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import axios from 'axios';

const AdminUsers = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      
      const response = await axios.get(`${API}/admin/users?${params}`, { headers, withCredentials: true });
      setUsers(response.data.users || []);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, token]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleUpdateUser = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const updateData = { ...editingUser };
      if (balanceAmount) {
        updateData.balance = parseFloat(balanceAmount);
      }
      await axios.put(`${API}/admin/users/${editingUser.user_id}`, updateData, { headers, withCredentials: true });
      toast.success('User updated');
      setEditOpen(false);
      setEditingUser(null);
      setBalanceAmount('');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${API}/admin/users/${user.user_id}`, { is_active: !user.is_active }, { headers, withCredentials: true });
      toast.success(user.is_active ? 'User suspended' : 'User activated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <AdminLayout title="User Management">
      <Toaster position="top-right" theme="dark" />
      
      <div className="space-y-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email or name..."
              className="pl-10 bg-deep-navy border-white/10"
            />
          </div>
          <Button type="submit" className="bg-cyber-purple text-white">Search</Button>
        </form>

        {/* Users Table */}
        <Card className="glass overflow-hidden border-cyber-purple/20">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-cyber-purple border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-cyber-purple/10">
                    <tr>
                      <th className="text-left p-4 text-gray-400 font-medium">User</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Email</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Balance</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Role</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Joined</th>
                      <th className="text-center p-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.user_id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
                              {user.picture ? (
                                <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
                              ) : (
                                <span className="text-white font-bold">{user.name?.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <div className="text-white font-medium">{user.name}</div>
                              <div className="text-xs text-gray-500 font-mono">{user.user_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-gray-400">{user.email}</td>
                        <td className="p-4 text-right text-electric-blue font-bold">${user.balance?.toFixed(2)}</td>
                        <td className="p-4">
                          <Badge className={user.role === 'admin' ? 'bg-cyber-purple/20 text-cyber-purple' : 'bg-white/10 text-white'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={user.is_active ? 'status-completed' : 'status-cancelled'}>
                            {user.is_active ? 'Active' : 'Suspended'}
                          </Badge>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(user.created_at)}</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingUser(user); setBalanceAmount(String(user.balance)); setEditOpen(true); }}
                              className="text-gray-400 hover:text-white"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleStatus(user)}
                              className={user.is_active ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-neon-green'}
                            >
                              {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-white/5 flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Page {page} of {totalPages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-white/10">
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="border-white/10">
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="glass border-cyber-purple/30">
            <DialogHeader>
              <DialogTitle className="font-exo">Edit User</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                    className="mt-2 bg-deep-navy border-white/10"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    className="mt-2 bg-deep-navy border-white/10"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <DollarSign size={16} />
                    Balance
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    className="mt-2 bg-deep-navy border-white/10"
                  />
                </div>
                <Button onClick={handleUpdateUser} className="w-full bg-cyber-purple text-white">
                  Update User
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
