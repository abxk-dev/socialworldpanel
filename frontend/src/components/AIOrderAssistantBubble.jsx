import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import api from '../lib/axios';
import { toast } from 'sonner';

export default function AIOrderAssistantBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastMatches, setLastMatches] = useState([]);
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await api.post('/ai/order-assist', { message: text });
      const reply = res.data?.reply || 'Here are some options.';
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
      setLastMatches(res.data?.matches || []);
    } catch (e) {
      toast.error(e.response?.data?.error || 'AI request failed');
      setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  };

  const applyMatch = (m) => {
    const sid = m?.prefill?.service_id ?? m?.service_id;
    const qty = m?.prefill?.quantity ?? m?.suggested_quantity ?? 1000;
    if (!sid) return;
    navigate(`/dashboard/new-order?service_id=${encodeURIComponent(sid)}&quantity=${encodeURIComponent(qty)}`);
    setOpen(false);
    toast.success('Order form pre-filled');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full bg-gradient-to-br from-cyber-purple to-electric-blue text-white shadow-lg shadow-cyber-purple/40 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open AI order assistant"
      >
        <Sparkles size={24} />
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-[60] w-[min(100vw-2rem,400px)] rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl flex flex-col max-h-[min(70vh,520px)]">
          <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <MessageCircle size={18} className="text-electric-blue" />
              AI Order Assistant
            </div>
            <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
            {messages.length === 0 && (
              <p className="text-[var(--text-muted)]">Ask in plain language — e.g. &quot;5000 Instagram followers for my food page&quot;.</p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2 max-w-[90%] ${
                  msg.role === 'user' ? 'ml-auto bg-electric-blue/20 text-[var(--text-primary)]' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
                <Loader2 className="animate-spin" size={14} />
                Thinking…
              </div>
            )}
            {lastMatches.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-[var(--text-muted)]">Matched services</p>
                {lastMatches.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyMatch(m)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-3 hover:border-electric-blue/50 transition-colors"
                  >
                    <div className="font-medium text-[var(--text-primary)]">{m.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">Est. {m.estimated_cost?.toFixed?.(2) ?? m.estimated_cost} · qty {m.suggested_quantity}</div>
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="p-3 border-t border-[var(--border)] space-y-2">
            <div className="flex flex-wrap gap-1">
              {['Get me to YouTube monetization', 'Boost my Instagram engagement', 'Make my TikTok go viral'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className="text-[10px] px-2 py-1 rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-electric-blue"
                  onClick={() => {
                    setInput(s);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Describe what you need…"
                className="bg-deep-navy border-[var(--border)]"
              />
              <Button type="button" size="icon" onClick={send} disabled={loading} className="shrink-0 bg-electric-blue text-black">
                <Send size={18} />
              </Button>
            </div>
            <Button variant="ghost" className="w-full text-xs text-[var(--text-muted)]" onClick={() => navigate('/dashboard/ai-assistant')}>
              Open full assistant
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
