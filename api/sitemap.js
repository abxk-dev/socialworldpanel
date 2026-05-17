const { MongoClient } = require('mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader(
    'Cache-Control',
    'public, max-age=3600, stale-while-revalidate=86400'
  );

  const baseUrl = 'https://socialworldpanel.com';
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { url: '/', priority: '1.0', freq: 'daily' },
    { url: '/services', priority: '0.9', freq: 'daily' },
    { url: '/pricing', priority: '0.8', freq: 'weekly' },
    { url: '/api-docs', priority: '0.7', freq: 'weekly' },
    { url: '/blog', priority: '0.8', freq: 'daily' },
    { url: '/about', priority: '0.6', freq: 'monthly' },
    { url: '/contact', priority: '0.6', freq: 'monthly' },
    { url: '/terms', priority: '0.4', freq: 'monthly' },
    { url: '/privacy', priority: '0.4', freq: 'monthly' },
    { url: '/register', priority: '0.5', freq: 'monthly' },
  ];

  let blogUrls = [];
  let serviceUrls = [];

  const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL;
  const dbName = process.env.DB_NAME || process.env.MONGODB_DB || 'socialworldpanel';

  if (mongoUri) {
    try {
      const client = await MongoClient.connect(mongoUri);
      const db = client.db(dbName);

      // Published blog posts (collection name 'blogs' – adjust if different in your DB)
      try {
        const posts = await db
          .collection('blogs')
          .find({ status: 'published' })
          .project({ slug: 1, updatedAt: 1, _id: 0 })
          .toArray();

        blogUrls = posts.map((post) => ({
          url: `/blog/${post.slug}`,
          lastmod: post.updatedAt
            ? new Date(post.updatedAt).toISOString().split('T')[0]
            : today,
          priority: '0.7',
          freq: 'weekly',
        }));
      } catch (err) {
        console.error('Sitemap blogs query error:', err.message);
      }

      // Active services (optional, only if you expose per-service URLs)
      try {
        const services = await db
          .collection('services')
          .find({ status: 'active' })
          .project({ _id: 1, updatedAt: 1 })
          .toArray();

        serviceUrls = services.map((s) => ({
          url: `/services/${s._id}`,
          lastmod: s.updatedAt
            ? new Date(s.updatedAt).toISOString().split('T')[0]
            : today,
          priority: '0.6',
          freq: 'weekly',
        }));
      } catch (err) {
        console.error('Sitemap services query error:', err.message);
      }

      await client.close();
    } catch (err) {
      console.error('Sitemap DB connection error:', err.message);
    }
  }

  const allPages = [
    ...staticPages.map((p) => ({ ...p, lastmod: today })),
    ...blogUrls,
    ...serviceUrls,
  ];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    allPages
      .map(
        (page) =>
          `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.freq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
      )
      .join('\n') +
    '\n</urlset>\n';

  res.statusCode = 200;
  res.end(xml);
};

