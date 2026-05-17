/**
 * Bundle packages: admin CRUD on `bundle_packages`, public list, and combined checkout.
 */
const { ObjectId } = require("mongodb");
const { getDb } = require("../db");
const getUserId = require("../getUserId");
const {
  loadProviderForService,
  resolveProviderServiceId,
  providerAddOrder,
} = require("../providerSmmApi");
const { invalidateAllOrderLists } = require("../cache/orderListCache");

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toObjectId(id) {
  const s = String(id || "").trim();
  if (!s || !ObjectId.isValid(s)) {
    const err = new Error("Invalid id");
    err.statusCode = 400;
    throw err;
  }
  return new ObjectId(s);
}

function normalizeBundleServices(body) {
  const raw = Array.isArray(body?.services) ? body.services : [];
  return raw
    .map((s) => ({
      service_id: String(s?.service_id ?? "").trim(),
      quantity: Math.max(1, parseInt(s?.quantity, 10) || 1),
    }))
    .filter((s) => s.service_id);
}

function generateNumericOrderId() {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1000);
  return String(ts * 1000 + rand);
}

async function findServiceById(db, rawSid) {
  const raw = String(rawSid || "").trim();
  if (!raw) return null;
  const serviceOr = [{ service_id: raw }];
  const sidNum = Number(raw);
  if (Number.isFinite(sidNum)) {
    serviceOr.push({ service_id: sidNum }, { service_id: String(sidNum) });
  }
  if (ObjectId.isValid(raw)) {
    try {
      serviceOr.push({ _id: new ObjectId(raw) });
    } catch (_) {}
  }
  return db.collection("services").findOne({ $or: serviceOr });
}

async function enrichBundleServices(db, bundle) {
  const services = bundle.services || [];
  if (!services.length) return bundle;
  const keys = new Set();
  for (const s of services) {
    const k = String(s.service_id || "").trim();
    if (k) keys.add(k);
    const n = Number(k);
    if (Number.isFinite(n)) keys.add(String(n));
  }
  const keyArr = Array.from(keys);
  if (!keyArr.length) return bundle;

  const or = [];
  for (const k of keyArr) {
    or.push({ service_id: k });
    const n = Number(k);
    if (Number.isFinite(n)) or.push({ service_id: n });
  }
  const docs = await db.collection("services").find({ $or: or }).limit(200).toArray();
  const nameById = {};
  for (const d of docs) {
    const sid = d.service_id != null ? String(d.service_id) : "";
    if (sid) nameById[sid] = d.name || d.service_name || sid;
    const n = Number(sid);
    if (Number.isFinite(n)) nameById[String(n)] = nameById[sid];
  }

  return {
    ...bundle,
    services: services.map((s) => {
      const sid = String(s.service_id || "").trim();
      return {
        ...s,
        service_name: nameById[sid] || nameById[String(Number(sid))] || s.service_name || "",
      };
    }),
  };
}

async function listBundles(req, res) {
  const db = await getDb();
  if (!db) return res.status(503).json({ bundles: [], error: "Database unavailable" });

  const rows = await db
    .collection("bundle_packages")
    .find({ is_active: { $ne: false } })
    .sort({ created_at: -1 })
    .limit(500)
    .toArray();

  const enriched = [];
  for (const b of rows) {
    enriched.push(await enrichBundleServices(db, b));
  }
  return res.json({ bundles: enriched });
}

async function getBundleById(req, res) {
  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });
  let id;
  try {
    id = toObjectId(req.params?.id);
  } catch (e) {
    return res.status(400).json({ error: "Invalid bundle id" });
  }

  const bundle = await db.collection("bundle_packages").findOne({ _id: id });
  if (!bundle || bundle.is_active === false) {
    return res.status(404).json({ error: "Bundle not found" });
  }
  return res.json({ bundle: await enrichBundleServices(db, bundle) });
}

async function adminListBundles(req, res) {
  const db = await getDb();
  if (!db) return res.status(503).json({ bundles: [], error: "Database unavailable" });

  const rows = await db
    .collection("bundle_packages")
    .find({})
    .sort({ created_at: -1 })
    .limit(1000)
    .toArray();

  const enriched = [];
  for (const b of rows) {
    enriched.push(await enrichBundleServices(db, b));
  }
  return res.json({ bundles: enriched });
}

async function createBundle(req, res) {
  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const name = String(body.name || "").trim();
  if (!name) return res.status(400).json({ error: "name is required" });

  const services = normalizeBundleServices(body);
  if (services.length < 1) {
    return res.status(400).json({ error: "At least one service line is required" });
  }

  const now = new Date().toISOString();
  const doc = {
    name,
    description: String(body.description || "").trim(),
    category_id: body.category_id != null && body.category_id !== "" ? body.category_id : null,
    price: safeNumber(body.price),
    image_url: String(body.image_url || "").trim(),
    is_active: body.is_active !== false,
    services,
    created_at: now,
    updated_at: now,
  };

  try {
    const out = await db.collection("bundle_packages").insertOne(doc);
    return res.status(201).json({ ...doc, _id: out.insertedId });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: "A bundle with this name already exists" });
    }
    return res.status(400).json({ error: e?.message || "Create failed" });
  }
}

