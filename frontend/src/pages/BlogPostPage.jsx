import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../lib/axios';

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get(`/blogs/${slug}`)
      .then((res) => {
        if (!mounted) return;
        const data = res.data || {};
        const p = data.post || (data.title ? data : null);
        setPost(p);
      })
      .catch(() => {
        if (!mounted) return;
        setPost(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  const publishedDate = post?.published_at
    ? new Date(post.published_at).toLocaleDateString()
    : null;

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />
      <div className="pt-navbar">
        <main className="px-4 sm:px-6 py-10 sm:py-16">
          <div className="max-w-4xl mx-auto">
            {loading && (
              <p className="text-gray-400 text-sm">Loading article...</p>
            )}
            {!loading && !post && (
              <p className="text-gray-400 text-sm">Article not found.</p>
            )}
            {post && (
              <>
                <h1 className="text-3xl sm:text-4xl font-exo font-bold text-white mb-3">
                  {post.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-6">
                  {post.category && (
                    <span className="bg-electric-blue/20 text-electric-blue px-2 py-1 rounded">
                      {post.category}
                    </span>
                  )}
                  {publishedDate && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {publishedDate}
                    </span>
                  )}
                </div>

                {post.featured_image && (
                  <div className="mb-6 rounded-xl overflow-hidden border border-white/5">
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-full max-h-[420px] object-cover"
                    />
                  </div>
                )}

                {post.excerpt && (
                  <p className="text-gray-300 text-base mb-6">
                    {post.excerpt}
                  </p>
                )}

                <article
                  className="prose prose-invert max-w-none service-description"
                  dangerouslySetInnerHTML={{ __html: post.content_html || '' }}
                />
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default BlogPostPage;

