import React, { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import ResellerAdminLayout from '../../components/layouts/ResellerAdminLayout';
import api from '../../lib/axios';
import { useReseller } from '../../context/ResellerContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

const defaultBrand = {
  panel_name: '',
  logo_url: '',
  favicon_url: '',
  accent_color: '#7c3aed',
  accent_color_2: '#a855f7',
  footer_text: '',
  hide_powered_by: true,
  custom_css: '',
};

export default function ResellerAdminBrand() {
  const { config } = useReseller();
  const [form, setForm] = useState({ ...defaultBrand });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const b = config?.brand || {};
    setForm({
      panel_name: b.panel_name ?? defaultBrand.panel_name,
      logo_url: b.logo_url ?? defaultBrand.logo_url,
      favicon_url: b.favicon_url ?? defaultBrand.favicon_url,
      accent_color: b.accent_color ?? defaultBrand.accent_color,
      accent_color_2: b.accent_color_2 ?? defaultBrand.accent_color_2,
      footer_text: b.footer_text ?? defaultBrand.footer_text,
      hide_powered_by: b.hide_powered_by !== false,
      custom_css: b.custom_css ?? defaultBrand.custom_css,
    });
  }, [config]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/reseller/admin/brand', form);
      toast.success('Branding saved');
      if (typeof window !== 'undefined') {
        document.documentElement.style.setProperty('--accent', form.accent_color);
        document.documentElement.style.setProperty('--accent-2', form.accent_color_2);
        if (form.panel_name) document.title = form.panel_name;
        if (form.favicon_url) {
          let link = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = form.favicon_url;
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResellerAdminLayout title="Branding">
      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <div>
          <Label className="text-gray-400">Panel name</Label>
          <Input
            className="mt-1 bg-white/5 border-white/10"
            value={form.panel_name}
            onChange={(e) => handleChange('panel_name', e.target.value)}
            placeholder="Your SMM Panel"
          />
        </div>
        <div>
          <Label className="text-gray-400">Logo URL</Label>
          <Input
            className="mt-1 bg-white/5 border-white/10"
            value={form.logo_url}
            onChange={(e) => handleChange('logo_url', e.target.value)}
            placeholder="https://..."
          />
          {form.logo_url && (
            <div className="mt-2">
              <img src={form.logo_url} alt="Logo preview" className="h-12 object-contain" onError={(e) => e.target.style.display = 'none'} />
            </div>
          )}
        </div>
        <div>
          <Label className="text-gray-400">Favicon URL</Label>
          <Input
            className="mt-1 bg-white/5 border-white/10"
            value={form.favicon_url}
            onChange={(e) => handleChange('favicon_url', e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-400">Accent color</Label>
            <div className="flex gap-2 mt-1">
              <input
                type="color"
                value={form.accent_color}
                onChange={(e) => handleChange('accent_color', e.target.value)}
                className="w-10 h-10 rounded border border-white/10 cursor-pointer"
              />
              <Input
                className="flex-1 bg-white/5 border-white/10 font-mono"
                value={form.accent_color}
                onChange={(e) => handleChange('accent_color', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-gray-400">Accent color 2 (gradient)</Label>
            <div className="flex gap-2 mt-1">
              <input
                type="color"
                value={form.accent_color_2}
                onChange={(e) => handleChange('accent_color_2', e.target.value)}
                className="w-10 h-10 rounded border border-white/10 cursor-pointer"
              />
              <Input
                className="flex-1 bg-white/5 border-white/10 font-mono"
                value={form.accent_color_2}
                onChange={(e) => handleChange('accent_color_2', e.target.value)}
              />
            </div>
          </div>
        </div>
        <div>
          <Label className="text-gray-400">Footer text</Label>
          <Input
            className="mt-1 bg-white/5 border-white/10"
            value={form.footer_text}
            onChange={(e) => handleChange('footer_text', e.target.value)}
            placeholder="© 2025 Your Panel"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hide_powered_by"
            checked={form.hide_powered_by}
            onChange={(e) => handleChange('hide_powered_by', e.target.checked)}
            className="rounded border-white/20"
          />
          <Label htmlFor="hide_powered_by" className="text-gray-400">Hide "Powered by" (full white-label)</Label>
        </div>
        <div>
          <Label className="text-gray-400">Custom CSS (optional)</Label>
          <textarea
            className="mt-1 w-full h-32 font-mono text-sm bg-white/5 border border-white/10 rounded p-2 text-gray-300"
            value={form.custom_css}
            onChange={(e) => handleChange('custom_css', e.target.value)}
            placeholder=".my-class { color: red; }"
          />
        </div>
        <Button type="submit" disabled={saving} style={{ backgroundColor: 'var(--accent)' }}>
          <Save size={18} className="mr-2" />
          {saving ? 'Saving...' : 'Save branding'}
        </Button>
      </form>
    </ResellerAdminLayout>
  );
}
