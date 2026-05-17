import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, Sparkles } from 'lucide-react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import api from '../../lib/axios';
import { toast } from 'sonner';

export default function AIOrderAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await api.post('/ai/order-assist', { message: text });
      setMessages((m) => [...m, { role: 'assistant', text: res.data?.reply || 'Here you go.' }]);
      setMatches(res.data?.matches || []);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
      setMessages((m) => [...m, { role: 'assistant', text: 'Could not reach AI. Check ANTHROPIC_API_KEY.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="AI Order Assistant">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="glass p-4 border-[var(--border)]">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold mb-2">
            <Sparkles className="text-electric-blue" size={22} />
            Chat to order
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Describe your goal; we match real services and pre-fill the new order page.
          </p>
          <div className="h-[320px] overflow-y-auto space-y-3 mb-4 p-2 rounded-xl bg-[var(--bg-hover)]/50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto bg-cyber-purple/30 text-[var(--text-primary)]' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                <Loader2 className="animate-spin" size={14} /> Processing…
              </div>
            )}
            <div ref={ref} />
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="e.g. 10k YouTube views for my music video"
              className="bg-deep-navy border-[var(--border)]"
            />
            <Button onClick={send} disabled={loading} className="bg-electric-blue text-black shrink-0">
              <Send size={18} />
            </Button>
          </div>
        </Card>
        {matches.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {matches.map((m, idx) => (
              <Card key={idx} className="glass p-4 border-[var(--border)] flex flex-col">
                <div className="font-medium text-[var(--text-primary)] text-sm mb-1">{m.name}</div>
                <div className="text-xs text-[var(--text-muted)] mb-3">~{m.estimated_cost} · {m.suggested_quantity} units</div>
                <Button
                  className="mt-auto bg-neon-green/20 text-neon-green border border-neon-green/30"
                  size="sm"
                  onClick={() => {
                    const sid = m.prefill?.service_id ?? m.service_id;
                    const qty = m.prefill?.quantity ?? m.suggested_quantity;
                    navigate(`/dashboard/new-order?service_id=${encodeURIComponent(sid)}&quantity=${encodeURIComponent(qty)}`);
                  }}
                >
                  One-click order setup
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
