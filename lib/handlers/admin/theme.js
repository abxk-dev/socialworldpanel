module.exports = async (req, res) => {
  res.json({ success: true, theme: req.body?.theme || {} });
};

