import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, ThumbsUp, MessageCircle, Users } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Button } from './ui/button';

const PLATFORMS = ['YouTube', 'Instagram', 'TikTok'];

function inferMetricFromService(service) {
  if (!service?.name) return 'views';
  const name = (service.name || '').toLowerCase();
  if (name.includes('watch') || name.includes('hour')) return 'watch_hours';
  if (name.includes('follow') || name.includes('subscriber')) return 'followers';
  if (name.includes('like')) return 'likes';
  if (name.includes('comment')) return 'comments';
  if (name.includes('view')) return 'views';
  return 'views';
}

function AnimatedNumber({ from, to, duration = 1500, suffix = '' }) {
  const [display, setDisplay] = useState(from);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(from + (to - from) * eased);
      setDisplay(val);
      if (progress < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [from, to, duration]);
  return <span>{display.toLocaleString()}{suffix}</span>;
}

export default function SocialPreview({ platform, link, service, quantity, currentStats = {}, defaultOpen = false }) {
  const { formatPrice } = useCurrency();
  const [open, setOpen] = useState(defaultOpen);
  const [stats, setStats] = useState({
    views: currentStats.views ?? 100,
    likes: currentStats.likes ?? 20,
    comments: currentStats.comments ?? 5,
    followers: currentStats.followers ?? 500,
    watch_hours: currentStats.watch_hours ?? 500,
  });
  const [hasAnimated, setHasAnimated] = useState(false);

  const effectivePlatform = platform || 'YouTube';
  const metric = inferMetricFromService(service);
  const qty = parseInt(quantity, 10) || 0;

  const before = {
    views: stats.views,
    likes: stats.likes,
    comments: stats.comments,
    followers: stats.followers,
    watch_hours: stats.watch_hours,
  };

  const after = {
    views: metric === 'views' ? before.views + qty : before.views,
    likes: metric === 'likes' ? before.likes + qty : before.likes,
    comments: metric === 'comments' ? before.comments + qty : before.comments,
    followers: metric === 'followers' ? before.followers + qty : before.followers,
    watch_hours: metric === 'watch_hours' ? before.watch_hours + qty : before.watch_hours,
  };

  const boostPercent = (() => {
    const b = before[metric] || 1;
    const a = after[metric] || b;
    return Math.round(((a - b) / b) * 100);
  })();

  const credibilityBefore = Math.min(95, Math.round(((before.views || 0) / 1000) * 10 + ((before.likes || 0) / 100) * 5));
  const credibilityAfter = Math.min(95, credibilityBefore + Math.min(40, Math.floor(boostPercent / 3)));

  useEffect(() => {
    if (open && !hasAnimated) setHasAnimated(true);
  }, [open, hasAnimated]);

  const tips = {
    YouTube: 'More views = better algorithm ranking',
    Instagram: 'Higher engagement = explore page chance',
    TikTok: 'Views boost triggers FYP algorithm',
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full border-neon-green/30 text-neon-green hover:bg-neon-green/10"
        >
          <Eye size={18} className="mr-2" />
          Preview Your Boost →
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 overflow-hidden"
        >
          <div className="glass rounded-xl p-6 border border-white/10 space-y-6">
            <h4 className="text-lg font-exo font-bold text-white flex items-center gap-2">
              <Eye size={20} className="text-electric-blue" />
              {effectivePlatform} Preview
            </h4>

            {/* Current stats input */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Enter current stats for accurate preview</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['views', 'likes', 'comments', 'followers'].includes(metric) || effectivePlatform !== 'YouTube') && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">Views</label>
                      <input
                        type="number"
                        min={0}
                        value={stats.views}
                        onChange={(e) => setStats(s => ({ ...s, views: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-deep-navy border border-white/10 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Likes</label>
                      <input
                        type="number"
                        min={0}
                        value={stats.likes}
                        onChange={(e) => setStats(s => ({ ...s, likes: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-deep-navy border border-white/10 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Comments</label>
                      <input
                        type="number"
                        min={0}
                        value={stats.comments}
                        onChange={(e) => setStats(s => ({ ...s, comments: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-deep-navy border border-white/10 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Followers</label>
                      <input
                        type="number"
                        min={0}
                        value={stats.followers}
                        onChange={(e) => setStats(s => ({ ...s, followers: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-deep-navy border border-white/10 text-white text-sm"
                      />
                    </div>
                  </>
                )}
                {metric === 'watch_hours' && (
                  <div>
                    <label className="text-xs text-gray-500">Watch Hours</label>
                    <input
                      type="number"
                      min={0}
                      value={stats.watch_hours}
                      onChange={(e) => setStats(s => ({ ...s, watch_hours: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-deep-navy border border-white/10 text-white text-sm"
                    />
                  </div>
                )}
              </div>
              {Object.keys(stats).every(k => !stats[k] || stats[k] === 0) && (
                <p className="text-xs text-gray-500">(using estimated values)</p>
              )}
            </div>

            {/* Preview card */}
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-white/5">
                <div className="w-full h-32 bg-white/5 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                  {effectivePlatform === 'YouTube' && '📺 Video Thumbnail'}
                  {effectivePlatform === 'Instagram' && '📷 Post / Reel'}
                  {effectivePlatform === 'TikTok' && '🎵 Video'}
                </div>
                <p className="text-white font-medium mt-2 truncate">Your {effectivePlatform} content</p>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">BEFORE</p>
                    <div className="space-y-2">
                      {metric === 'views' && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Eye size={14} /> <span>{before.views?.toLocaleString()} views</span>
                        </div>
                      )}
                      {metric === 'likes' && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <ThumbsUp size={14} /> <span>{before.likes?.toLocaleString()} likes</span>
                        </div>
                      )}
                      {metric === 'comments' && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <MessageCircle size={14} /> <span>{before.comments?.toLocaleString()} comments</span>
                        </div>
                      )}
                      {metric === 'followers' && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Users size={14} /> <span>{before.followers?.toLocaleString()} followers</span>
                        </div>
                      )}
                      {metric === 'watch_hours' && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Eye size={14} /> <span>{before.watch_hours?.toLocaleString()}h watch time</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">AFTER ORDER</p>
                    <div className="space-y-2">
                      {metric === 'views' && (
                        <div className="flex items-center gap-2 text-neon-green swp-preview-glow">
                          <Eye size={14} /> {hasAnimated ? <AnimatedNumber from={before.views} to={after.views} /> : after.views?.toLocaleString()} views 🔥
                        </div>
                      )}
                      {metric === 'likes' && (
                        <div className="flex items-center gap-2 text-neon-green swp-preview-glow">
                          <ThumbsUp size={14} /> {hasAnimated ? <AnimatedNumber from={before.likes} to={after.likes} /> : after.likes?.toLocaleString()} likes 🔥
                        </div>
                      )}
                      {metric === 'comments' && (
                        <div className="flex items-center gap-2 text-neon-green swp-preview-glow">
                          <MessageCircle size={14} /> {hasAnimated ? <AnimatedNumber from={before.comments} to={after.comments} /> : after.comments?.toLocaleString()} comments 🔥
                        </div>
                      )}
                      {metric === 'followers' && (
                        <div className="flex items-center gap-2 text-neon-green swp-preview-glow">
                          <Users size={14} /> {hasAnimated ? <AnimatedNumber from={before.followers} to={after.followers} /> : after.followers?.toLocaleString()} followers 🔥
                        </div>
                      )}
                      {metric === 'watch_hours' && (
                        <div className="flex items-center gap-2 text-neon-green swp-preview-glow">
                          <Eye size={14} /> {hasAnimated ? <AnimatedNumber from={before.watch_hours} to={after.watch_hours} suffix="h" /> : `${after.watch_hours?.toLocaleString()}h`} watch time 🔥
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-neon-green/20 text-neon-green text-sm font-medium">
                    +{boostPercent}% boost
                  </span>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Credibility Score</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Before</span>
                      <span>{credibilityBefore}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gray-500 transition-all duration-500" style={{ width: `${credibilityBefore}%` }} />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neon-green">After</span>
                      <span className="text-neon-green">{credibilityAfter}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-neon-green transition-all duration-1000" style={{ width: `${credibilityAfter}%` }} />
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-400 italic">
                  Your content will look more credible and get recommended more.
                </p>
              </div>
            </div>

            {tips[effectivePlatform] && (
              <p className="text-sm text-electric-blue">
                💡 {tips[effectivePlatform]}
              </p>
            )}
          </div>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}
