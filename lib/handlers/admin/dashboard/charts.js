const { getDb } = require("../../_db");

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.json({
        revenue_by_day: [],
        users_by_day: [],
        orders_by_status: [],
        revenue_by_method: [],
        top_services: [],
      });
    }

    // Keep this lightweight: return small computed series for the last 30 days.
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 29);

    const orders = await db.collection("orders")
      .find({})
      .project({ created_at: 1, status: 1, price: 1, mode: 1, service_id: 1 })
      .sort({ created_at: -1 })
      .limit(5000)
      .toArray();

    const users = await db.collection("users")
      .find({})
      .project({ created_at: 1 })
      .sort({ created_at: -1 })
      .limit(5000)
      .toArray();

    const dayBuckets = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      dayBuckets.push({ key, label });
    }

    const revenueByDayMap = {};
    const usersByDayMap = {};
    const ordersByStatusMap = {};
    const revenueByMethodMap = {};
    const topServicesMap = {};

    for (const o of orders) {
      const dt = o?.created_at ? new Date(o.created_at) : null;
      if (!dt || Number.isNaN(dt.getTime())) continue;
      if (dt < from) continue;

      const dayKey = dt.toISOString().slice(0, 10);
      const status = String(o?.status || "unknown");

      ordersByStatusMap[status] = (ordersByStatusMap[status] || 0) + 1;

      if (["completed", "partial"].includes(status)) {
        const price = Number(o?.price ?? 0);
        revenueByDayMap[dayKey] = (revenueByDayMap[dayKey] || 0) + (Number.isFinite(price) ? price : 0);

        const method = o?.mode || "unknown";
        revenueByMethodMap[method] = (revenueByMethodMap[method] || 0) + (Number.isFinite(price) ? price : 0);

        const sid = o?.service_id;
        if (sid) topServicesMap[sid] = (topServicesMap[sid] || 0) + 1;
      }
    }

    for (const u of users) {
      const dt = u?.created_at ? new Date(u.created_at) : null;
      if (!dt || Number.isNaN(dt.getTime())) continue;
      if (dt < from) continue;
      const dayKey = dt.toISOString().slice(0, 10);
      usersByDayMap[dayKey] = (usersByDayMap[dayKey] || 0) + 1;
    }

    const revenue_by_day = dayBuckets.map((b) => ({
      label: b.label,
      revenue: revenueByDayMap[b.key] ?? 0,
      profit: 0,
    }));

    const users_by_day = dayBuckets.map((b) => ({
      label: b.label,
      users: usersByDayMap[b.key] ?? 0,
    }));

    const orders_by_status = Object.entries(ordersByStatusMap).map(([status, count]) => ({ status, count }));

    const revenue_by_method = Object.entries(revenueByMethodMap).map(([method, amount]) => ({ method, amount }));

    const topServiceIds = Object.entries(topServicesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sid]) => sid);

    const services = topServiceIds.length
      ? await db.collection("services")
        .find({ service_id: { $in: topServiceIds } })
        .project({ service_id: 1, name: 1 })
        .toArray()
      : [];

    const serviceById = Object.fromEntries(services.map((s) => [s.service_id, s]));

    const top_services = Object.entries(topServicesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sid, ordersCount]) => ({
        name: serviceById[sid]?.name || sid || "—",
        orders: ordersCount,
      }));

    res.json({
      revenue_by_day,
      users_by_day,
      orders_by_status,
      revenue_by_method,
      top_services,
    });
  } catch (_) {
    res.json({
      revenue_by_day: [],
      users_by_day: [],
      orders_by_status: [],
      revenue_by_method: [],
      top_services: [],
    });
  }
};

