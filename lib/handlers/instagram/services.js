// Instagram service listing for Boost flow.
// Frontend expects an object shaped like: { [metricName]: [serviceGroup...] }
module.exports = async (req, res) => {
  res.json({
    success: true,
    // Return empty object to keep UI functional when DB is sparse.
    Stories: [],
    Reels: [],
  })
}

