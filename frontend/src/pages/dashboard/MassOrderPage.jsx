import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutList,
  Search,
  Upload,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Rocket,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useDashboardAuth } from '../../hooks/useDashboardAuth';
import { useReseller } from '../../context/ResellerContext';
import { useSettings } from '../../App';
import { useCurrency } from '../../context/CurrencyContext';
import { useFormatRate } from '../../hooks/useFormatRate';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';

const INPUT_TAB = 'paste';
const CSV_TAB = 'csv';

/** Parse CSV/text: one link per line, or "link,quantity" per line. Returns { link, quantity }[]. */
function parseLinksInput(text, defaultQty = 1000) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      const link = parts[0];
      const qty = parseInt(parts[1], 10) || defaultQty;
      if (link) out.push({ link, quantity: qty });
    } else if (parts[0]) {
      out.push({ link: parts[0], quantity: defaultQty });
    }
  }
  return out;
}

/** Parse file (CSV/txt) client-side. */
function parseFile(file, defaultQty) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseLinksInput(reader.result, defaultQty);
        resolve(rows);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file, 'UTF-8');
  });
}

function formatDripEstimate(totalMinutes) {
  if (totalMinutes < 60) return `~${Math.round(totalMinutes)} minutes`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hours < 24) return mins ? `~${hours}h ${mins}m` : `~${hours} hours`;
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  if (days >= 1) return h ? `~${days} day(s) ${h}h` : `~${days} day(s)`;
  return `~${hours} hours`;
}

