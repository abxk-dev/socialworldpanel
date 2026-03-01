import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar } from 'lucide-react';
import { Card } from '../components/ui/card';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const BlogPage = () => {
  const posts = [
    {
      id: 1,
      title: 'How to Grow Your Instagram Following in 2024',
      excerpt: 'Learn the best strategies to increase your Instagram followers organically and with SMM services.',
      date: 'Jan 15, 2024',
      category: 'Instagram',
      image: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400'
    },
    {
      id: 2,
      title: 'YouTube Algorithm: What You Need to Know',
      excerpt: 'Understanding how the YouTube algorithm works can help you get more views and subscribers.',
      date: 'Jan 10, 2024',
      category: 'YouTube',
      image: 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=400'
    },
    {
      id: 3,
      title: 'TikTok Marketing: A Complete Guide',
      excerpt: 'Everything you need to know about marketing your brand on TikTok.',
      date: 'Jan 5, 2024',
      category: 'TikTok',
      image: 'https://images.unsplash.com/photo-1596558450255-7c0b7be9d56a?w=400'
    },
    {
      id: 4,
      title: 'The Power of Social Proof',
      excerpt: 'Why having more followers and engagement matters for your brand credibility.',
      date: 'Dec 28, 2023',
      category: 'Marketing',
      image: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=400'
    },
  ];

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />

      <section className="py-20 px-6">
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

          <div className="grid md:grid-cols-2 gap-6">
            {posts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="glass overflow-hidden group cursor-pointer hover:border-electric-blue/50 transition-all">
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-xs bg-electric-blue/20 text-electric-blue px-2 py-1 rounded">
                        {post.category}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {post.date}
                      </span>
                    </div>
                    <h3 className="text-xl font-exo font-bold text-white mb-2 group-hover:text-electric-blue transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{post.excerpt}</p>
                  </div>
                </Card>
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
  );
};

export default BlogPage;
