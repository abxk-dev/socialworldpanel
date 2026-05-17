module.exports = async (req, res) => {
  res.json({
    success: true,
    requests_today: 0,
    requests_week: 0,
    conversion_rate: 0,
    conversion_rate_pct: 0,
    top_recommended: [],
  });
};

