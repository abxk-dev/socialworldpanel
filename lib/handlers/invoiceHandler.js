const archiver = require("archiver");
const { getDb } = require("./_db");
const getUserId = require("../getUserId");
const { buildInvoicePdfBuffer } = require("../invoiceService");

async function listInvoices(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { from, to } = req.query || {};
  const filter = { user_id: userId };
  if (from || to) {
    filter.issued_date = {};
    if (from) filter.issued_date.$gte = new Date(from).toISOString();
    if (to) filter.issued_date.$lte = new Date(to).toISOString();
  }
  const items = await db
    .collection("invoices")
    .find(filter)
    .sort({ issued_date: -1 })
    .limit(500)
    .toArray();
  const monthTotal = items.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  return res.json({ success: true, invoices: items, summary: { count: items.length, monthTotal } });
}

async function downloadInvoice(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const invoiceId = String(req.params.invoiceId || "");
  const inv = await db.collection("invoices").findOne({
    $or: [{ invoice_id: invoiceId }, { invoice_number: invoiceId }],
    user_id: userId,
  });
  if (!inv) return res.status(404).json({ error: "Not found" });
  const pdf = await buildInvoicePdfBuffer(inv);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${inv.invoice_number}.pdf"`);
  return res.send(pdf);
}

async function invoiceByOrder(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const orderId = String(req.params.orderId || "");
  const inv = await db.collection("invoices").findOne({ order_id: orderId, user_id: userId });
  if (!inv) return res.status(404).json({ error: "Not found" });
  return res.json({ success: true, invoice: inv });
}

async function bulkDownload(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const ids = Array.isArray(req.body?.invoice_ids) ? req.body.invoice_ids : [];
  const from = req.body?.from;
  const to = req.body?.to;
  let filter = { user_id: userId };
  if (ids.length) {
    filter.invoice_id = { $in: ids.map(String) };
  } else if (from || to) {
    filter.issued_date = {};
    if (from) filter.issued_date.$gte = new Date(from).toISOString();
    if (to) filter.issued_date.$lte = new Date(to).toISOString();
  } else {
    return res.status(400).json({ error: "invoice_ids or date range required" });
  }
  const items = await db
    .collection("invoices")
    .find(filter)
    .limit(100)
    .toArray();

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=invoices.zip");
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    console.error(err);
    if (!res.headersSent) res.status(500).end();
  });
  archive.pipe(res);
  for (const inv of items) {
    const pdf = await buildInvoicePdfBuffer(inv);
    archive.append(pdf, { name: `${inv.invoice_number || inv.invoice_id}.pdf` });
  }
  await archive.finalize();
}

async function getBillingSettings(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const doc = await db.collection("user_billing_info").findOne({ user_id: userId });
  return res.json({ success: true, billing: doc || {} });
}

async function putBillingSettings(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const b = req.body || {};
  const doc = {
    user_id: userId,
    full_name: String(b.full_name || ""),
    company_name: String(b.company_name || ""),
    address_line1: String(b.address_line1 || ""),
    address_line2: String(b.address_line2 || ""),
    city: String(b.city || ""),
    state: String(b.state || ""),
    country: String(b.country || ""),
    postal_code: String(b.postal_code || ""),
    gst_number: String(b.gst_number || ""),
    pan_number: String(b.pan_number || ""),
    email_for_invoice: String(b.email_for_invoice || ""),
    updated_at: new Date().toISOString(),
  };
  await db.collection("user_billing_info").updateOne({ user_id: userId }, { $set: doc }, { upsert: true });
  return res.json({ success: true, billing: doc });
}

module.exports = {
  listInvoices,
  downloadInvoice,
  invoiceByOrder,
  bulkDownload,
  getBillingSettings,
  putBillingSettings,
};
