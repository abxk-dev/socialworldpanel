// Minimal pages-by-slug handler for `/api/public/pages/:slug`.
module.exports = async function pageBySlug(req, res) {
  const slug = req.params?.slug || "";
  return res.json({
    slug,
    // Frontend expects an object it can render; empty content is fine for local debugging.
    content: "",
    title: slug ? String(slug) : "Page",
    description: "",
  });
};

