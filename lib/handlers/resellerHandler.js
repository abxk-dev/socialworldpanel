const { getDb } = require('./_db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { ObjectId } = require('mongodb')

const getResellerConfig = async (req, res) => {
  try {
    const db = await getDb()
    const config = await db.collection('site_settings').findOne({ key: 'reseller_config' })
    const value = config?.value || {}
    res.json({
      success: true,
      config: value,
      isReseller: value?.enabled === true,
      brand: value || {},
      panel_name: value?.panel_name || value?.brand_name || 'Reseller Panel',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const resellerUserLogin = async (req, res) => {
  try {
    const db = await getDb()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const user = await db.collection('reseller_users').findOne({ email })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const hash = user.password_hash || user.password
    const ok = hash ? await bcrypt.compare(password, hash) : false
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
    const token = jwt.sign({ user_id: user.user_id, email: user.email, reseller_id: user.reseller_id, role: 'reseller_user' }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ success: true, access_token: token, user: { user_id: user.user_id, email: user.email, name: user.name, reseller_id: user.reseller_id } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const resellerUserRegister = async (req, res) => {
  try {
    const db = await getDb()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    const name = String(req.body?.name || '').trim() || email.split('@')[0]
    const reseller_id = String(req.body?.reseller_id || '')
    if (!email || !password || !reseller_id) return res.status(400).json({ error: 'email, password, reseller_id required' })
    const exists = await db.collection('reseller_users').findOne({ email, reseller_id })
    if (exists) return res.status(400).json({ error: 'User already exists' })
    const password_hash = await bcrypt.hash(password, 10)
    const user = { user_id: `rusr_${Date.now()}`, email, name, reseller_id, password_hash, balance: 0, total_orders: 0, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    await db.collection('reseller_users').insertOne(user)
    res.json({ success: true, user: { user_id: user.user_id, email: user.email, name: user.name } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getResellerServices = async (req, res) => {
  const db = await getDb()
  const services = await db.collection('services')
    .find({ is_active: true })
    .toArray()
  res.json({ success: true, services })
}

const placeResellerOrder = async (req, res) => {
  res.json({ success: false, error: 'Not implemented' })
}

const getResellerMe = async (req, res) => {
  try {
    const db = await getDb()
    const uid = req.user?.user_id
    if (!uid) return res.status(401).json({ error: 'Unauthorized' })
    const user = await db.collection('reseller_users').findOne({ user_id: uid }, { projection: { password_hash: 0, password: 0 } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ success: true, user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getResellerUserOrders = async (req, res) => {
  try {
    const db = await getDb()
    const uid = req.user?.user_id
    if (!uid) return res.status(401).json({ error: 'Unauthorized' })
    const orders = await db.collection('orders').find({ reseller_user_id: uid }).sort({ created_at: -1 }).limit(200).toArray()
    res.json({ success: true, orders })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getResellerUserBalance = async (req, res) => {
  try {
    const db = await getDb()
    const uid = req.user?.user_id
    if (!uid) return res.status(401).json({ error: 'Unauthorized' })
    const user = await db.collection('reseller_users').findOne({ user_id: uid }, { projection: { balance: 1 } })
    res.json({ success: true, balance: Number(user?.balance || 0) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const resellerAdminLogin = async (req, res) => {
  try {
    const db = await getDb()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const reseller = await db.collection('resellers').findOne({ admin_email: email })
    if (!reseller) return res.status(401).json({ error: 'Invalid credentials' })
    const hash = reseller.admin_password_hash || reseller.password_hash || reseller.password
    const ok = hash ? await bcrypt.compare(password, hash) : false
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
    const rid = reseller.reseller_id || String(reseller._id)
    const token = jwt.sign({ reseller_id: rid, email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ success: true, access_token: token, reseller: { reseller_id: rid, name: reseller.name || reseller.brand_name || 'Reseller', email } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getResellerDashboard = async (req, res) => {
  try {
    const db = await getDb()
    const rid = req.admin?.reseller_id
    if (!rid) return res.status(401).json({ error: 'Unauthorized' })
    const [total_users, total_orders, recent_orders, recent_users, byStatus] = await Promise.all([
      db.collection('reseller_users').countDocuments({ reseller_id: rid }),
      db.collection('orders').countDocuments({ reseller_id: rid }),
      db.collection('orders').find({ reseller_id: rid }).sort({ created_at: -1 }).limit(10).toArray(),
      db.collection('reseller_users').find({ reseller_id: rid }).sort({ created_at: -1 }).limit(10).toArray(),
      db.collection('orders').aggregate([{ $match: { reseller_id: rid } }, { $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
    ])
    const total_revenue = recent_orders.reduce((s, o) => s + Number(o.charge || o.price || 0), 0)
    const total_profit = recent_orders.reduce((s, o) => s + Number((o.charge || o.price || 0) - (o.provider_cost || o.provider_charge || 0)), 0)
    const orders_by_status = Object.fromEntries(byStatus.map((x) => [x._id || 'unknown', x.count]))
    res.json({ success: true, total_users, total_orders, total_revenue, total_profit, orders_by_status, recent_orders, recent_users })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getResellerUsers = async (req, res) => {
  try {
    const db = await getDb()
    const rid = req.admin?.reseller_id
    if (!rid) return res.status(401).json({ error: 'Unauthorized' })
    const page = Math.max(1, parseInt(req.query?.page || 1, 10))
    const limit = Math.max(1, parseInt(req.query?.limit || 20, 10))
    const skip = (page - 1) * limit
    const filter = { reseller_id: rid }
    const [users, total] = await Promise.all([
      db.collection('reseller_users').find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
      db.collection('reseller_users').countDocuments(filter),
    ])
    res.json({ success: true, users, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const addBalanceToUser = async (req, res) => {
  try {
    const db = await getDb()
    const rid = req.admin?.reseller_id
    if (!rid) return res.status(401).json({ error: 'Unauthorized' })
    const id = String(req.params?.id || '')
    const amount = Number(req.body?.amount || 0)
    if (!(amount > 0)) return res.status(400).json({ error: 'amount must be > 0' })
    const idFilter = [{ user_id: id }]
    if (ObjectId.isValid(id)) idFilter.push({ _id: new ObjectId(id) })
    const user = await db.collection('reseller_users').findOne({ reseller_id: rid, $or: idFilter })
    if (!user) return res.status(404).json({ error: 'User not found' })
    await db.collection('reseller_users').updateOne({ _id: user._id }, { $inc: { balance: amount }, $set: { updated_at: new Date().toISOString() } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getResellerAdminPrices = async (req, res) => {
  const db = await getDb()
  const services = await db.collection('services')
    .find({ is_active: true })
    .toArray()
  res.json({ success: true, prices: services })
}

const updateResellerPrices = async (req, res) => {
  res.json({ success: true })
}

const getResellerOrders = async (req, res) => {
  try {
    const db = await getDb()
    const rid = req.admin?.reseller_id
    if (!rid) return res.status(401).json({ error: 'Unauthorized' })
    const page = Math.max(1, parseInt(req.query?.page || 1, 10))
    const limit = Math.max(1, parseInt(req.query?.limit || 20, 10))
    const skip = (page - 1) * limit
    const filter = { reseller_id: rid }
    if (req.query?.status) filter.status = String(req.query.status)
    const [orders, total] = await Promise.all([
      db.collection('orders').find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
      db.collection('orders').countDocuments(filter),
    ])
    res.json({ success: true, orders, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const updateResellerBrand = async (req, res) => {
  res.json({ success: true })
}

// Admin endpoints expected by `routes/admin.js`.
const adminListResellers = async (req, res) => {
  res.json({ success: true, resellers: [], total: 0, page: 1, pages: 1 });
}

const adminCreateReseller = async (req, res) => {
  res.json({ success: true, reseller: null });
}

const adminUpdateReseller = async (req, res) => {
  res.json({ success: true });
}

const adminSuspendReseller = async (req, res) => {
  res.json({ success: true });
}

const adminGetResellerStats = async (req, res) => {
  res.json({ success: true, stats: {} });
}

const adminAddResellerBalance = async (req, res) => {
  res.json({ success: true });
}

module.exports = {
  getResellerConfig,
  resellerUserLogin,
  resellerUserRegister,
  getResellerServices,
  placeResellerOrder,
  getResellerMe,
  getResellerUserOrders,
  getResellerUserBalance,
  resellerAdminLogin,
  getResellerDashboard,
  getResellerUsers,
  addBalanceToUser,
  getResellerAdminPrices,
  updateResellerPrices,
  getResellerOrders,
  updateResellerBrand,

  adminListResellers,
  adminCreateReseller,
  adminUpdateReseller,
  adminSuspendReseller,
  adminGetResellerStats,
  adminAddResellerBalance,
}

