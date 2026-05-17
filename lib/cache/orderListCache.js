const CACHE_TTL_MS = Number(process.env.ORDER_LIST_CACHE_TTL_MS || 15000);

if (!globalThis.__swpOrderListCache) {
  globalThis.__swpOrderListCache = new Map();
}

function getStore() {
  return globalThis.__swpOrderListCache;
}

function now() {
  return Date.now();
}

function getCache(key) {
  const store = getStore();
  const item = store.get(key);
  if (!item) return null;
  if (item.expiresAt <= now()) {
    store.delete(key);
    return null;
  }
  return item.value;
}

function setCache(key, value, ttlMs = CACHE_TTL_MS) {
  const store = getStore();
  store.set(key, {
    value,
    expiresAt: now() + Math.max(1000, Number(ttlMs) || CACHE_TTL_MS),
  });
}

function invalidateByPrefix(prefix) {
  const store = getStore();
  for (const k of store.keys()) {
    if (String(k).startsWith(prefix)) store.delete(k);
  }
}

function invalidateAllOrderLists() {
  invalidateByPrefix("adminOrders:");
  invalidateByPrefix("userOrders:");
}

module.exports = {
  getCache,
  setCache,
  invalidateByPrefix,
  invalidateAllOrderLists,
};