async function updateBundle(req, res) {
  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  let id;
  try {
    id = toObjectId(req.params?.id);
  } catch {
    return res.status(400).json({ error: "Invalid bundle id" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const $set = {
    updated_at: new Date().toISOString(),
  };
  if (body.name != null) $set.name = String(body.name).trim();
  if ($set.name === "") return res.status(400).json({ error: "name cannot be empty" });
  if (body.description != null) $set.description = String(body.description || "").trim();
  if (body.category_id !== undefined) {
    $set.category_id = body.category_id != null && body.category_id !== "" ? body.category_id : null;
  }
  if (body.price != null) $set.price = safeNumber(body.price);
  if (body.image_url != null) $set.image_url = String(body.image_url || "").trim();
  if (body.is_active !== undefined) $set.is_active = !!body.is_active;
  if (body.services != null) {
    const services = normalizeBundleServices({ services: body.services });
    if (services.length < 1) {
      return res.status(400).json({ error: "At least one service line is required" });
    }
    $set.services = services;
  }

  try {
    const r = await db.collection("bundle_packages").updateOne({ _id: id }, { $set });
    if (r.matchedCount === 0) return res.status(404).json({ error: "Bundle not found" });
    return res.json({ success: true });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: "A bundle with this name already exists" });
    }
    return res.status(400).json({ error: e?.message || "Update failed" });
  }
}

async function deleteBundle(req, res) {
  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  let id;
  try {
    id = toObjectId(req.params?.id);
  } catch {
    return res.status(400).json({ error: "Invalid bundle id" });
  }

  const r = await db.collection("bundle_packages").updateOne(
    { _id: id },
    { $set: { is_active: false, updated_at: new Date().toISOString() } }
  );
  if (r.matchedCount === 0) return res.status(404).json({ error: "Bundle not found" });
  return res.json({ success: true });
}

function isSuspended(u) {
  return (
    u?.is_active === false ||
    u?.suspended === true ||
    u?.is_suspended === true ||
    u?.status === "suspended"
  );
}

