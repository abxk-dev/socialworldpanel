import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth, API } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import axios from 'axios';

const AdminTickets = () => {
  const { token, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await axios.get(`${API}/admin/tickets${params}`, { headers, withCredentials: true });
      // Handle both array and object response formats
      const ticketsData = Array.isArray(response.data) ? response.data : (response.data.tickets || []);
      setTickets(ticketsData);
    } catch (error) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, token]);

  const fetchTicketMessages = async (ticketId) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/tickets/${ticketId}`, { headers, withCredentials: true });
      setMessages(response.data.messages || []);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    await fetchTicketMessages(ticket.ticket_id);
  };

  const handleReply = async () => {
    if (!newMessage.trim()) return;
    setSubmitting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(
        `${API}/admin/tickets/${selectedTicket.ticket_id}/reply`,
        { message: newMessage },
        { headers, withCredentials: true }
      );
      setNewMessage('');
      await fetchTicketMessages(selectedTicket.ticket_id);
      fetchTickets();
    } catch (error) {
      toast.error('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${API}/admin/tickets/${ticketId}/close`, {}, { headers, withCredentials: true });
      toast.success('Ticket closed');
      fetchTickets();
      if (selectedTicket?.ticket_id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: 'closed' });
      }
    } catch (error) {
      toast.error('Failed to close ticket');
    }
  };

  const getStatusClass = (status) => {
    const classes = { open: 'status-pending', answered: 'status-completed', closed: 'status-cancelled' };
    return classes[status] || 'status-pending';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AdminLayout title="Ticket Management">
      <Toaster position="top-right" theme="dark" />
      
      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Tickets List */}
        <Card className="glass h-full flex flex-col border-cyber-purple/20">
          <div className="p-4 border-b border-cyber-purple/20 flex justify-between items-center">
            <h3 className="font-exo font-bold text-white">Tickets</h3>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 bg-transparent border-white/10 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-deep-navy border-white/10">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="answered">Answered</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-cyber-purple border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare size={40} className="mx-auto mb-4 opacity-50" />
                <p>No tickets</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.ticket_id}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                      selectedTicket?.ticket_id === ticket.ticket_id ? 'bg-cyber-purple/10' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-white truncate flex-1">{ticket.subject}</span>
                      <Badge className={`${getStatusClass(ticket.status)} capitalize ml-2`}>
                        {ticket.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="font-mono">{ticket.user_id}</span> • {formatDate(ticket.created_at)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Ticket Conversation */}
        <Card className="lg:col-span-2 glass h-full flex flex-col border-cyber-purple/20">
          {selectedTicket ? (
            <>
              <div className="p-4 border-b border-cyber-purple/20 flex justify-between items-center">
                <div>
                  <h3 className="font-exo font-bold text-white">{selectedTicket.subject}</h3>
                  <div className="text-sm text-gray-500">#{selectedTicket.ticket_id} • User: {selectedTicket.user_id}</div>
                </div>
                <div className="flex gap-2">
                  <Badge className={`${getStatusClass(selectedTicket.status)} capitalize`}>
                    {selectedTicket.status}
                  </Badge>
                  {selectedTicket.status !== 'closed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCloseTicket(selectedTicket.ticket_id)}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle size={14} className="mr-1" />
                      Close
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.message_id}
                    className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-xl p-4 ${
                      msg.is_admin 
                        ? 'bg-cyber-purple/20 border border-cyber-purple/30' 
                        : 'bg-white/5 border border-white/10'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${msg.is_admin ? 'text-cyber-purple' : 'text-gray-400'}`}>
                          {msg.is_admin ? 'You (Admin)' : 'User'}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(msg.created_at)}</span>
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedTicket.status !== 'closed' && (
                <div className="p-4 border-t border-cyber-purple/20">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1 bg-deep-navy border-white/10"
                      onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                    />
                    <Button
                      onClick={handleReply}
                      disabled={submitting || !newMessage.trim()}
                      className="bg-cyber-purple text-white"
                    >
                      <Send size={18} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a ticket to view</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminTickets;
