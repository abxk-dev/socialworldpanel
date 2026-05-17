const { getDb } = require("../../_db");

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.json({
        total_trials_used: 0,
        converted_to_paid: 0,
        conversion_rate_pct: 0,
        revenue_from_converted: 0,
      });
    }

    const total_trials_used = await db.collection("orders").countDocuments({ is_free_trial: true });

    const trialUserIds = await db
      .collection("orders")
      .distinct("user_id", { is_free_trial: true });

    let converted_to_paid = 0;
    let revenue_from_converted = 0;

    if (trialUserIds.length) {
      const paidAgg = await db
        .collection("orders")
        .aggregate([
          {
            $match: {
              user_id: { $in: trialUserIds },
              $or: [{ is_free_trial: { $exists: false } }, { is_free_trial: false }],
              charge: { $gt: 0 },
            },
          },
          { $group: { _id: "$user_id", spent: { $sum: "$charge" } } },
        ])
        .toArray();

      converted_to_paid = paidAgg.length;
      revenue_from_converted = paidAgg.reduce((s, r) => s + (Number(r.spent) || 0), 0);
    }

    const conversion_rate_pct =
      total_trials_used > 0 ? Math.round((converted_to_paid / total_trials_used) * 1000) / 10 : 0;

    return res.json({
      total_trials_used,
      converted_to_paid,
      conversion_rate_pct,
      revenue_from_converted,
    });
  } catch (err) {
    return res.json({
      total_trials_used: 0,
      converted_to_paid: 0,
      conversion_rate_pct: 0,
      revenue_from_converted: 0,
    });
  }
};
