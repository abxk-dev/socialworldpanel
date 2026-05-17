import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Gift, Loader2, Copy, CheckCircle, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import api from "../lib/axios";
import { toast } from "sonner";

const FreeTrialBanner = () => {
  const [check, setCheck] = useState({
    loading: true,
    available: false,
    reason: null,
    order_id: null,
    service_name: "",
    quantity: 50,
    link_placeholder: "Paste your link",
    disclaimer: "One per account. Results typically in 1–6 hours.",
    modal_title: "Claim Your Free Trial",
    button_text: "Claim Now — It's Free!",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [link, setLink] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(null);
  const [trialOrderStatus, setTrialOrderStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await api.get("/free-trial/check", { withCredentials: true });
        if (cancelled) return;
        const d = res.data || {};
        setCheck({
          loading: false,
          available: !!(d.available ?? d.eligible),
          reason: d.reason || null,
          order_id: d.order_id || d.trial_order?.order_id || null,
          service_name: d.service_name || "Free trial",
          quantity: d.quantity ?? 50,
          link_placeholder: d.link_placeholder ?? "Paste your link",
          disclaimer: d.disclaimer ?? "One per account. Results typically in 1–6 hours.",
          modal_title: d.modal_title ?? "Claim Your Free Trial",
          button_text: d.button_text ?? "Claim Now — It's Free!",
        });
      } catch (e) {
        if (cancelled) return;
        setCheck((c) => ({ ...c, loading: false, available: false, reason: "Unavailable" }));
      }
    };
    run();
    return () => { cancelled = true; };
  }, [claimed]);

  useEffect(() => {
    if (check.reason !== "Already used" || !check.order_id || check.loading) return;
    let cancelled = false;
    api.get("/orders?limit=100", { withCredentials: true })
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.orders ?? res.data ?? [];
        const order = Array.isArray(list) ? list.find((o) => String(o.order_id) === String(check.order_id)) : null;
        if (order && order.status) setTrialOrderStatus(order.status);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [check.reason, check.order_id, check.loading]);

  const handleClaim = async () => {
    const trimmed = (link || "").trim();
    if (!trimmed) {
      toast.error("Please enter your link");
      return;
    }
    setClaiming(true);
    try {
      const res = await api.post("/free-trial/claim", { link: trimmed }, { withCredentials: true });
      const d = res.data || {};
      setClaimed({ order_id: d.order_id, message: d.message });
      setModalOpen(false);
      setLink("");
      toast.success("Free trial order placed!");
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.detail || "Claim failed";
      toast.error(msg);
    } finally {
      setClaiming(false);
    }
  };

  const copyOrderId = (id) => {
    if (!id) return;
    try {
      navigator.clipboard.writeText(String(id));
      toast.success("Order ID copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  if (check.loading) return null;
  if (check.available && !claimed) {
    return (
      <>
        <div className="free-trial-banner rounded-xl p-4 md:p-5 mb-5 relative overflow-hidden border border-[rgba(34,197,94,0.3)]">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-exo font-bold text-white flex items-center gap-2">
                <Gift className="text-[#22c55e]" size={22} />
                You have a FREE trial waiting!
              </h3>
              <p className="text-gray-300 mt-1">
                Get {check.quantity} {check.service_name} — no credit card needed
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold"
                onClick={() => setModalOpen(true)}
              >
                Claim Free Trial
              </Button>
              <Link to="/dashboard/new-order">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="glass border-[rgba(34,197,94,0.3)] max-w-md">
            <DialogHeader>
              <DialogTitle className="font-exo text-white flex items-center gap-2">
                <Gift className="text-[#22c55e]" size={24} />
                {check.modal_title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-gray-300 text-sm">
                {check.service_name} — paste your link below.
              </p>
              <div>
                <Label className="text-gray-400">Your link</Label>
                <Input
                  placeholder={check.link_placeholder}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="mt-2 bg-[#0a0a0f] border-white/10 text-white"
                />
              </div>
              {check.disclaimer ? (
                <p className="text-gray-500 text-xs">{check.disclaimer}</p>
              ) : null}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={claiming}>
                Cancel
              </Button>
              <Button
                className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold"
                onClick={handleClaim}
                disabled={claiming}
              >
                {claiming ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  check.button_text
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (claimed) {
    return (
      <div className="rounded-xl p-4 mb-5 border border-neon-green/30 bg-neon-green/5">
        <p className="text-white font-medium flex items-center gap-2">
          <CheckCircle size={20} className="text-neon-green" />
          Order placed! Check your orders page.
        </p>
        {claimed.order_id && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-gray-400 text-sm">Order ID:</span>
            <code className="text-neon-green font-mono text-sm">{claimed.order_id}</code>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-gray-400 hover:text-white"
              onClick={() => copyOrderId(claimed.order_id)}
            >
              <Copy size={14} />
            </Button>
          </div>
        )}
        <Link to="/dashboard/orders" className="inline-block mt-2 text-neon-green hover:underline text-sm">
          View orders →
        </Link>
      </div>
    );
  }

  if (check.reason === "Already used" && check.order_id && trialOrderStatus) {
    const completed = trialOrderStatus === "completed";
    return (
      <div className="rounded-xl p-4 mb-5 border border-white/10 bg-white/5">
        {completed ? (
          <>
            <p className="text-white font-medium flex items-center gap-2">
              <CheckCircle size={20} className="text-neon-green" />
              Your trial delivered {check.quantity} views!
            </p>
            <p className="text-gray-400 text-sm mt-1">Want more? Browse services below.</p>
            <Link to="/dashboard/new-order" className="inline-block mt-2 text-neon-green hover:underline text-sm">
              Browse services →
            </Link>
          </>
        ) : (
          <>
            <p className="text-gray-300 flex items-center gap-2">
              <Clock size={18} className="text-yellow-400" />
              Your trial is processing...
            </p>
            <div className="mt-2 h-1.5 w-full max-w-xs bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-neon-green/60 rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
            <Link to="/dashboard/orders" className="inline-block mt-2 text-electric-blue hover:underline text-sm">
              View orders →
            </Link>
          </>
        )}
      </div>
    );
  }

  if (check.reason === "Already used" && check.order_id) {
    return (
      <div className="rounded-xl p-4 mb-5 border border-white/10 bg-white/5">
        <p className="text-gray-300 flex items-center gap-2">
          <Clock size={18} className="text-yellow-400" />
          Your trial is processing or completed. Check your orders.
        </p>
        <Link to="/dashboard/orders" className="inline-block mt-2 text-electric-blue hover:underline text-sm">
          View orders →
        </Link>
      </div>
    );
  }

  if (check.reason === "Already used" || check.reason === "IP already used trial") {
    return (
      <div className="rounded-xl p-4 mb-5 border border-white/10 bg-white/5">
        <p className="text-gray-300 flex items-center gap-2">
          <CheckCircle size={18} className="text-neon-green" />
          You’ve already used your free trial. Want more? Browse services below.
        </p>
        <Link to="/dashboard/new-order" className="inline-block mt-2 text-neon-green hover:underline text-sm">
          Browse services →
        </Link>
      </div>
    );
  }

  return null;
};

export default FreeTrialBanner;
