import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../lib/axios';

/**
 * Generic renderer for custom HTML pages stored in the `pages` collection.
 * - If `slugProp` is provided, uses that slug.
 * - Otherwise, reads `slug` from the route params.
 */
const CustomPageWrapper = ({ slug: slugProp, fallback: FallbackComponent }) => {
  const params = useParams();
  const slug = slugProp || params.slug;

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    setLoading(true);
    api
      .get(`/public/pages/${slug}`)
      .then((res) => {
        if (!mounted) return;
        setPage(res.data);
      })
      .catch(() => {
        if (!mounted) return;
        setPage(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  const hasCustom = !!page && !!page.content_html;

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />
      <div className="pt-navbar">
        {loading && (
          <main className="px-4 sm:px-6 py-10">
            <p className="text-gray-400 text-sm">Loading page...</p>
          </main>
        )}
        {!loading && hasCustom && (
          <main className="px-4 sm:px-6 py-10">
            <div className="max-w-5xl mx-auto">
              {page.title && (
                <h1 className="text-3xl sm:text-4xl font-exo font-bold text-white mb-6">
                  {page.title}
                </h1>
              )}
              <div
                className="service-description prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: page.content_html || '' }}
              />
            </div>
          </main>
        )}
        {!loading && !hasCustom && FallbackComponent && <FallbackComponent />}
        {!loading && !hasCustom && !FallbackComponent && (
          <main className="px-4 sm:px-6 py-10">
            <div className="max-w-3xl mx-auto text-gray-400 text-sm">
              Page not found.
            </div>
          </main>
        )}
        <Footer />
      </div>
    </div>
  );
};

export default CustomPageWrapper;

