import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Calendar } from 'lucide-react';
import { Card } from '../components/ui/card';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../lib/axios';

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get('/blogs')
      .then((res) => {
        if (!mounted) return;
        const data = res.data || {};
        setPosts(data.posts || data.items || []);
      })
      .catch(() => {
        if (!mounted) return;
        setPosts([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />

      <div className="pt-navbar">
        <section className="py-12 sm:py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl md:text-5xl font-exo font-bold mb-4">
                OUR <span className="neon-text">BLOG</span>
              </h1>
              <p className="text-gray-400 max-w-xl mx-auto">
                Tips, guides, and insights on social media marketing
              </p>
            </motion.div>

            {loading && (
              <p className="text-gray-400 text-sm">Loading articles...</p>
            )}

            {!loading && posts.length === 0 && (
              <p className="text-gray-400 text-sm">No articles published yet.</p>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {posts.map((post, idx) => (
                <motion.div
                  key={post._id || post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link to={`/blog/${post.slug}`}>
                    <Card className="glass overflow-hidden group cursor-pointer hover:border-electric-blue/50 transition-all h-full flex flex-col">
                      {post.featured_image && (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-center gap-4 mb-3 text-xs">
                          {post.category && (
                            <span className="bg-electric-blue/20 text-electric-blue px-2 py-1 rounded">
                              {post.category}
                            </span>
                          )}
                          {post.published_at && (
                            <span className="text-gray-500 flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(post.published_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-exo font-bold text-white mb-2 group-hover:text-electric-blue transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-gray-400 text-sm line-clamp-3">
                            {post.excerpt}
                          </p>
                        )}
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-12 text-gray-500">
              <FileText size={40} className="mx-auto mb-4 opacity-50" />
              <p>More articles coming soon...</p>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default BlogPage;
