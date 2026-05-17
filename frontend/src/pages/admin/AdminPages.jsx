import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import api from '../../lib/axios';
import { API } from '../../config';
import { useAuth } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';

const AdminPages = () => {
  const { token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [pages, setPages] = useState([]);
  const [newPage, setNewPage] = useState({ title: '', slug: '', content_html: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    api.get('/admin/pages', { headers }).then(res => setPages(res.data.pages || [])).catch(()=>{});
  }, []);

  const savePage = async () => {
    if (!newPage.title || !newPage.slug) { toast.error('Title and slug required'); return; }
    try {
      // Normalize slug: no leading "/", trimmed
      const cleanSlug = String(newPage.slug || '').trim().replace(/^\/+/, '');
      const payload = { ...newPage, slug: cleanSlug };
      if (editingId) {
        const res = await api.put(`/admin/pages/${editingId}`, payload, { headers });
        setPages(pages.map((p) => (p.page_id === editingId ? res.data : p)));
        toast.success('Page updated');
      } else {
        const res = await api.post('/admin/pages', payload, { headers });
        setPages([res.data, ...pages]);
        toast.success('Page created');
      }
      setNewPage({ title: '', slug: '', content_html: '' });
      setEditingId(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save page');
    }
  };

  const startEdit = (page) => {
    setEditingId(page.page_id);
    setNewPage({
      title: page.title || '',
      slug: page.slug || '',
      content_html: page.content_html || '',
    });
  };

  const removePage = async (page) => {
    try {
      await api.delete(`/admin/pages/${page.page_id}`, { headers });
      setPages(pages.filter((p) => p.page_id !== page.page_id));
      if (editingId === page.page_id) {
        setEditingId(null);
        setNewPage({ title: '', slug: '', content_html: '' });
      }
      toast.success('Page removed');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to remove page');
    }
  };

  return (
    <AdminLayout title="Custom Pages">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-6">
        <Card className="glass p-6">
          <h2 className="text-xl text-white font-exo font-bold mb-2">Create Page</h2>
          <p className="text-xs text-gray-400 mb-4">
            Use this to create full custom landing pages. Public URLs will be under
            <span className="font-mono text-gray-300"> /smm-panel/&lt;slug&gt;</span>.
            For example, set slug to
            <span className="font-mono text-gray-300"> youtube-monetization </span>
            or
            <span className="font-mono text-gray-300"> proof </span>
            to override the built-in pages at <span className="font-mono">/youtube-monetization</span> and <span className="font-mono">/proof</span>.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400">Title</Label>
              <Input value={newPage.title} onChange={(e)=>setNewPage({...newPage, title: e.target.value})} className="mt-2 bg-deep-navy border-white/10" />
            </div>
            <div>
              <Label className="text-gray-400">Slug</Label>
              <Input value={newPage.slug} onChange={(e)=>setNewPage({...newPage, slug: e.target.value})} className="mt-2 bg-deep-navy border-white/10" />
            </div>
          </div>
          <div className="mt-4">
            <Label className="text-gray-400">HTML Content</Label>
            <textarea value={newPage.content_html} onChange={(e)=>setNewPage({...newPage, content_html: e.target.value})} className="mt-2 w-full h-32 bg-deep-navy border-white/10 text-white rounded-lg p-3" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button onClick={savePage} className="bg-electric-blue text-black">
              {editingId ? 'Save Changes' : 'Add Page'}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                className="border-white/20 text-gray-200"
                onClick={() => { setEditingId(null); setNewPage({ title: '', slug: '', content_html: '' }); }}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </Card>
        <Card className="glass p-6">
          <h2 className="text-xl text-white font-exo font-bold mb-4">Pages</h2>
          <ul className="space-y-2 text-sm">
            {pages.map((p) => (
              <li key={p.page_id} className="flex flex-wrap items-center gap-3 justify-between text-gray-300">
                <div>
                  <span className="font-semibold">{p.title}</span>
                  <span className="text-gray-500 ml-2">Slug:</span>
                  <span className="ml-1 font-mono text-gray-200">{p.slug}</span>
                  <span className="text-gray-500 ml-3">Public URL:</span>
                  <span className="ml-1 font-mono text-gray-200">/smm-panel/{p.slug}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    onClick={() => startEdit(p)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 text-xs text-red-400"
                    onClick={() => removePage(p)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPages;
