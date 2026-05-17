import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Loader2, History, ShoppingCart } from 'lucide-react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { useAuth, useSettings } from '../../App';
import { useCurrency } from '../../context/CurrencyContext';
import api from '../../lib/axios';
import { parseAdminServiceIdList } from '../../lib/utils';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';

const CANVAS_SIZE = 400;
const WHEEL_RADIUS = (CANVAS_SIZE / 2) - 10;
const RIM_WIDTH = 14;
const HUB_RADIUS = 32;

function hexToRgb(hex) {
  const source = String(hex || '').trim();
  const m = source.replace(/^#/, '').match(/.{2}/g);
  // Canvas gradient helpers need RGB, but this function may receive
  // non-hex values during edge-cases; fall back to black.
  return m ? m.map((x) => parseInt(x, 16)) : [0, 0, 0];
}
function lighten(hex, pct = 0.35) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * pct))},${Math.min(255, Math.round(g + (255 - g) * pct))},${Math.min(255, Math.round(b + (255 - b) * pct))})`;
}
function darken(hex, pct = 0.25) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.max(0, Math.round(r * (1 - pct)))},${Math.max(0, Math.round(g * (1 - pct)))},${Math.max(0, Math.round(b * (1 - pct)))})`;
}

function drawWheel(ctx, prizes, rotation) {
  if (!ctx || !prizes || prizes.length === 0) return;
  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;
  const radius = WHEEL_RADIUS;
  const arcSize = (2 * Math.PI) / prizes.length;

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const cssVar = (name) => {
    try {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    } catch {
      return '';
    }
  };

  const bgPrimary = cssVar('--bg-primary');
  const bgSecondary = cssVar('--bg-secondary');
  const bgTertiary = cssVar('--bg-tertiary');
  const borderHover = cssVar('--border-hover');
  const textPrimary = cssVar('--text-primary');
  const success = cssVar('--success');
  const shadow300 = cssVar('--spinwheel-shadow-300');
  const shadow350 = cssVar('--spinwheel-shadow-350');
  const shadow700 = cssVar('--spinwheel-shadow-700');
  const highlight250 = cssVar('--spinwheel-highlight-250');
  const highlight200 = cssVar('--spinwheel-highlight-200');

  // Soft shadow under the wheel (ellipse) for depth
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = bgPrimary;
  ctx.beginPath();
  ctx.ellipse(cx, cy + radius + 6, radius * 0.9, 16, 0, 0, 2 * Math.PI);
  ctx.filter = 'blur(10px)';
  ctx.fill();
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.restore();

  // Outer rim (beveled ring) — 3D metallic look
  ctx.beginPath();
  ctx.arc(cx, cy, radius + RIM_WIDTH, 0, 2 * Math.PI);
  ctx.fillStyle = bgSecondary;
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.fillStyle = bgPrimary;
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.arc(cx, cy, radius + RIM_WIDTH, 0, 2 * Math.PI);
  ctx.strokeStyle = borderHover;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = shadow300;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Rim highlight (top edge)
  ctx.beginPath();
  ctx.arc(cx, cy, radius + RIM_WIDTH - 1, -Math.PI * 0.6, -Math.PI * 0.4);
  ctx.strokeStyle = highlight250;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Segments with 3D gradient (lighter at outer edge toward top, darker toward center)
  prizes.forEach((prize, i) => {
    const startAngle = rotation + i * arcSize;
    const endAngle = startAngle + arcSize;
    const midAngle = startAngle + arcSize / 2;
    const baseColor = prize.color || success;
    const lightColor = lighten(baseColor, 0.4);
    const darkColor = darken(baseColor, 0.2);

    const x0 = cx + Math.cos(midAngle) * radius;
    const y0 = cy + Math.sin(midAngle) * radius;
    const gradient = ctx.createLinearGradient(cx, cy, x0, y0);
    gradient.addColorStop(0, darkColor);
    gradient.addColorStop(0.6, baseColor);
    gradient.addColorStop(1, lightColor);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = shadow350;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Thin highlight on the "leading" edge of slice for extra bevel
    const edgeAngle = startAngle;
    const ex = cx + Math.cos(edgeAngle) * radius;
    const ey = cy + Math.sin(edgeAngle) * radius;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = highlight200;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + arcSize / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = textPrimary;
    ctx.font = 'bold 13px sans-serif';
    ctx.shadowColor = shadow700;
    ctx.shadowBlur = 6;
    const label = (prize.label || '').length > 18 ? (prize.label || '').slice(0, 16) + '…' : (prize.label || '');
    ctx.fillText(label, radius - 18, 5);
    ctx.restore();
  });

  // Center hub — raised 3D disc with gradient
  const hubGradient = ctx.createRadialGradient(cx - 8, cy - 8, 0, cx, cy, HUB_RADIUS);
  hubGradient.addColorStop(0, bgTertiary);
  hubGradient.addColorStop(0.4, bgSecondary);
  hubGradient.addColorStop(1, bgPrimary);
  ctx.beginPath();
  ctx.arc(cx, cy, HUB_RADIUS, 0, 2 * Math.PI);
  ctx.fillStyle = hubGradient;
  ctx.fill();
  ctx.strokeStyle = success;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = highlight200;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = textPrimary;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SWP', cx, cy);
}

