module.exports = async (req, res) => {
  // Admin UI uses this to read/write hidden service access rules.
  res.json({ success: true, hidden_access: req.body?.hidden_access || {} });
};