async function orderBundle(req, res) {
  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const link = String(body.link || "").trim();
  const bundleQty = Math.max(1, parseInt(body.quantity, 10) || 1);

  let bundleOid;
  try {
    bundleOid = toObjectId(body.bundle_id);
  } catch {
    return res.status(400).json({ error: "Invalid bundle_id" });
  }

  if (!link) return res.status(400).json({ error: "link is required" });

  const bundle = await db.collection("bundle_packages").findOne({ _id: bundleOid });
  if (!bundle || bundle.is_active === false) {
    return res.status(404).json({ error: "Bundle not found or inactive" });
  }

  const user = await db.collection("users").findOne({ user_id: userId });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (isSuspended(user)) return res.status(403).json({ error: "Your account is suspended." });

  const unitPrice = safeNumber(bundle.price);
  const totalCharge = Number((unitPrice * bundleQty).toFixed(5));
  if (totalCharge <= 0) {
    return res.status(400).json({ error: "Invalid bundle price" });
  }

  if ((user.balance ?? 0) < totalCharge) {
    return res.status(400).json({
      error: `Insufficient balance. Required: ${totalCharge.toFixed(2)}, Available: ${(user.balance ?? 0).toFixed(2)}`,
    });
  }

  const lines = normalizeBundleServices(bundle);
  if (lines.length < 1) {
    return res.status(400).json({ error: "This bundle has no services configured" });
  }

  const parentOrderId = generateNumericOrderId();
  const now = new Date().toISOString();

  const prep = [];
  for (const line of lines) {
    const service = await findServiceById(db, line.service_id);
    if (!service) {
      return res.status(400).json({ error: `Service not found: ${line.service_id}` });
    }

    const qty = line.quantity * bundleQty;
    const min = parseInt(service.min ?? service.min_order ?? service.min_quantity ?? 0, 10);
    const max = parseInt(service.max ?? service.max_order ?? service.max_quantity ?? 1000000, 10);
    if (min && qty < min) {
      return res.status(400).json({
        error: `Service ${service.service_id}: quantity must be at least ${min} (bundle line × quantity)`,
      });
    }
    if (max && qty > max) {
      return res.status(400).json({
        error: `Service ${service.service_id}: quantity must be at most ${max}`,
      });
    }

    let category = null;
    if (service?.category_id) {
      const categoryId = String(service.category_id);
      const categoryFilter = [{ category_id: categoryId }];
      if (ObjectId.isValid(categoryId)) {
        try {
          categoryFilter.push({ _id: new ObjectId(categoryId) });
        } catch (_) {}
      }
      category = await db.collection("categories").findOne({ $or: categoryFilter });
    }

    const providerRate = Number(
      service.provider_rate ?? service.base_rate ?? service.original_rate ?? NaN
    );
    const estimatedProviderCharge =
      Number.isFinite(providerRate) && providerRate > 0
        ? Number(((providerRate / 1000) * qty).toFixed(5))
        : null;

    prep.push({ line, service, qty, category, estimatedProviderCharge });
  }

  const sumEst = prep.reduce((a, p) => a + (p.estimatedProviderCharge || 0), 0);
  const forceManualAll = sumEst > totalCharge + 0.0001;

  const childrenDocs = [];
  for (const { line, service, qty, category, estimatedProviderCharge } of prep) {
    const rate = parseFloat(service.rate ?? service.price ?? 0);
    const provider_id_val =
      service.provider_id != null && service.provider_id !== ""
        ? String(service.provider_id)
        : null;

    const provider = await loadProviderForService(db, service);
    const psid = resolveProviderServiceId(service);

    let provider_order_id = null;
    let provider_charge = null;
    let status = "in_progress";
    let mode = "Manual";
    let needsPriceApproval = false;

    if (forceManualAll) {
      needsPriceApproval = true;
      provider_charge = estimatedProviderCharge;
      status = "pending_manual";
      mode = "Manual";
    } else if (provider?.api_url && provider?.api_key && psid) {
      const pr = await providerAddOrder({
        apiUrl: provider.api_url,
        apiKey: provider.api_key,
        providerToken: provider.api_token || provider.token || "",
        providerServiceId: psid,
        link,
        quantity: qty,
      });
      if (!pr.ok) {
        return res.status(502).json({
          error: pr.error || "Provider order failed",
          details: pr.raw,
        });
      }
      provider_order_id = pr.provider_order_id;
      provider_charge = pr.provider_charge;
      mode = "Auto";
    } else if (provider && !psid) {
      status = "pending_manual";
      mode = "Manual";
    } else {
      status = "pending_manual";
      mode = "Manual";
    }

    const childId = generateNumericOrderId();
    childrenDocs.push({
      order_id: childId,
      user_id: userId,
      bundle_order_id: parentOrderId,
      bundle_id: String(bundle._id),
      bundle_name: bundle.name,
      service_id: service.service_id ?? line.service_id,
      service_name: service.name ?? service.service_name ?? "",
      category_id: service.category_id ? String(service.category_id) : null,
      category: category?.name ?? service.category_name ?? service.category ?? null,
      link,
      quantity: qty,
      charge: 0,
      price: 0,
      rate,
      start_count: 0,
      remains: qty,
      status,
      mode,
      provider_id: provider_id_val,
      provider_order_id,
      provider_charge,
      needs_price_approval: needsPriceApproval,
      created_at: now,
      updated_at: now,
    });
  }

  const anyManual = childrenDocs.some((c) => c.status === "pending_manual");
  const anyProgress = childrenDocs.some((c) => c.status === "in_progress");
  const parentStatus = anyManual ? "pending_manual" : anyProgress ? "in_progress" : "completed";

  const parentDoc = {
    order_id: parentOrderId,
    user_id: userId,
    is_bundle: true,
    bundle_name: bundle.name,
    bundle_id: String(bundle._id),
    bundle_order_id: parentOrderId,
    link,
    quantity: bundleQty,
    service_id: null,
    service_name: bundle.name,
    charge: totalCharge,
    price: totalCharge,
    rate: 0,
    start_count: 0,
    remains: bundleQty,
    status: parentStatus,
    mode: "Bundle",
    provider_id: null,
    provider_order_id: null,
    provider_charge: null,
    created_at: now,
    updated_at: now,
  };

  try {
    if (childrenDocs.length) {
      await db.collection("orders").insertMany(childrenDocs, { ordered: true });
    }
    await db.collection("orders").insertOne(parentDoc);
    await db.collection("users").updateOne({ user_id: userId }, { $inc: { balance: -totalCharge } });
  } catch (e) {
    console.error("[bundle order] persist failed:", e.message);
    return res.status(500).json({ error: "Could not save bundle order. Please try again." });
  }

  invalidateAllOrderLists();

  return res.json({
    success: true,
    message: "Bundle ordered successfully",
    order_id: parentOrderId,
    charge: totalCharge,
  });
}

async function getBundleSubOrders(req, res) {
  const db = await getDb();
  if (!db) return res.status(503).json({ success: false, sub_orders: [] });

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parentId = String(req.params.id || "").trim();
  if (!parentId) return res.status(400).json({ error: "Missing bundle order id" });

  const rows = await db
    .collection("orders")
    .find({
      user_id: userId,
      bundle_order_id: parentId,
      order_id: { $ne: parentId },
    })
    .sort({ created_at: 1 })
    .toArray();

  return res.json({ success: true, sub_orders: rows });
}

module.exports = {
  listBundles,
  getBundleById,
  adminListBundles,
  createBundle,
  updateBundle,
  deleteBundle,
  orderBundle,
  getBundleSubOrders,
};
