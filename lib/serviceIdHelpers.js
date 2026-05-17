/** Normalize admin-entered service id (trim, strip leading #). */
function normalizeAdminServiceId(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/^#/, "");
}

/** Split comma/space/semicolon-separated service ids from settings. */
function parseSpinServiceIdList(raw) {
  if (raw == null) return [];
  return String(raw)
    .split(/[\s,;|]+/)
    .map((x) => normalizeAdminServiceId(x))
    .filter(Boolean);
}

/** If list is empty → any service allowed for spin free views. Otherwise service must match one id. */
function spinFreeViewsServiceAllowed(serviceId, settingsRaw) {
  const ids = parseSpinServiceIdList(settingsRaw);
  if (ids.length === 0) return true;
  const key = String(serviceId ?? "").trim();
  const norm = normalizeAdminServiceId(key);
  const n = Number(norm);
  return ids.some((id) => {
    const a = String(id);
    return a === key || normalizeAdminServiceId(a) === norm || (Number.isFinite(n) && Number(a) === n);
  });
}

/** Build Mongo query to find a service by configured id string. */
function serviceByConfiguredIdQuery(configuredId) {
  const s = normalizeAdminServiceId(configuredId);
  if (!s) return null;
  const n = Number(s);
  const or = [{ service_id: s }];
  if (Number.isFinite(n)) or.push({ service_id: n });
  return { $or: or, is_active: { $ne: false } };
}

module.exports = {
  normalizeAdminServiceId,
  parseSpinServiceIdList,
  spinFreeViewsServiceAllowed,
  serviceByConfiguredIdQuery,
};
