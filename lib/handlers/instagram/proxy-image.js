module.exports = async (req, res) => {
  const url = req.query?.url
  if (!url || !String(url).trim()) {
    return res.status(400).json({ error: 'URL required' })
  }

  // Simple redirect to avoid CORS issues.
  // Browser will follow redirect; backend keeps this minimal.
  res.redirect(String(url))
}