const MassOrderPage = () => {
  const { user, token } = useDashboardAuth();
  const { isReseller } = useReseller();
  const { settings } = useSettings();
  const { formatPrice } = useCurrency();
  const { formatPriceWithRateDecimals } = useFormatRate();
  const navigate = useNavigate();

  const massOrderEnabled = settings.mass_order_enabled !== false;
  const maxLinks = Math.min(1000, Math.max(1, parseInt(settings.mass_order_max_links, 10) || 100));
  const minInterval = Math.max(1, parseInt(settings.mass_order_min_interval, 10) || 1);
  const maxInterval = Math.min(10080, Math.max(60, parseInt(settings.mass_order_max_interval, 10) || 1440));

  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [quantityMode, setQuantityMode] = useState('same'); // 'same' | 'per_link'
  const [sameQuantity, setSameQuantity] = useState(1000);
  const [rows, setRows] = useState([]);
  const [inputTab, setInputTab] = useState(INPUT_TAB);
  const [pasteText, setPasteText] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [deliveryType, setDeliveryType] = useState('instant');
  const [dripInterval, setDripInterval] = useState(Math.max(minInterval, 5));
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isReseller || !token) return;
    setLoadingServices(true);
    Promise.all([
      api.get('/services/categories', { withCredentials: true }).then((r) => r.data),
      api.get('/services', { withCredentials: true }).then((r) => (Array.isArray(r.data) ? r.data : r.data?.services || [])),
    ])
      .then(([catData, svcList]) => {
        setCategories(Array.isArray(catData) ? catData : catData?.categories || []);
        setServices(Array.isArray(svcList) ? svcList : []);
      })
      .catch(() => {
        toast.error('Failed to load services');
      })
      .finally(() => setLoadingServices(false));
  }, [token, isReseller]);

  const categoryName = (categoryId) => {
    const c = categories.find((x) => x.category_id === categoryId);
    return c?.name || categoryId || '—';
  };

  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return services;
    const raw = serviceSearch.trim();
    const q = raw.toLowerCase();
    return services.filter((s) => {
      const nameMatch = s.name && s.name.toLowerCase().includes(q);
      const idStr = s.service_id != null ? String(s.service_id) : '';
      const idMatch = idStr.toLowerCase().includes(q);
      const categoryMatch = (categoryName(s.category_id) || '').toLowerCase().includes(q);
      return nameMatch || idMatch || categoryMatch;
    });
  }, [services, serviceSearch, categories]);

  const balance = user?.balance ?? 0;
  const rate = selectedService ? parseFloat(selectedService.rate || selectedService.price_per_1000 || 0) : 0;
  const minOrder = selectedService ? Math.max(0, parseInt(selectedService.min_order, 10) || 0) : 0;
  const maxOrder = selectedService ? Math.max(1, parseInt(selectedService.max_order, 10) || 1000000) : 1000000;

  const totalCharge = useMemo(() => {
    if (!rate || !rows.length) return 0;
    return rows.reduce((sum, r) => {
      const qty = Math.max(minOrder, Math.min(maxOrder, parseInt(r.quantity, 10) || minOrder));
      return sum + parseFloat(((rate * qty) / 1000).toFixed(4));
    }, 0);
  }, [rate, rows, minOrder, maxOrder]);

  const totalChargeRounded = useMemo(() => parseFloat(totalCharge.toFixed(4)), [totalCharge]);
  const balanceAfter = balance - totalChargeRounded;
  const insufficientBalance = balanceAfter < 0;

  const validRows = useMemo(() => {
    return rows.filter((r) => r.link && r.link.trim());
  }, [rows]);

  const validationErrors = useMemo(() => {
    const errs = [];
    validRows.forEach((r, i) => {
      const qty = parseInt(r.quantity, 10);
      if (Number.isNaN(qty) || qty < minOrder || qty > maxOrder) errs.push(`Row ${i + 1}: quantity must be ${minOrder}–${maxOrder}`);
    });
    if (validRows.length > maxLinks) errs.push(`Maximum ${maxLinks} links allowed.`);
    if (!selectedService) errs.push('Select a service.');
    if (deliveryType === 'drip' && (dripInterval < minInterval || dripInterval > maxInterval)) errs.push(`Drip interval must be ${minInterval}–${maxInterval} minutes.`);
    return errs;
  }, [validRows, minOrder, maxOrder, maxLinks, selectedService, deliveryType, dripInterval, minInterval, maxInterval]);

  const canSubmit = validRows.length > 0 && validationErrors.length === 0 && !insufficientBalance && !submitting;

  const dripEstimateMinutes = deliveryType === 'drip' ? validRows.length * dripInterval : 0;

  const handleParsePaste = () => {
    const qty = quantityMode === 'same' ? Math.max(minOrder, Math.min(maxOrder, sameQuantity)) : 1000;
    const parsed = parseLinksInput(pasteText, qty);
    if (quantityMode === 'same' && selectedService) {
      const fixed = Math.max(minOrder, Math.min(maxOrder, sameQuantity));
      setRows(parsed.map((p) => ({ link: p.link.trim(), quantity: fixed })));
    } else {
      setRows(parsed.map((p) => ({ link: p.link.trim(), quantity: Math.max(minOrder, Math.min(maxOrder, p.quantity)) })));
    }
    setPasteText('');
    toast.success(`Parsed ${parsed.length} link(s)`);
  };

  const handleParseFile = async () => {
    if (!csvFile) {
      toast.error('Select a file first');
      return;
    }
    const qty = quantityMode === 'same' ? Math.max(minOrder, Math.min(maxOrder, sameQuantity)) : 1000;
    try {
      const parsed = await parseFile(csvFile, qty);
      if (quantityMode === 'same' && selectedService) {
        const fixed = Math.max(minOrder, Math.min(maxOrder, sameQuantity));
        setRows(parsed.map((p) => ({ link: p.link.trim(), quantity: fixed })));
      } else {
        setRows(parsed.map((p) => ({ link: p.link.trim(), quantity: Math.max(minOrder, Math.min(maxOrder, p.quantity)) })));
      }
      setCsvFile(null);
      toast.success(`Parsed ${parsed.length} link(s)`);
    } catch (e) {
      toast.error('Failed to parse file');
    }
  };

  const addRow = () => {
    const qty = quantityMode === 'same' ? Math.max(minOrder, Math.min(maxOrder, sameQuantity)) : minOrder;
    setRows((prev) => [...prev, { link: '', quantity: qty }]);
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const downloadDemoCsv = () => {
    const csv = 'link,quantity\nhttps://instagram.com/p/EXAMPLE1,1000\nhttps://instagram.com/p/EXAMPLE2,500\nhttps://instagram.com/p/EXAMPLE3,250';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mass-order-demo.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePlaceMassOrder = async () => {
    if (!canSubmit || !selectedService) return;
    const payload = {
      service_id: selectedService.service_id,
      links: validRows.map((r) => ({ link: r.link.trim(), quantity: Math.max(minOrder, Math.min(maxOrder, parseInt(r.quantity, 10) || minOrder)) })),
      delivery_type: deliveryType,
      drip_interval_minutes: deliveryType === 'drip' ? dripInterval : undefined,
    };
    setSubmitting(true);
    try {
      const res = await api.post('/orders/mass', payload, { withCredentials: true });
      toast.success(res.data?.message || 'Mass order placed');
      navigate('/dashboard/orders', { state: { tab: 'mass' } });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to place mass order';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isReseller) {
    return (
      <DashboardLayout title="Mass Order">
        <Card className="glass p-6 border-cyber-purple/20">
          <p className="text-[var(--text-muted)]">Mass order is not available for reseller accounts.</p>
        </Card>
      </DashboardLayout>
    );
  }

  if (!massOrderEnabled) {
    return (
      <DashboardLayout title="Mass Order">
        <Card className="glass p-6 border-cyber-purple/20">
          <p className="text-[var(--warning)]">Mass ordering is currently disabled.</p>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mass Order">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Step 1 — Select Service */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass p-6 border-cyber-purple/20">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <LayoutList className="text-cyber-purple" size={20} />
              Step 1 — Select Service
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
              <Input
                placeholder="Search by name, ID or category..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="pl-10 bg-deep-navy border-[var(--border)] mb-3"
              />
            </div>
            {loadingServices ? (
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <Loader2 size={18} className="animate-spin" />
                Loading services...
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--border)]">
                {filteredServices.slice(0, 50).map((s) => (
                  <button
                    key={s.service_id}
                    type="button"
                    onClick={() => setSelectedService(s)}
                    className={`w-full text-left px-4 py-2 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)] flex justify-between items-center ${
                      selectedService?.service_id === s.service_id ? 'bg-cyber-purple/20 text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="truncate">{s.name || s.service_id}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-2 shrink-0">
                      {categoryName(s.category_id)} | {formatPriceWithRateDecimals(parseFloat(s.rate || s.price_per_1000 || 0))}/1k | {s.min_order}–{s.max_order}
                    </span>
                  </button>
                ))}
                {filteredServices.length === 0 && <div className="p-4 text-[var(--text-muted)]">No services found.</div>}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Step 2 — Add Links */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="glass p-6 border-cyber-purple/20">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Step 2 — Add Links</h2>
            <div className="mb-4">
              <Label className="text-[var(--text-muted)] block mb-2">Quantity mode</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={quantityMode === 'same'} onChange={() => setQuantityMode('same')} className="rounded" />
                  <span className="text-[var(--text-primary)]">Same for all</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={quantityMode === 'per_link'} onChange={() => setQuantityMode('per_link')} className="rounded" />
                  <span className="text-[var(--text-primary)]">Different per link</span>
                </label>
              </div>
              {quantityMode === 'same' && selectedService && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={minOrder}
                    max={maxOrder}
                    value={sameQuantity}
                    onChange={(e) => setSameQuantity(parseInt(e.target.value, 10) || minOrder)}
                    className="w-28 bg-deep-navy border-[var(--border)]"
                  />
                  <span className="text-[var(--text-muted)] text-sm">quantity</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setInputTab(INPUT_TAB)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${inputTab === INPUT_TAB ? 'bg-cyber-purple text-[var(--text-primary)]' : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
              >
                Paste Links
              </button>
              <button
                type="button"
                onClick={() => setInputTab(CSV_TAB)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${inputTab === CSV_TAB ? 'bg-cyber-purple text-[var(--text-primary)]' : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
              >
                Upload CSV
              </button>
            </div>

            {inputTab === INPUT_TAB && (
              <div className="space-y-3">
                <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] p-3 text-sm text-[var(--text-secondary)] space-y-1">
                  {quantityMode === 'same' ? (
                    <>
                      <p className="font-medium text-[var(--text-primary)]">Same quantity for all links</p>
                      <p>Enter one link per line. The quantity you set above will apply to every link.</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Example:</p>
                      <pre className="text-xs text-[var(--text-muted)] bg-black/20 p-2 rounded overflow-x-auto">
                        https://instagram.com/p/ABC{'\n'}https://instagram.com/p/DEF
                      </pre>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-[var(--text-primary)]">Different quantity per link</p>
                      <p>Enter one link per line, or use the format: <code className="bg-[var(--bg-hover)] px-1 rounded">link,quantity</code> on each line. You can edit quantities in the table after parsing.</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Example (link only — table quantity used):</p>
                      <pre className="text-xs text-[var(--text-muted)] bg-black/20 p-2 rounded overflow-x-auto">
                        https://instagram.com/p/ABC{'\n'}https://instagram.com/p/DEF
                      </pre>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Example (link and quantity):</p>
                      <pre className="text-xs text-[var(--text-muted)] bg-black/20 p-2 rounded overflow-x-auto">
                        https://instagram.com/p/ABC,1000{'\n'}https://instagram.com/p/DEF,500
                      </pre>
                    </>
                  )}
                </div>
                <Textarea
                  placeholder="Paste your links here"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={5}
                  className="bg-deep-navy border-[var(--border)] font-mono text-sm"
                />
                <Button type="button" onClick={handleParsePaste} variant="outline" className="border-[var(--border)]">
                  Parse Links
                </Button>
              </div>
            )}

            {inputTab === CSV_TAB && (
              <div className="space-y-3">
                <p className="text-sm text-[var(--text-muted)]">
                  Upload a CSV or TXT file with one link per line, or use the format <code className="bg-[var(--bg-hover)] px-1 rounded">link,quantity</code> on each line. First line can be a header (link,quantity).
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="bg-deep-navy border-[var(--border)] max-w-xs"
                  />
                  <Button type="button" onClick={handleParseFile} variant="outline" className="border-[var(--border)]" disabled={!csvFile}>
                    <Upload size={14} className="mr-1" />
                    Parse File
                  </Button>
                  <button
                    type="button"
                    onClick={downloadDemoCsv}
                    className="text-sm text-cyber-purple hover:text-cyber-purple/80 underline"
                  >
                    Download demo CSV
                  </button>
                </div>
              </div>
            )}

            {rows.length > 0 && (
              <>
                <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)]">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-[var(--bg-card)]">
                      <tr>
                        <th className="text-left p-2 text-[var(--text-muted)] font-medium w-10">#</th>
                        <th className="text-left p-2 text-[var(--text-muted)] font-medium">Link</th>
                        <th className="text-left p-2 text-[var(--text-muted)] font-medium w-24">Quantity</th>
                        <th className="text-left p-2 text-[var(--text-muted)] font-medium w-20">Cost</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const qty = Math.max(minOrder, Math.min(maxOrder, parseInt(r.quantity, 10) || minOrder));
                        const cost = rate ? (rate * qty) / 1000 : 0;
                        const validQty = !Number.isNaN(qty) && qty >= minOrder && qty <= maxOrder;
                        const validLink = r.link && r.link.trim();
                        return (
                          <tr key={i} className="border-t border-[var(--border)]">
                            <td className="p-2 text-[var(--text-muted)]">{i + 1}</td>
                            <td className="p-2">
                              <Input
                                value={r.link}
                                onChange={(e) => updateRow(i, 'link', e.target.value)}
                                placeholder="https://..."
                                className="bg-deep-navy border-[var(--border)] text-sm"
                              />
                              {!validLink && r.link !== undefined && (
                                <span className="text-xs text-[var(--error)] flex items-center gap-1 mt-0.5">
                                  <AlertCircle size={12} /> Empty link
                                </span>
                              )}
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min={minOrder}
                                max={maxOrder}
                                value={r.quantity}
                                onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                                className="bg-deep-navy border-[var(--border)] w-20"
                              />
                              {!validQty && selectedService && (
                                <span className="text-xs text-[var(--warning)] flex items-center gap-1 mt-0.5">
                                  <AlertTriangle size={12} /> {minOrder}–{maxOrder}
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-electric-blue">{rate ? formatPrice(cost) : '—'}</td>
                            <td className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRow(i)}
                                className="text-[var(--error)] hover:text-[var(--error)]"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addRow} className="mt-2 border-[var(--border)]">
                  <Plus size={14} className="mr-1" />
                  Add row
                </Button>
                {rows.length > maxLinks && (
                  <p className="text-[var(--warning)] text-sm mt-2">Maximum {maxLinks} links allowed. Remove some rows.</p>
                )}
              </>
            )}
          </Card>
        </motion.div>

        {/* Step 3 — Delivery & Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass p-6 border-cyber-purple/20">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Step 3 — Delivery & Summary</h2>
            <div className="mb-4">
              <Label className="text-[var(--text-muted)] block mb-2">Delivery type</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={deliveryType === 'instant'} onChange={() => setDeliveryType('instant')} className="rounded" />
                  <span className="text-[var(--text-primary)]">Instant — all orders placed immediately</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={deliveryType === 'drip'} onChange={() => setDeliveryType('drip')} className="rounded" />
                  <span className="text-[var(--text-primary)]">Drip feed — one order every</span>
                </label>
                {deliveryType === 'drip' && (
                  <>
                    <Input
                      type="number"
                      min={minInterval}
                      max={maxInterval}
                      value={dripInterval}
                      onChange={(e) => setDripInterval(parseInt(e.target.value, 10) || minInterval)}
                      className="w-20 bg-deep-navy border-[var(--border)]"
                    />
                    <span className="text-[var(--text-muted)]">minutes</span>
                    {validRows.length > 0 && (
                      <span className="text-cyber-purple text-sm">Estimated: {formatDripEstimate(dripEstimateMinutes)}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] p-4 mb-4 space-y-2">
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Service</span>
                <span className="text-[var(--text-primary)]">{selectedService?.name || '—'}</span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Total links</span>
                <span className="text-[var(--text-primary)]">{validRows.length}</span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Total quantity</span>
                <span className="text-[var(--text-primary)]">
                  {validRows.reduce((s, r) => s + (parseInt(r.quantity, 10) || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Total cost</span>
                <span className="text-electric-blue font-bold">{formatPrice(totalChargeRounded)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Your balance</span>
                <span className="text-[var(--text-primary)]">{formatPrice(balance)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>After order</span>
                <span className={insufficientBalance ? 'text-[var(--error)]' : 'text-neon-green'}>{formatPrice(balanceAfter)}</span>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-[var(--warning-bg)] border border-[var(--warning)]/30 text-[var(--warning)] text-sm">
                {validationErrors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            )}

            <Button
              onClick={handlePlaceMassOrder}
              disabled={!canSubmit}
              className="w-full bg-cyber-purple hover:bg-cyber-purple/90 text-[var(--text-primary)] font-bold py-6"
            >
              {submitting ? (
                <Loader2 size={20} className="animate-spin mx-auto" />
              ) : (
                <>
                  <Rocket size={18} className="mr-2" />
                  Place Mass Order
                </>
              )}
            </Button>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default MassOrderPage;
