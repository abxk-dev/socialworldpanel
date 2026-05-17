const { getDb } = require("../_db");

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function computeRevenueProfit(db, matchStage) {
  // cost = (services.cost / 1000) * orders.quantity
  const agg = await db
    .collection("orders")
    .aggregate([
      {
        $addFields: {
          created_at_dt: {
            $convert: {
              input: "$created_at",
              to: "date",
              onError: null,
              onNull: null,
            },
          },
        },
      },
      ...(matchStage || []),
      {
        $lookup: {
          from: "services",
          localField: "service_id",
          foreignField: "service_id",
          as: "service_docs",
        },
      },
      {
        $unwind: {
          path: "$service_docs",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: {
              $convert: {
                input: { $ifNull: ["$charge", { $ifNull: ["$price", 0] }] },
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
          cost: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $convert: {
                        input: { $ifNull: ["$provider_charge", { $ifNull: ["$provider_cost", 0] }] },
                        to: "double",
                        onError: 0,
                        onNull: 0,
                      },
                    },
                    0,
                  ],
                },
                {
                  $convert: {
                    input: { $ifNull: ["$provider_charge", { $ifNull: ["$provider_cost", 0] }] },
                    to: "double",
                    onError: 0,
                    onNull: 0,
                  },
                },
                {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $convert: {
                            input: { $ifNull: ["$service_docs.cost", 0] },
                            to: "double",
                            onError: 0,
                            onNull: 0,
                          },
                        },
                        1000,
                      ],
                    },
                    {
                      $convert: {
                        input: { $ifNull: ["$quantity", 0] },
                        to: "double",
                        onError: 0,
                        onNull: 0,
                      },
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    ])
    .toArray();

  const revenue = agg?.[0]?.revenue ?? 0;
  const cost = agg?.[0]?.cost ?? 0;
  return { revenue: toNum(revenue), profit: toNum(revenue - cost), cost: toNum(cost) };
}

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.json({ success: false, data: {} });

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const [today, total, pendingOrders, processingOrders, totalUsers, newUsersToday, providers] = await Promise.all([
      computeRevenueProfit(db, [
        {
          $match: {
            status: { $in: ["completed", "partial"] },
          },
        },
        {
          $match: {
            created_at_dt: { $gte: startOfToday, $lt: startOfTomorrow },
          },
        },
      ]),
      computeRevenueProfit(db, [
        {
          $match: {
            status: { $in: ["completed", "partial"] },
          },
        },
      ]),
      db.collection("orders").countDocuments({ status: "pending" }),
      db.collection("orders").countDocuments({ status: { $in: ["processing", "in_progress"] } }),
      db.collection("users").countDocuments({}),
      db
        .collection("users")
        .aggregate([
          {
            $addFields: {
              created_at_dt: {
                $convert: {
                  input: "$created_at",
                  to: "date",
                  onError: null,
                  onNull: null,
                },
              },
            },
          },
          {
            $match: {
              created_at_dt: { $gte: startOfToday, $lt: startOfTomorrow },
            },
          },
          { $count: "count" },
        ])
        .toArray()
        .then((a) => Number(a?.[0]?.count || 0))
        .catch(() => 0),
      db
        .collection("providers")
        .find({})
        .project({ provider_id: 1, balance: 1, balance_threshold: 1, is_active: 1, status: 1 })
        .toArray(),
    ]);

    const revenueToday = today.revenue;
    const profitToday = today.profit;
    const revenueTotal = total.revenue;
    const profitTotal = total.profit;

    const activeProviders = (providers || []).filter(
      (p) => p?.is_active !== false && String(p?.status || "active").toLowerCase() !== "inactive"
    );

    const lowBalanceProviders = activeProviders
      .filter((p) => {
        const threshold = p?.balance_threshold;
        if (threshold == null) return false;
        const t = Number(threshold);
        const b = Number(p?.balance);
        return Number.isFinite(t) && Number.isFinite(b) && b <= t;
      })
      .map((p) => p.provider_id)
      .filter(Boolean);

    res.json({
      revenue_today: revenueToday,
      profit_today: Math.round(profitToday * 100) / 100,
      revenue_total: revenueTotal,
      total_profit: Math.round(profitTotal * 100) / 100,
      pending_orders: pendingOrders,
      processing_orders: processingOrders,
      total_users: totalUsers,
      new_users_today: newUsersToday,
      active_providers: activeProviders.length,
      low_balance_providers: lowBalanceProviders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
