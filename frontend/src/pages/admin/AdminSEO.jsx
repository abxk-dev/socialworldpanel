import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../App';
import { useSettings } from '../../App';
import api from '../../lib/axios';
import { API } from '../../config';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import { Search } from 'lucide-react';

const reqOpts = (headers) => ({ headers, withCredentials: true });

const PAGE_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/services', name: 'Services' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/api-docs', name: 'API Docs' },
  { path: '/blog', name: 'Blog' },
  { path: '/about', name: 'About' },
  { path: '/contact', name: 'Contact' },
  { path: '/terms', name: 'Terms' },
  { path: '/privacy', name: 'Privacy' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
];

const AdminSEO = () => {
  const { token } = useAuth();
  const { refetchSettings } = useSettings();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [seoMeta, setSeoMeta] = useState({ title: '', description: '', keywords: '', og_image: '' });
  const [seoPages, setSeoPages] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchSeo = async () => {
    const res = await api.get('/admin/meta', reqOpts(headers));
    const nextMeta = res.data?.seo_meta || {};
    const nextPages = res.data?.seo_pages || {};
    setSeoMeta((m) => ({ ...m, ...nextMeta }));
    setSeoPages(nextPages);
    return { nextMeta, nextPages };
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        await fetchSeo();
      } catch (e) {
        toast.error('Failed to load SEO settings');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token]);

  const getPageMeta = (path) => seoPages[path] || { title: '', description: '', keywords: '', og_image: '' };

  const setPageMeta = (path, data) => {
    setSeoPages((p) => ({
      ...p,
      [path]: { ...getPageMeta(path), ...data },
    }));
  };

  const saveGlobal = async () => {
    try {
      await api.put('/admin/meta', { seo_meta: seoMeta, seo_pages: seoPages }, reqOpts(headers));
      await fetchSeo();
      await refetchSettings?.();
      toast.success('SEO settings saved and verified');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save');
    }
  };

  const savePage = async (path) => {
    try {
      const updated = { ...seoPages };
      if (!Object.keys(getPageMeta(path)).some((k) => getPageMeta(path)[k])) {
        delete updated[path];
      } else {
        updated[path] = getPageMeta(path);
      }
      await api.put('/admin/meta', { seo_meta: seoMeta, seo_pages: updated }, reqOpts(headers));
      await fetchSeo();
      await refetchSettings?.();
      toast.success(`${PAGE_ROUTES.find((r) => r.path === path)?.name || path} SEO saved and verified`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save');
    }
  };

  if (loading) {
    return (
      <AdminLayout title="SEO">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-10 h-10 border-2 border-electric-blue border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="SEO">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-6">
        <Card className="glass p-6">
          <h2 className="text-xl font-exo font-bold text-white mb-4 flex items-center gap-2">
            <Search size={22} />
            Default Meta (all pages)
          </h2>
          <p className="text-gray-400 text-sm mb-4">Used when no per-page meta is set</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400">Title</Label>
              <Input
                value={seoMeta.title}
                onChange={(e) => setSeoMeta({ ...seoMeta, title: e.target.value })}
                className="mt-2 bg-deep-navy border-white/10"
                placeholder="Site title"
              />
            </div>
            <div>
              <Label className="text-gray-400">Keywords</Label>
              <Input
                value={seoMeta.keywords}
                onChange={(e) => setSeoMeta({ ...seoMeta, keywords: e.target.value })}
                className="mt-2 bg-deep-navy border-white/10"
                placeholder="keyword1, keyword2"
              />
            </div>
          </div>
          <div className="mt-4">
            <Label className="text-gray-400">Description</Label>
            <textarea
              value={seoMeta.description}
              onChange={(e) => setSeoMeta({ ...seoMeta, description: e.target.value })}
              className="mt-2 w-full h-20 bg-deep-navy border-white/10 text-white rounded-lg p-3"
              placeholder="Meta description"
            />
          </div>
          <div className="mt-4">
            <Label className="text-gray-400">OG Image URL</Label>
            <Input
              value={seoMeta.og_image}
              onChange={(e) => setSeoMeta({ ...seoMeta, og_image: e.target.value })}
              className="mt-2 bg-deep-navy border-white/10"
              placeholder="https://... or /path/to/image.jpg"
            />
          </div>
          <Button onClick={saveGlobal} className="mt-4 bg-electric-blue text-black">
            Save Default Meta
          </Button>
        </Card>

        <Card className="glass p-6">
          <h2 className="text-xl font-exo font-bold text-white mb-4">Per-Page Meta</h2>
          <p className="text-gray-400 text-sm mb-6">Override meta for specific pages. Leave empty to use default.</p>
          <div className="space-y-6">
            {PAGE_ROUTES.map(({ path, name }) => (
              <div key={path} className="border border-white/10 rounded-lg p-4">
                <h3 className="text-white font-bold mb-3">{name} ({path})</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-500 text-xs">Title</Label>
                    <Input
                      value={getPageMeta(path).title}
                      onChange={(e) => setPageMeta(path, { title: e.target.value })}
                      className="mt-1 bg-deep-navy border-white/10 text-sm"
                      placeholder={`Override for ${name}`}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">Keywords</Label>
                    <Input
                      value={getPageMeta(path).keywords}
                      onChange={(e) => setPageMeta(path, { keywords: e.target.value })}
                      className="mt-1 bg-deep-navy border-white/10 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-gray-500 text-xs">Description</Label>
                  <textarea
                    value={getPageMeta(path).description}
                    onChange={(e) => setPageMeta(path, { description: e.target.value })}
                    className="mt-1 w-full h-16 bg-deep-navy border-white/10 text-white rounded p-2 text-sm"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => savePage(path)} className="mt-3 border-electric-blue/50 text-electric-blue">
                  Save {name}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSEO;
