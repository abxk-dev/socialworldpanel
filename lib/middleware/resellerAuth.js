const jwt = require('jsonwebtoken')

const resellerUserAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Token required' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

const resellerAdminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Token required' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role !== 'admin' && decoded.role !== 'main_admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    req.admin = decoded
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

module.exports = { resellerUserAuth, resellerAdminAuth }

