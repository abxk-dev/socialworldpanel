import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth } from '../../App';
import { API } from '../../config';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import api from '../../lib/axios';
import BulkActionsBar from '../../components/admin/BulkActionsBar';
import { useBulkSelection } from '../../hooks/useBulkSelection';

const AdminTickets = () => {
  const { token, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const bulk = useBulkSelection();

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await api.get('/admin/tickets' + params, { headers, withCredentials: true });
      // Handle both array and object response formats
      const ticketsData = Array.isArray(response.data) ? response.data : (response.data.tickets || []);
      const normalized = ticketsData.map((t) => ({
        ...t,
        ticket_id: t.ticket_id || t._id,
      }));
      setTickets(normalized);
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
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const response = await api.get('/admin/tickets/' + ticketId, { headers, withCredentials: true });
      const data = response.data || {};
      const rows = Array.isArray(data?.messages) ? data.messages : [];
      const normalized = rows.map((r, i) => ({
        message_id: r.message_id || `msg_${i}_${r.created_at || i}`,
        is_admin: r.is_admin === true,
        message: r.message,
        created_at: r.created_at,
      }));
      setMessages(normalized);
    } catch (error) {
      toast.error('Failed to load messages');
      setMessages([]);
    }
  };

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    await fetchTicketMessages(ticket.ticket_id || ticket._id);
    fetchTickets();
  };

  const handleReply = async () => {
    if (!newMessage.trim()) return;
    setSubmitting(true);
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      await api.post(
        '/admin/tickets/' + selectedTicket.ticket_id + '/reply',
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
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      await api.put('/admin/tickets/' + ticketId + '/close', {}, { headers, withCredentials: true });
      toast.success('Ticket closed');
      fetchTickets();
      if (selectedTicket?.ticket_id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: 'closed' });
      }
    } catch (error) {
      const msg = error.response?.data?.detail || error.response?.data?.error || 'Failed to close ticket';
      toast.error(msg);
    }
  };

  const getStatusClass = (status) => {
    const classes = { open: 'status-pending', answered: 'status-completed', closed: 'status-cancelled' };
    return classes[status] || 'status-pending';
  };

  const isAwaitingAdmin = (ticket) => {
    if (!ticket) return false;
    if (ticket.status === 'closed') return false;
    if (ticket.awaiting_admin === true) return true;
    const replies = Array.isArray(ticket.replies) ? ticket.replies : [];
    if (replies.length === 0) return true;
    const last = replies[replies.length - 1];
    return last?.is_admin !== true;
  };

  const counts = React.useMemo(() => {
    const open = tickets.filter(t => t.status === 'open').length;
    const answered = tickets.filter(t => t.status === 'answered').length;
    const awaiting = tickets.filter(isAwaitingAdmin).length;
    return { open, answered, awaiting };
  }, [tickets]);

  /** Show ticket ID as 3–4 digit number only (handles legacy tkt_xxx by hashing to 100–9999). */
  const formatTicketIdDisplay = (id) => {
    if (id == null) return '—';
    const n = Number(id);
    if (!Number.isNaN(n) && n >= 1 && n <= 99999) return String(Math.round(n));
    if (typeof id === 'string' && id.startsWith('tkt_')) {
      const hash = String(id).split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0) | 0, 0);
      return String(100 + Math.abs(hash) % 9900);
    }
    if (typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)) {
      const hash = String(id).split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0) | 0, 0);
      return String(100 + Math.abs(hash) % 9900);
    }
    return String(id);
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label="Select all tickets"
                checked={tickets.length > 0 && tickets.every((t) => bulk.isSelected(t.ticket_id))}
                onChange={(e) => bulk.setMany(tickets.map((t) => t.ticket_id), e.target.checked)}
              />
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
          </div>
          <div className="p-4 border-b border-white/5">
            <BulkActionsBar
              type="tickets"
              selectedIds={bulk.selectedIds}
              onClear={bulk.clear}
              onApplied={fetchTickets}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {!loading && tickets.length > 0 && (
              <div className="px-4 py-3 border-b border-white/5 text-xs text-gray-400 flex items-center gap-3">
                <span>New/Unanswered: <span className="text-white font-bold">{counts.awaiting}</span></span>
                <span>Open: <span className="text-white font-bold">{counts.open}</span></span>
                <span>Answered: <span className="text-white font-bold">{counts.answered}</span></span>
              </div>
            )}
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
                    className={
                      'w-full p-4 text-left hover:bg-white/5 transition-colors ' +
                      (selectedTicket?.ticket_id === ticket.ticket_id ? 'bg-cyber-purple/10 ' : '') +
                      (isAwaitingAdmin(ticket) ? 'ring-1 ring-electric-blue/30 bg-electric-blue/5 ' : '')
                    }
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          aria-label={'Select ' + ticket.ticket_id}
                          checked={bulk.isSelected(ticket.ticket_id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => bulk.toggleOne(ticket.ticket_id)}
                        />
                        <span className="font-medium text-white truncate flex-1">{ticket.subject}</span>
                      </div>
                      <Badge className={getStatusClass(ticket.status) + ' capitalize ml-2'}>
                        {ticket.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="text-gray-400" title="Username / user">
                        {ticket.user_name || ticket.user_username || ticket.user_email || ticket.user_id || '—'}
                      </span>
                      {' • '}{formatDate(ticket.created_at)}
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
                  <div className="text-sm text-gray-500">
                    <span className="text-gray-400">Ticket #</span><span className="text-white font-mono">{formatTicketIdDisplay(selectedTicket.ticket_id)}</span>
                    {' • '}<span className="text-gray-400">Username:</span>{' '}
                    <span className="text-gray-300">{selectedTicket.user_name || selectedTicket.user_username || selectedTicket.user_email || selectedTicket.user_id || '—'}</span>
                    {(selectedTicket.user_email && selectedTicket.user_email !== (selectedTicket.user_name || selectedTicket.user_username)) && (
                      <span className="text-gray-500 text-xs ml-1">({selectedTicket.user_email})</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className={getStatusClass(selectedTicket.status) + ' capitalize'}>
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
                    className={'flex ' + (msg.is_admin ? 'justify-end' : 'justify-start')}
                  >
                    <div className={'max-w-[80%] rounded-xl p-4 ' + (msg.is_admin ? 'bg-cyber-purple/20 border border-cyber-purple/30' : 'bg-white/5 border border-white/10')}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={'text-xs font-bold ' + (msg.is_admin ? 'text-cyber-purple' : 'text-gray-400')}>
                          {msg.is_admin ? 'You (Admin)' : (selectedTicket?.user_name || selectedTicket?.user_username || selectedTicket?.user_email || 'User')}
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
