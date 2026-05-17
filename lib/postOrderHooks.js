const { generateInvoiceForOrder } = require("./invoiceService");
const { awardOrderXp } = require("./gamificationService");

async function insertNotification(db, userId, title, message, type = "order_placed") {
  const nid = `n_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  await db.collection("notifications").insertOne({
    id: nid,
    user_id: userId,
    title,
    message,
    type,
    is_read: false,
    created_at: now,
  });
}

/**
 * After a successful standard order (not drip sub-jobs that skip hooks).
 */
async function runPostOrderHooks(db, userId, order, user, service) {
  try {
    await generateInvoiceForOrder(db, order, user);
  } catch (e) {
    console.warn("[postOrderHooks] invoice", e?.message);
  }
  try {
    await awardOrderXp(db, userId, order);
  } catch (e) {
    console.warn("[postOrderHooks] gamification", e?.message);
  }
  try {
    await insertNotification(
      db,
      userId,
      "Order placed",
      `Order #${order.order_id} for ${order.service_name || "service"} is being processed.`,
      "order_placed"
    );
  } catch (e) {
    console.warn("[postOrderHooks] notification", e?.message);
  }
}

module.exports = { runPostOrderHooks, insertNotification };
