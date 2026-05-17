import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FileText,
  Pencil,
  Trash2,
  MoreHorizontal,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  Loader2,
} from 'lucide-react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';

const postId = (post) => (post._id != null ? String(post._id) : '');

const AdminBlogList = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchPosts = useCallback(() => {
    return api
      .get('/admin/blogs')
      .then((res) => {
        const data = res.data || {};
        setPosts(data.posts || data.items || []);
      })
      .catch(() => {
        setPosts([]);
        toast.error('Failed to load blog posts');
      });
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchPosts().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [fetchPosts]);

  const setPublished = async (post, publish) => {
    const id = postId(post);
    if (!id) return;
    setBusyId(id);
    try {
      const body = publish
        ? { status: 'published' }
        : { status: 'draft' };
      await api.put(`/admin/blogs/${id}`, body);
      toast.success(publish ? 'Post published' : 'Post unpublished (hidden from public blog)');
      await fetchPosts();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = postId(deleteTarget);
    setBusyId(id);
    try {
      await api.delete(`/admin/blogs/${id}`);
      toast.success('Post deleted');
      setDeleteTarget(null);
      await fetchPosts();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const copySlugUrl = (slug) => {
    const path = `${window.location.origin}/blog/${slug}`;
    navigator.clipboard.writeText(path).then(
      () => toast.success('Link copied'),
      () => toast.error('Could not copy')
    );
  };

  return (
    <AdminLayout title="Blog Posts">
      <Toaster position="top-right" theme="dark" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <FileText size={20} />
          Blog Posts
        </h1>
        <Button asChild>
          <Link to="/admin/blogs/new" className="flex items-center gap-2">
            <Plus size={16} />
            New Post
          </Link>
        </Button>
      </div>

      <Card className="glass p-4 overflow-x-auto">
        {loading ? (
          <div className="text-gray-400 text-sm">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-gray-400 text-sm">
            No posts yet. Click &quot;New Post&quot; to create your first blog article.
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-white/5">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Slug</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Published</th>
                <th className="py-2 pr-2 text-right w-[200px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const id = postId(post);
                const isBusy = busyId === id;
                const published = post.status === 'published';
                return (
                  <tr key={id || post.slug} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-4 text-white max-w-[280px]">
                      <span className="line-clamp-2">{post.title || '(untitled)'}</span>
                    </td>
                    <td className="py-2 pr-4 text-gray-400 break-all align-top">{post.slug}</td>
                    <td className="py-2 pr-4 align-top">
                      <span
                        className={
                          published
                            ? 'px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300'
                            : 'px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-300'
                        }
                      >
                        {post.status || 'draft'}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-400 align-top">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="py-2 pl-2 text-right align-top whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-gray-300 hover:text-white"
                          asChild
                          disabled={isBusy}
                        >
                          <Link to={`/admin/blogs/${id}/edit`} title="Edit">
                            <Pencil size={16} />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-gray-300 hover:text-white"
                          title={published ? 'Unpublish (disable on site)' : 'Publish (enable on site)'}
                          disabled={isBusy}
                          onClick={() => setPublished(post, !published)}
                        >
                          {isBusy ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : published ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Delete"
                          disabled={isBusy}
                          onClick={() => setDeleteTarget(post)}
                        >
                          <Trash2 size={16} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-400"
                              disabled={isBusy}
                              aria-label="More actions"
                            >
                              <MoreHorizontal size={18} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="z-[10050] bg-[#0f1729] border border-white/10 text-gray-100"
                          >
                            <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10">
                              <Link to={`/admin/blogs/${id}/edit`}>Edit post</Link>
                            </DropdownMenuItem>
                            {published && post.slug ? (
                              <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10">
                                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="mr-2 inline size-4" />
                                  View on site
                                </a>
                              </DropdownMenuItem>
                            ) : null}
                            {post.slug ? (
                              <DropdownMenuItem
                                className="cursor-pointer focus:bg-white/10"
                                onClick={() => copySlugUrl(post.slug)}
                              >
                                <Copy className="mr-2 inline size-4" />
                                Copy public URL
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              className="cursor-pointer focus:bg-white/10"
                              onClick={() => setPublished(post, !published)}
                            >
                              {published ? 'Unpublish (draft)' : 'Publish now'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300"
                              onClick={() => setDeleteTarget(post)}
                            >
                              <Trash2 className="mr-2 inline size-4" />
                              Delete…
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="glass border-white/10 bg-[#0f1729] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {deleteTarget?.title ? `“${deleteTarget.title.slice(0, 80)}${deleteTarget.title.length > 80 ? '…' : ''}” will be removed permanently.` : 'This post will be removed permanently.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-transparent text-gray-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-600/90 text-white"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminBlogList;
