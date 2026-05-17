import React, { useState, useEffect } from 'react';
import { Trophy, Loader2, Lock } from 'lucide-react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import api from '../../lib/axios';
import { toast } from 'sonner';

export default function GamificationPage() {
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [mode, setMode] = useState('month');
  const [tab, setTab] = useState('overview');

  const load = async () => {
    try {
      const [p, a, l] = await Promise.all([
        api.get('/gamification/profile'),
        api.get('/gamification/achievements'),
        api.get('/gamification/leaderboard', { params: { mode } }),
      ]);
      setProfile(p.data);
      setAchievements(a.data?.achievements || []);
      setLeaderboard(l.data?.leaderboard || []);
    } catch (e) {
      toast.error('Could not load gamification');
    }
  };

  useEffect(() => {
    load();
  }, [mode]);

  const xp = profile?.xp ?? 0;
  const next = profile?.next_level;
  const pct = next ? Math.min(100, (xp / next.min_xp) * 100) : 100;

  return (
    <DashboardLayout title="Achievements">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex gap-2">
          {['overview', 'badges', 'leaderboard'].map((t) => (
            <Button key={t} variant={tab === t ? 'default' : 'outline'} size="sm" onClick={() => setTab(t)} className={tab === t ? 'bg-electric-blue text-black' : ''}>
              {t}
            </Button>
          ))}
        </div>

        {tab === 'overview' && profile && (
          <Card className="glass p-6 border-[var(--border)] text-center relative overflow-hidden">
            <Trophy className="mx-auto text-amber-400 mb-2" size={48} />
            <div className="text-2xl font-black text-[var(--text-primary)]">Level {profile.level}</div>
            <div className="text-electric-blue font-medium">{profile.level_name}</div>
            <div className="text-sm text-[var(--text-muted)] mt-2">
              {xp} XP · Rank #{profile.rank}
            </div>
            <div className="h-3 rounded-full bg-[var(--bg-hover)] mt-4 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyber-purple to-electric-blue" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {next ? `${profile.xp_to_next} XP to level ${next.level}` : 'Max level'}
            </div>
          </Card>
        )}

        {tab === 'badges' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {achievements.map((b) => (
              <Card key={b.id} className={`glass p-3 border-[var(--border)] ${b.earned ? '' : 'opacity-50 grayscale'}`}>
                <div className="font-medium text-[var(--text-primary)] text-sm flex items-center gap-1">
                  {!b.earned && <Lock size={12} />}
                  {b.title}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{b.description}</div>
                {b.earned_at && <div className="text-[10px] text-neon-green mt-2">{new Date(b.earned_at).toLocaleDateString()}</div>}
              </Card>
            ))}
          </div>
        )}

        {tab === 'leaderboard' && (
          <Card className="glass p-4 border-[var(--border)]">
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant={mode === 'month' ? 'default' : 'outline'} onClick={() => setMode('month')} className={mode === 'month' ? 'bg-electric-blue text-black' : ''}>
                This month
              </Button>
              <Button size="sm" variant={mode === 'all' ? 'default' : 'outline'} onClick={() => setMode('all')} className={mode === 'all' ? 'bg-electric-blue text-black' : ''}>
                All time
              </Button>
            </div>
            <ol className="space-y-2 text-sm">
              {leaderboard.map((row, i) => (
                <li key={row.user_id} className={`flex justify-between p-2 rounded-lg ${row.is_me ? 'bg-electric-blue/10' : 'bg-[var(--bg-hover)]'}`}>
                  <span>
                    #{i + 1} {row.username}
                  </span>
                  <span className="text-electric-blue">{row.xp_month ?? row.xp} XP</span>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {profile?.recent_events?.length > 0 && tab === 'overview' && (
          <Card className="glass p-4 border-[var(--border)]">
            <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">Recent XP</div>
            <ul className="text-xs text-[var(--text-muted)] space-y-1">
              {profile.recent_events.map((e, i) => (
                <li key={i}>
                  +{e.amount} XP — {e.reason} ({new Date(e.created_at).toLocaleString()})
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
