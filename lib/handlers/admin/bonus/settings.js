module.exports = async (req, res) => {
  res.json({ success: true, settings: req.body?.settings || {} });
};

