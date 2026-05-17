import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import api from '../../lib/axios';
import { toast } from 'sonner';

const AdminBlogEditor = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    status: 'draft',
    excerpt: '',
    featured_image: '',
    category: '',
    tags: '',
    content_html: '',
  });

  useEffect(() => {
    if (!isEdit) return;
    let mounted = true;
    setLoading(true);
    api
      .get(`/admin/blogs/${id}`)
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.post || res.data || {};
        setForm({
          title: data.title || '',
          slug: data.slug || '',
          status: data.status || 'draft',
          excerpt: data.excerpt || '',
          featured_image: data.featured_image || '',
          category: data.category || '',
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
          content_html: data.content_html || '',
        });
      })
      .catch(() => {
        if (!mounted) return;
        toast.error('Failed to load blog post');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id, isEdit]);

  const updateField = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'title' && !isEdit && !prev.slug) {
        next.slug = value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content_html) {
      toast.error('Title and content are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (isEdit) {
        await api.put(`/admin/blogs/${id}`, payload);
        toast.success('Post updated');
      } else {
        await api.post('/admin/blogs', payload);
        toast.success('Post created');
      }
      navigate('/admin/blogs');
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Failed to save blog post';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title={isEdit ? 'Edit Blog Post' : 'New Blog Post'}>
      <div className="flex items-center gap-2 mb-4">
        <FileText size={20} />
        <h1 className="text-xl font-semibold text-white">
          {isEdit ? 'Edit Blog Post' : 'New Blog Post'}
        </h1>
      </div>

      <Card className="glass p-4 sm:p-6 max-w-5xl">
        {loading ? (
          <p className="text-sm text-gray-400">Loading post...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 text-sm">Title</Label>
                <Input
                  value={form.title}
                  onChange={updateField('title')}
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="Amazing growth hacks for Instagram"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Slug</Label>
                <Input
                  value={form.slug}
                  onChange={updateField('slug')}
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="instagram-growth-hacks"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-300 text-sm">Status</Label>
                <select
                  value={form.status}
                  onChange={updateField('status')}
                  className="mt-1 bg-deep-navy border border-white/10 rounded px-3 py-2 text-sm text-gray-100 w-full"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Category</Label>
                <Input
                  value={form.category}
                  onChange={updateField('category')}
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="Instagram, YouTube, TikTok..."
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Tags (comma separated)</Label>
                <Input
                  value={form.tags}
                  onChange={updateField('tags')}
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="instagram, growth, followers"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Featured image URL</Label>
              <Input
                value={form.featured_image}
                onChange={updateField('featured_image')}
                className="mt-1 bg-deep-navy border-white/10"
                placeholder="https://..."
              />
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Short excerpt</Label>
              <textarea
                value={form.excerpt}
                onChange={updateField('excerpt')}
                className="mt-1 w-full min-h-[80px] bg-deep-navy border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
                placeholder="Short summary shown on the blog listing page."
              />
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Content (HTML or basic formatting)</Label>
              <textarea
                value={form.content_html}
                onChange={updateField('content_html')}
                className="mt-1 w-full min-h-[260px] bg-deep-navy border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
                placeholder="<p>Write your article here...</p>"
              />
              <p className="mt-1 text-xs text-gray-500">
                You can paste HTML from your editor, or write simple HTML directly. This will be rendered on the public blog page.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-electric-blue text-black min-w-[120px]"
              >
                {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Post'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 text-gray-200"
                onClick={() => navigate('/admin/blogs')}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </AdminLayout>
  );
};

export default AdminBlogEditor;