const SpinWheelPage = () => {
  const { token, refreshUser } = useAuth();
  const { settings } = useSettings();
  const { formatPrice } = useCurrency();
  const canvasRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState([]);
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });

  const prizes = status?.prizes || [];
  const spendReq = status?.spend_requirement;
  const spendMet =
    spendReq == null || spendReq.met === true;
  const canSpin = status?.can_spin === true;

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/spin/status', { withCredentials: true });
      setStatus(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load spin');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/spin/history', { withCredentials: true });
      setHistory(res.data?.history || []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchHistory();
  }, [fetchStatus, fetchHistory]);

  useEffect(() => {
    if (!status?.prizes?.length || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    drawWheel(ctx, status.prizes, currentRotation);
  }, [status?.prizes, currentRotation]);

  useEffect(() => {
    if (canSpin || !spendMet || !status?.next_spin_at) return;
    const update = () => {
      const next = new Date(status.next_spin_at);
      const now = new Date();
      const ms = Math.max(0, next - now);
      if (ms <= 0) {
        fetchStatus();
        return;
      }
      const s = Math.floor((ms / 1000) % 60);
      const m = Math.floor((ms / 60000) % 60);
      const h = Math.floor(ms / 3600000);
      setCountdown({ h, m, s });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [canSpin, spendMet, status?.next_spin_at, fetchStatus]);

  const handleSpin = async () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);
    setShowResult(false);
    try {
      const res = await api.post('/spin/spin', {}, { withCredentials: true });
      const data = res.data;
      const prizeIndex = data.prize_index ?? 0;
      const extraSpins = (Math.floor(Math.random() * 3) + 5) * 2 * Math.PI;
      const arcSize = (2 * Math.PI) / prizes.length;
      // Pointer is at top (12 o'clock = -π/2). Place winning segment's center there.
      const baseRotation = -Math.PI / 2 - (prizeIndex + 0.5) * arcSize;
      const normalizedBase = ((baseRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const targetRotation = extraSpins + normalizedBase;

      const duration = 4000;
      const start = performance.now();
      const startRot = currentRotation;

      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const rot = startRot + targetRotation * eased;
        setCurrentRotation(rot);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          drawWheel(ctx, prizes, rot);
        }
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setSpinning(false);
          setResult(data);
          setShowResult(true);
          fetchStatus();
          fetchHistory();
          if (refreshUser) refreshUser();
        }
      };
      requestAnimationFrame(animate);
    } catch (e) {
      setSpinning(false);
      toast.error(e.response?.data?.error || 'Spin failed');
      fetchStatus();
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Daily Spin">
        <Toaster position="top-right" theme="dark" />
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 size={32} className="animate-spin text-electric-blue" />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !status) {
    return (
      <DashboardLayout title="Daily Spin">
        <Toaster position="top-right" theme="dark" />
        <Card className="glass p-6 border-[var(--border)] max-w-md mx-auto">
          <p className="text-[var(--text-muted)] mb-4">{error}</p>
          <Button variant="outline" onClick={fetchStatus}>Retry</Button>
        </Card>
      </DashboardLayout>
    );
  }

  const streak = status?.streak ?? 0;
  const streakTarget = 7;

  return (
    <DashboardLayout title="Daily Spin">
      <Toaster position="top-right" theme="dark" />
      <div className="max-w-lg mx-auto space-y-6">
        <p className="text-[var(--text-muted)] text-center">Win credits, discounts & more!</p>

        {!spendMet && spendReq && (
          <Card className="glass p-4 border-amber-500/40 bg-amber-500/5">
            <p className="text-amber-200 font-medium text-sm mb-2">Spin wheel locked</p>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              Place orders totaling at least <strong className="text-[var(--text-primary)]">$1 USD</strong> or{' '}
              <strong className="text-[var(--text-primary)]">₹100 INR</strong> (lifetime spend) to unlock daily spins.
              Your current order spend is about{' '}
              <strong className="text-[var(--text-primary)]">${Number(spendReq.spent_usd || 0).toFixed(2)}</strong> (~₹
              {Math.round(Number(spendReq.spent_inr_equivalent || 0))} at current display rates).
            </p>
            <Button asChild className="mt-4 bg-neon-green hover:bg-neon-green/90 text-black">
              <Link to="/dashboard/new-order">Place an order</Link>
            </Button>
          </Card>
        )}

        {streak > 0 && (
          <Card className="glass p-4 border-neon-green/20">
            <div className="flex items-center gap-2 text-neon-green font-medium mb-2">
              <span>🔥 Current Streak: {streak} days</span>
            </div>
            <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-neon-green rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (streak / streakTarget) * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Spin 7 days in a row for a $2 bonus!
            </p>
          </Card>
        )}

        <div className="relative flex justify-center">
          {prizes.length === 0 && (
            <Card className="glass p-4 border-[var(--border)] mb-4 text-center text-[var(--text-muted)]">
              No spin prizes configured yet.
            </Card>
          )}
          {/* 3D pointer with gradient and shadow */}
          {prizes.length > 0 && (
            <>
              <div
                className="absolute top-0 z-10 pointer-events-none"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '14px solid transparent',
                  borderRight: '14px solid transparent',
                  borderTop: '28px solid var(--success)',
                  filter: `drop-shadow(0 3px 6px var(--spinwheel-drop-400)) drop-shadow(0 1px 0 var(--spinwheel-drop-white-200))`,
                  WebkitFilter: `drop-shadow(0 3px 6px var(--spinwheel-drop-400)) drop-shadow(0 1px 0 var(--spinwheel-drop-white-200))`,
                }}
              />
              <div
                className="relative transition-opacity"
                style={{
                  filter: `drop-shadow(0 12px 24px var(--spinwheel-drop-350)) drop-shadow(0 4px 8px var(--spinwheel-shadow-200))`,
                  opacity: spendMet ? 1 : 0.45,
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="max-w-full h-auto rounded-lg"
                  style={{ maxWidth: 'min(400px, 100vw - 2rem)', display: 'block' }}
                />
              </div>
            </>
          )}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="bg-neon-green hover:bg-neon-green/90 text-black font-bold text-lg px-8 py-6"
            onClick={handleSpin}
            disabled={!canSpin || spinning}
          >
            {spinning ? (
              <Loader2 size={24} className="animate-spin" />
            ) : !spendMet ? (
              <>Unlock by spending $1 or ₹100</>
            ) : canSpin ? (
              <>🎰 SPIN NOW!</>
            ) : (
              <>Come back tomorrow</>
            )}
          </Button>
        </div>

        {!canSpin && !spendMet && (
          <p className="text-center text-[var(--text-muted)] text-xs max-w-sm mx-auto">
            After you meet the spend requirement, you can spin once every 24 hours.
          </p>
        )}

        {!canSpin && spendMet && status?.next_spin_at && (
          <p className="text-center text-[var(--text-muted)] text-sm">
            Next spin in: {String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}:{String(countdown.s).padStart(2, '0')}
          </p>
        )}

        {status?.total_earned != null && status.total_earned > 0 && (
          <p className="text-center text-[var(--text-muted)] text-sm">
            Total won from spins: {formatPrice(status.total_earned)}
          </p>
        )}

        <Card className="glass p-4 border-[var(--border)]">
          <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2 mb-3">
            <History size={18} />
            My Spin History
          </h3>
          {history.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No spins yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Prize</th>
                    <th className="text-left py-2">Code</th>
                    <th className="text-left py-2">Streak</th>
                    <th className="text-right py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 20).map((h, i) => (
                    <tr key={i} className="border-b border-[var(--border)]">
                      <td className="py-2 text-[var(--text-muted)]">
                        {h.date ? new Date(h.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2 text-[var(--text-primary)]">{h.prize}</td>
                      <td className="py-2 text-[var(--text-secondary)]">
                        {h.prize_type === 'discount' && h.coupon_code ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-xs">
                            {h.coupon_code}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2 text-[var(--text-muted)]">Day {h.streak}</td>
                      <td className="py-2 text-right">
                        {h.prize_type === 'free_order' ? (
                          (() => {
                            const ids = parseAdminServiceIdList(settings?.spin_free_views_service_id);
                            const firstId = ids[0];
                            const orderNowUrl = firstId
                              ? `/dashboard/new-order?redeem=1&service_id=${encodeURIComponent(firstId)}`
                              : '/dashboard/new-order?redeem=1';
                            return (
                              <Link to={orderNowUrl}>
                                <Button size="sm" className="bg-neon-green hover:bg-neon-green/90 text-black text-[10px] font-medium gap-0.5 py-0.5 px-1 h-5 min-w-0">
                                  <ShoppingCart size={9} />
                                  Order Now
                                </Button>
                              </Link>
                            );
                          })()
                        ) : h.prize_type === 'discount' && h.coupon_code ? (
                          <Link to="/dashboard/new-order">
                            <Button size="sm" variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 gap-0.5 text-[10px] py-0.5 px-1 h-5">
                              Use Code
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <AnimatePresence>
        {showResult && result && (
          <Dialog open={showResult} onOpenChange={setShowResult}>
            <DialogContent className="glass border-neon-green/30 max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-neon-green">🎉 You won!</DialogTitle>
              </DialogHeader>
              <div className="py-4 text-center">
                <p className="text-xl font-bold text-[var(--text-primary)]">{result.prize?.label}</p>
                {result.prize?.type === 'credit' && (
                  <p className="text-[var(--text-muted)] mt-2">
                    {formatPrice(result.prize?.value || 0)} added to your balance!
                  </p>
                )}
                {result.bonus_amount > 0 && (
                  <p className="text-neon-green mt-2">🔥 +{formatPrice(result.bonus_amount)} streak bonus!</p>
                )}
                {result.prize?.coupon_code && (
                  <p className="text-[var(--text-muted)] mt-2">
                    🎟️ Code: <strong className="text-[var(--text-primary)]">{result.prize.coupon_code}</strong> — valid 24h
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  className="bg-neon-green text-black"
                  onClick={() => setShowResult(false)}
                >
                  Awesome!
                </Button>
                {result.prize?.type === 'discount' && result.prize?.coupon_code && (
                  <Link to="/dashboard/new-order">
                    <Button variant="outline" onClick={() => setShowResult(false)}>
                      Use Discount Now →
                    </Button>
                  </Link>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default SpinWheelPage;
