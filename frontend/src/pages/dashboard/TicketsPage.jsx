import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageSquare, Send } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth, API } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import axios from 'axios';

const TicketsPage = () => {
  const { token, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/tickets`, { headers, withCredentials: true });
      setTickets(response.data || []);
    } catch (error) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

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

  const handleCreateTicket = async () => {
    if (!newSubject || !newContent) {
      toast.error('Please fill all fields');
      return;
    }

    setSubmitting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(
        `${API}/tickets`,
        { subject: newSubject, message: newContent },
        { headers, withCredentials: true }
      );
      toast.success('Ticket created successfully');
      setCreateOpen(false);
      setNewSubject('');
      setNewContent('');
      fetchTickets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!newMessage.trim()) return;

    setSubmitting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(
        `${API}/tickets/${selectedTicket.ticket_id}/reply`,
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

  const getStatusClass = (status) => {
    const classes = {
      open: 'status-pending',
      answered: 'status-completed',
      closed: 'status-cancelled'
    };
    return classes[status] || 'status-pending';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DashboardLayout title="Support Tickets">
      <Toaster position="top-right" theme="dark" />
      
      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Tickets List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <Card className="glass h-full flex flex-col">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-exo font-bold text-white">Tickets</h3>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-electric-blue text-black" data-testid="create-ticket-btn">
                    <Plus size={16} className="mr-1" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass border-white/10">
                  <DialogHeader>
                    <DialogTitle className="font-exo">Create New Ticket</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-gray-400">Subject</Label>
                      <Input
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="What do you need help with?"
                        className="mt-2 bg-deep-navy border-white/10"
                        data-testid="ticket-subject"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400">Message</Label>
                      <Textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Describe your issue in detail..."
                        className="mt-2 bg-deep-navy border-white/10 min-h-[120px]"
                        data-testid="ticket-message"
                      />
                    </div>
                    <Button
                      onClick={handleCreateTicket}
                      disabled={submitting}
                      className="w-full bg-neon-green text-black"
                      data-testid="submit-ticket"
                    >
                      {submitting ? 'Creating...' : 'Create Ticket'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare size={40} className="mx-auto mb-4 opacity-50" />
                  <p>No tickets yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.ticket_id}
                      onClick={() => handleSelectTicket(ticket)}
                      className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                        selectedTicket?.ticket_id === ticket.ticket_id ? 'bg-electric-blue/10' : ''
                      }`}
                      data-testid={`ticket-${ticket.ticket_id}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-white truncate flex-1">{ticket.subject}</span>
                        <Badge className={`${getStatusClass(ticket.status)} capitalize ml-2`}>
                          {ticket.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(ticket.created_at)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Ticket Conversation */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <Card className="glass h-full flex flex-col">
            {selectedTicket ? (
              <>
                <div className="p-4 border-b border-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-exo font-bold text-white">{selectedTicket.subject}</h3>
                      <div className="text-sm text-gray-500">#{selectedTicket.ticket_id}</div>
                    </div>
                    <Badge className={`${getStatusClass(selectedTicket.status)} capitalize`}>
                      {selectedTicket.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.message_id}
                      className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[80%] rounded-xl p-4 ${
                        msg.is_admin 
                          ? 'bg-cyber-purple/20 border border-cyber-purple/30' 
                          : 'bg-electric-blue/20 border border-electric-blue/30'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold ${msg.is_admin ? 'text-cyber-purple' : 'text-electric-blue'}`}>
                            {msg.is_admin ? 'Support Team' : 'You'}
                          </span>
                          <span className="text-xs text-gray-500">{formatDate(msg.created_at)}</span>
                        </div>
                        <p className="text-gray-300 whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedTicket.status !== 'closed' && (
                  <div className="p-4 border-t border-white/5">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-deep-navy border-white/10"
                        onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                        data-testid="ticket-reply-input"
                      />
                      <Button
                        onClick={handleReply}
                        disabled={submitting || !newMessage.trim()}
                        className="bg-electric-blue text-black"
                        data-testid="ticket-reply-send"
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
                  <p>Select a ticket to view conversation</p>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default TicketsPage;
