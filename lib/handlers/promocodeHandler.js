const { ObjectId } = require("mongodb");
const { getDb } = require("../db");
const getUserId = require("../getUserId");

function asId(v) {
  if (!v) return v;
  if (v instanceof ObjectId) return v;
  if (typeof v === "string" && ObjectId.isValid(v)) return new ObjectId(v);
  return v;
}

function normalizePromo(doc = {}) {
  return {
    ...doc,
    _id: doc?._id ? String(doc._id) : doc?._id,
  };
}

function pickCollection(db) {
  return db.collection("promocodes");
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countPromoUsesByUser(usedBy, userId) {
  if (!userId || !Array.isArray(usedBy)) return 0;
  let n = 0;
  for (const entry of usedBy) {
    if (typeof entry === "string" && entry === userId) n += 1;
    else if (entry && typeof entry === "object" && String(entry.user_id) === String(userId)) {
      n += Number(entry.count || entry.uses || 1);
    }
  }
  return n;
}

async function resolveServicePublicId(db, serviceIdRaw) {
  if (serviceIdRaw == null || serviceIdRaw === "") return "";
  const raw = String(serviceIdRaw).trim();
  if (!raw) return "";
  const or = [{ service_id: raw }];
  const n = Number(raw);
  if (Number.isFinite(n)) {
    or.push({ service_id: n }, { service_id: String(n) });
  }
  if (ObjectId.isValid(raw)) {
    try {
      or.push({ _id: new ObjectId(raw) });
    } catch (_) {}
  }
  const svc = await db.collection("services").findOne({ $or: or });
  if (!svc) return raw;
  return svc.service_id != null ? String(svc.service_id) : String(svc._id || "");
}

function promoAppliesToService(doc, canonicalServiceId) {
  const mode = String(doc.applicable_to || "all").toLowerCase();
  const ids = (Array.isArray(doc.service_ids) ? doc.service_ids : [])
    .map((x) => String(x).trim())
    .filter(Boolean);
  const sid = String(canonicalServiceId || "").trim();
  if (mode === "specific" || mode === "exclude") {
    if (!sid) return false;
    const match = (id) => id === sid || String(Number(id)) === String(Number(sid));
    if (mode === "specific") return ids.some(match);
    if (mode === "exclude") return !ids.some(match);
  }
  return true;
}

function computeDiscountAmount(doc, orderAmount) {
  const amount = Number(orderAmount || 0);
  if (!(amount > 0)) return 0;
  let discount = 0;
  if (doc.discount_type === "fixed") {
    discount = Math.min(Number(doc.discount_value || 0), amount);
  } else {
    discount = (Number(doc.discount_value || 0) / 100) * amount;
    if (doc.max_discount_cap != null && doc.max_discount_cap !== "") {
      discount = Math.min(discount, Number(doc.max_discount_cap || 0));
    }
  }
  return Math.round(Math.max(0, discount) * 10000) / 10000;
}

/**
 * Shared promo rules for /promocodes/validate and checkout.
 * @returns {{ valid: boolean, message: string, discount_amount: number, doc: object|null }}
 */
async function evaluatePromoCode(db, { userId, code, orderAmount, serviceIdRaw }) {
  const trimmed = String(code || "").trim();
  if (!trimmed) {
    return { valid: false, message: "Promo code is required", discount_amount: 0, doc: null };
  }
  const coll = pickCollection(db);
  const doc = await coll.findOne({ code: new RegExp(`^${escapeRegex(trimmed)}$`, "i") });
  if (!doc) {
    return { valid: false, message: "Promo code not found", discount_amount: 0, doc: null };
  }
  if (doc.is_active === false) {
    return { valid: false, message: "Promo code inactive", discount_amount: 0, doc: null };
  }
  const now = Date.now();
  const from = doc.valid_from ? new Date(doc.valid_from).getTime() : null;
  const until = doc.valid_until ? new Date(doc.valid_until).getTime() : null;
  if (from && now < from) {
    return { valid: false, message: "Promo not started yet", discount_amount: 0, doc: null };
  }
  if (until && now > until) {
    return { valid: false, message: "Promo expired", discount_amount: 0, doc: null };
  }
  const minOrder =
    doc.min_order_value != null && doc.min_order_value !== "" ? Number(doc.min_order_value) : null;
  const amt = Number(orderAmount || 0);
  if (minOrder != null && Number.isFinite(minOrder) && minOrder > 0 && amt < minOrder) {
    return {
      valid: false,
      message: `Minimum order total for this promo is ${minOrder}`,
      discount_amount: 0,
      doc: null,
    };
  }
  const canonicalSid = await resolveServicePublicId(db, serviceIdRaw);
  if (!promoAppliesToService(doc, canonicalSid)) {
    return {
      valid: false,
      message: "Promo code is not valid for this order.",
      discount_amount: 0,
      doc: null,
    };
  }
  const limit = doc.usage_limit != null && doc.usage_limit !== "" ? Number(doc.usage_limit) : null;
  if (limit != null && Number.isFinite(limit) && limit > 0 && Number(doc.used_count || 0) >= limit) {
    return { valid: false, message: "Promo code usage limit reached", discount_amount: 0, doc: null };
  }
  const perUser =
    doc.usage_per_user != null && doc.usage_per_user !== "" ? Number(doc.usage_per_user) : 0;
  if (perUser > 0 && userId) {
    const used = countPromoUsesByUser(doc.used_by, userId);
    if (used >= perUser) {
      return {
        valid: false,
        message: "You have already used this promo the maximum number of times",
        discount_amount: 0,
        doc: null,
      };
    }
  }
  const discount_amount = computeDiscountAmount(doc, amt);
  return {
    valid: true,
    message: "Promo code valid",
    discount_amount,
    doc,
  };
}

async function adminListPromos(req, res) {
  const db = await getDb();
  const docs = await pickCollection(db).find({}).sort({ created_at: -1, updated_at: -1 }).limit(2000).toArray();
  return res.json({ data: docs.map(normalizePromo) });
}

async function adminGetPromo(req, res) {
  const db = await getDb();
  const id = asId(req.params?.id);
  const doc = await pickCollection(db).findOne({ _id: id });
  if (!doc) return res.status(404).json({ error: "Promo not found" });
  return res.json(normalizePromo(doc));
}

async function adminCreatePromo(req, res) {
  const db = await getDb();
  const now = new Date();
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const doc = {
    code: String(body.code || "").trim(),
    description: body.description || "",
    discount_type: body.discount_type || "percentage",
    discount_value: Number(body.discount_value || 0),
    max_discount_cap: body.max_discount_cap ?? null,
    min_order_value: body.min_order_value ?? null,
    applicable_to: body.applicable_to || "all",
    service_ids: Array.isArray(body.service_ids) ? body.service_ids : [],
    usage_limit: body.usage_limit ?? null,
    usage_per_user: body.usage_per_user ?? 1,
    used_count: Number(body.used_count || 0),
    used_by: Array.isArray(body.used_by) ? body.used_by : [],
    valid_from: body.valid_from ? new Date(body.valid_from) : now,
    valid_until: body.valid_until ? new Date(body.valid_until) : null,
    is_active: body.is_active !== false,
    created_by: body.created_by || null,
    created_at: now,
    updated_at: now,
  };
  if (!doc.code) return res.status(400).json({ error: "Code is required" });
  const out = await pickCollection(db).insertOne(doc);
  return res.status(201).json(normalizePromo({ ...doc, _id: out.insertedId }));
}

async function adminUpdatePromo(req, res) {
  const db = await getDb();
  const id = asId(req.params?.id);
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const set = { ...body, updated_at: new Date() };
  if (Object.prototype.hasOwnProperty.call(set, "valid_from") && set.valid_from) set.valid_from = new Date(set.valid_from);
  if (Object.prototype.hasOwnProperty.call(set, "valid_until") && set.valid_until) set.valid_until = set.valid_until ? new Date(set.valid_until) : null;
  if (Object.prototype.hasOwnProperty.call(set, "discount_value")) set.discount_value = Number(set.discount_value || 0);
  await pickCollection(db).updateOne({ _id: id }, { $set: set });
  const doc = await pickCollection(db).findOne({ _id: id });
  return res.json(normalizePromo(doc || {}));
}

async function adminDeletePromo(req, res) {
  const db = await getDb();
  const id = asId(req.params?.id);
  await pickCollection(db).deleteOne({ _id: id });
  return res.json({ success: true });
}

async function adminTogglePromo(req, res) {
  const db = await getDb();
  const id = asId(req.params?.id);
  const doc = await pickCollection(db).findOne({ _id: id });
  if (!doc) return res.status(404).json({ error: "Promo not found" });
  const next = !(doc.is_active !== false);
  await pickCollection(db).updateOne({ _id: id }, { $set: { is_active: next, updated_at: new Date() } });
  return res.json({ success: true, is_active: next });
}

async function adminPromoUsage(req, res) {
  const db = await getDb();
  const id = asId(req.params?.id);
  const doc = await pickCollection(db).findOne({ _id: id });
  return res.json({
    used_count: Number(doc?.used_count || 0),
    usage_limit: doc?.usage_limit ?? null,
    used_by: Array.isArray(doc?.used_by) ? doc.used_by : [],
  });
}

async function validatePromo(req, res) {
  const db = await getDb();
  const userId = getUserId(req);
  const orderAmount = Number(req.body?.order_amount ?? req.body?.amount ?? 0);
  const serviceIdRaw = req.body?.service_id;
  const code = String(req.body?.code || "").trim();
  const result = await evaluatePromoCode(db, { userId, code, orderAmount, serviceIdRaw });
  const message = result.valid
    ? result.message || "Promo code valid"
    : result.message || "Promo code is not valid for this order.";
  return res.status(200).json({
    message,
    data: {
      valid: result.valid,
      discount_amount: result.valid ? Number(result.discount_amount || 0) : 0,
    },
  });
}

async function applyPromo(req, res) {
  const db = await getDb();
  const code = String(req.body?.code || "").trim().toUpperCase();
  const amount = Number(req.body?.amount || 0);
  if (!(amount > 0)) return res.status(400).json({ error: "Amount is required" });
  const doc = await pickCollection(db).findOne({ code });
  if (!doc || doc.is_active === false) return res.status(400).json({ error: "Invalid promo code" });

  let discount = 0;
  if (doc.discount_type === "fixed") {
    discount = Math.min(Number(doc.discount_value || 0), amount);
  } else {
    discount = (Number(doc.discount_value || 0) / 100) * amount;
    if (doc.max_discount_cap != null) discount = Math.min(discount, Number(doc.max_discount_cap || 0));
  }
  const final_amount = Math.max(0, amount - discount);
  return res.json({
    success: true,
    discount: Math.round(discount * 100) / 100,
    final_amount: Math.round(final_amount * 100) / 100,
    promo: normalizePromo(doc),
  });
}

module.exports = {
  validatePromo,
  evaluatePromoCode,
  applyPromo,
  adminCreatePromo,
  adminListPromos,
  adminGetPromo,
  adminUpdatePromo,
  adminDeletePromo,
  adminTogglePromo,
  adminPromoUsage,
};
