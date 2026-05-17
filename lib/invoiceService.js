const PDFDocument = require("pdfkit");

function padInvNum(n) {
  return String(n).padStart(6, "0");
}

async function nextInvoiceNumber(db) {
  const year = new Date().getFullYear();
  const key = `inv_seq_${year}`;
  await db.collection("counters").updateOne({ _id: key }, { $inc: { seq: 1 } }, { upsert: true });
  const c = await db.collection("counters").findOne({ _id: key });
  const seq = Math.max(1, Number(c?.seq) || 1);
  return { invoice_number: `INV-${year}-${padInvNum(seq)}`, seq };
}

/**
 * @param {import('mongodb').Db} db
 * @param {object} order - inserted order doc
 * @param {object} user - users doc
 */
async function generateInvoiceForOrder(db, order, user) {
  if (!order?.order_id || !user?.user_id) return null;
  const existing = await db.collection("invoices").findOne({ order_id: String(order.order_id) });
  if (existing) return existing;

  const billing = await db.collection("user_billing_info").findOne({ user_id: user.user_id });
  const { invoice_number } = await nextInvoiceNumber(db);

  const qty = Number(order.quantity || 0);
  const total = Number(order.charge ?? order.price ?? 0);
  const unit = qty > 0 ? total / qty : total;
  const taxPercent = Number(process.env.INVOICE_TAX_PERCENT || 0);
  const taxAmount = taxPercent ? (total * taxPercent) / 100 : 0;
  const now = new Date().toISOString();

  const doc = {
    invoice_id: invoice_number,
    invoice_number,
    order_id: String(order.order_id),
    user_id: user.user_id,
    user_email: user.email || user.user_email || "",
    user_name: user.username || user.full_name || user.name || "",
    billing_name: billing?.full_name || user.full_name || user.username || "",
    billing_address: [billing?.address_line1, billing?.address_line2].filter(Boolean).join(", "),
    billing_gst_number: billing?.gst_number || "",
    billing_company: billing?.company_name || "",
    service_name: order.service_name || "",
    service_id: String(order.service_id || ""),
    quantity: qty,
    unit_price: unit,
    total_amount: total + taxAmount,
    currency: "INR",
    tax_amount: taxAmount,
    tax_percent: taxPercent,
    payment_method: "Wallet",
    payment_status: "paid",
    issued_date: now,
    due_date: now,
    pdf_generated: false,
    created_at: now,
  };

  await db.collection("invoices").insertOne(doc);
  return doc;
}

function buildInvoicePdfBuffer(meta) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 50 });
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const primary = "#00b4d8";
    doc.fillColor(primary).fontSize(20).text("SocialWorldPanel", { continued: false });
    doc.fillColor("#333").fontSize(10).text("SMM Services Invoice");
    doc.moveDown();

    doc.fontSize(9).fillColor("#666").text(`Invoice: ${meta.invoice_number}`, { align: "right" });
    doc.text(`Date: ${(meta.issued_date || "").slice(0, 10)}`, { align: "right" });
    doc.moveDown();

    doc.fillColor("#111").fontSize(11).text("Bill To:", { underline: true });
    doc.fontSize(10).text(meta.billing_name || meta.user_name || "Customer");
    if (meta.billing_company) doc.text(meta.billing_company);
    if (meta.billing_address) doc.text(meta.billing_address);
    if (meta.user_email) doc.text(meta.user_email);
    doc.moveDown();

    doc.text("Order reference: " + meta.order_id);
    doc.moveDown();

    const tableTop = doc.y;
    doc.fontSize(10).text("Service", 50, tableTop);
    doc.text("Qty", 300, tableTop);
    doc.text("Rate", 360, tableTop);
    doc.text("Amount", 430, tableTop);
    doc.moveTo(50, tableTop + 14).lineTo(540, tableTop + 14).stroke("#ccc");

    const rowY = tableTop + 22;
    doc.text(String(meta.service_name || "").slice(0, 60), 50, rowY, { width: 230 });
    doc.text(String(meta.quantity ?? ""), 300, rowY);
    doc.text(Number(meta.unit_price || 0).toFixed(4), 360, rowY);
    doc.text(Number(meta.total_amount - (meta.tax_amount || 0) || 0).toFixed(2), 430, rowY);

    doc.moveDown(3);
    const sub = Number(meta.total_amount || 0) - Number(meta.tax_amount || 0);
    doc.fontSize(10).text(`Subtotal: ${sub.toFixed(2)} ${meta.currency || "INR"}`, { align: "right" });
    if (meta.tax_amount) {
      doc.text(`Tax (${meta.tax_percent}%): ${Number(meta.tax_amount).toFixed(2)}`, { align: "right" });
    }
    doc.fontSize(12).fillColor(primary).text(`Total: ${Number(meta.total_amount).toFixed(2)} ${meta.currency || "INR"}`, {
      align: "right",
    });
    doc.fillColor("#333").fontSize(9).moveDown(2).text("Thank you for your business.", { align: "center" });
    doc.text("Support: help@socialworldpanel.com", { align: "center" });

    doc.end();
  });
}

module.exports = {
  generateInvoiceForOrder,
  buildInvoicePdfBuffer,
  nextInvoiceNumber,
};
