import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Link as LinkIcon, Target, ShoppingCart, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { useCurrency } from '../../context/CurrencyContext';
import { Toaster } from '../../components/ui/sonner';
import { useDashboardAuth } from '../../hooks/useDashboardAuth';

const MIN_LOADING_MS = 1500;

function detectPlatform(link) {
  if (!link || typeof link !== 'string') return null;
  const url = link.trim().toLowerCase();
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('facebook.com')) return 'Facebook';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'X/Twitter';
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('spotify.com')) return 'Spotify';
  return null;
}

const RecommendPage = () => {
  const navigate = useNavigate();
  const { token } = useDashboardAuth();
  const { formatPrice } = useCurrency();
  const [link, setLink] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const platform = detectPlatform(link);

  const handleGetRecommendations = useCallback(async () => {
    const linkStr = link.trim();
    const goalStr = goal.trim();
    if (!linkStr && !goalStr) {
      setError('Please paste a link or describe your goal first');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);
    const start = Date.now();
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await api.post(
        '/recommend',
        { link: linkStr || undefined, goal: goalStr || undefined },
        { withCredentials: true, headers }
      );
      const elapsed = Date.now() - start;
      if (elapsed < MIN_LOADING_MS) {
        await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));
      }
      setResult(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'AI recommendation failed. Please try again.';
      setError(msg);
      if (err.response?.status === 503) {
        toast.error('AI Recommender not configured. Contact admin.');
      }
    } finally {
      setLoading(false);
    }
  }, [link, goal]);

  const handleOrderNow = (rec, userLink) => {
    const params = new URLSearchParams();
    params.set('service_id', rec.service_id);
    params.set('quantity', String(rec.suggested_quantity));
    if (rec.category_id) params.set('category_id', rec.category_id);
    if (userLink) params.set('link', userLink);
    navigate(`/dashboard/new-order?${params.toString()}`);
  };

  const confidenceColor = (c) => (c === 'high' ? 'text-neon-green' : c === 'medium' ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]');
  const rankBorder = (rank) =>
    rank === 1 ? 'border-neon-green' : rank === 2 ? 'border-cyber-purple' : 'border-[var(--border)]';

  return (
    <DashboardLayout title="AI Service Recommender">
      <Toaster position="top-right" theme="dark" />
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-exo font-bold text-[var(--text-primary)] flex items-center justify-center gap-2">
            <Sparkles className="text-cyber-purple" size={28} />
            AI Service Recommender
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Let AI find the perfect service for your goals</p>
        </div>

        {!result && !loading && (
          <>
            <Card className="glass p-6 border-[var(--border)]">
              <Label className="text-[var(--text-muted)] flex items-center gap-2 mb-2">
                <LinkIcon size={16} />
                Your Link (optional)
              </Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://instagram.com/p/ABC123"
                className="bg-deep-navy border-[var(--border)] font-mono text-sm"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">Paste your post, profile, or video URL</p>
              {platform && (
                <p className="text-xs text-neon-green mt-2 flex items-center gap-1">
                  📷 {platform} detected
                </p>
              )}
            </Card>

            <Card className="glass p-6 border-[var(--border)]">
              <Label className="text-[var(--text-muted)] flex items-center gap-2 mb-2">
                <Target size={16} />
                Your Goal (optional)
              </Label>
              <Textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="I want to boost engagement on this post"
                rows={3}
                className="bg-deep-navy border-[var(--border)] resize-none"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">Describe what you want to achieve</p>
            </Card>

            {error && (
              <div className="text-center space-y-2">
                <p className="text-[var(--warning)] text-sm">⚠️ {error}</p>
                <Button variant="outline" size="sm" className="border-[var(--border)]" onClick={handleGetRecommendations}>
                  Retry
                </Button>
              </div>
            )}

            <Button
              onClick={handleGetRecommendations}
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyber-purple to-purple-500 hover:from-cyber-purple/90 hover:to-purple-500/90 text-[var(--text-primary)] font-bold py-6 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Get AI Recommendations
                </>
              ) : (
                <>
                  <Sparkles size={20} className="mr-2" />
                  Get AI Recommendations
                </>
              )}
            </Button>
          </>
        )}

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 space-y-4"
          >
            <div className="animate-spin w-12 h-12 border-4 border-cyber-purple border-t-transparent rounded-full mx-auto" />
            <p className="text-[var(--text-muted)] animate-pulse">🤖 Analyzing your goal and finding the best services...</p>
            <div className="flex justify-center gap-4 mt-8">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="w-40 h-32 bg-[var(--bg-card)] border-[var(--border)] animate-pulse" />
              ))}
            </div>
          </motion.div>
        )}

        {result && result.recommendations?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--text-muted)]"
              onClick={() => { setResult(null); setError(''); }}
            >
              ← New recommendation
            </Button>
            {result.summary && (
              <Card className="glass p-4 border-neon-green/20 bg-neon-green/5">
                <p className="text-sm text-[var(--text-secondary)]">💡 {result.summary}</p>
              </Card>
            )}
            {result.platform && (
              <p className="text-xs text-[var(--text-muted)]">Platform: {result.platform}</p>
            )}
            <div className="space-y-4">
              {result.recommendations.map((rec) => (
                <Card
                  key={`${rec.service_id}-${rec.rank}`}
                  className={`glass p-6 border ${rankBorder(rec.rank)} ${rec.rank === 1 ? 'ring-1 ring-neon-green/30' : ''}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-[var(--text-muted)] font-medium">
                      #{rec.rank} {rec.rank === 1 ? '🥇 BEST MATCH' : rec.rank === 2 ? '🥈 ALSO GREAT' : '🥉 CONSIDER THIS'}
                    </span>
                    <span className={`text-xs ${confidenceColor(rec.confidence)}`}>
                      {rec.confidence === 'high' && '● '}
                      {rec.confidence === 'medium' && '● '}
                      {rec.confidence === 'low' && '● '}
                      {rec.confidence}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{rec.service_name}</h3>
                  {(rec.rating_avg != null && rec.rating_count > 0) && (
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">⭐ {rec.rating_avg} ({rec.rating_count} reviews)</p>
                  )}
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-[var(--text-muted)] uppercase">Why this service?</p>
                    <p className="text-sm text-[var(--text-secondary)]">{rec.reason}</p>
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-[var(--text-muted)] uppercase">📈 Expected Results</p>
                    <p className="text-sm text-neon-green/90">{rec.expected_results}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-[var(--text-muted)]">
                      Suggested: {rec.suggested_quantity?.toLocaleString()} · {formatPrice(rec.estimated_cost ?? 0)}
                    </div>
                    <Button
                      className="bg-neon-green hover:bg-neon-green/90 text-black font-semibold"
                      onClick={() => handleOrderNow(rec, link.trim() || undefined)}
                    >
                      <ShoppingCart size={16} className="mr-2" />
                      Order Now — {formatPrice(rec.estimated_cost ?? 0)}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {result && (!result.recommendations || result.recommendations.length === 0) && (
          <Card className="p-8 text-center text-[var(--text-muted)]">
            <p>We couldn&apos;t find matching services. Try describing your goal differently.</p>
            <Button variant="outline" className="mt-4 border-[var(--border)]" onClick={() => setResult(null)}>
              Try again
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RecommendPage;
