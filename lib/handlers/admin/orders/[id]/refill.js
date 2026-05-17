const { getDb } = require("../../../_db");
const { executeOrderRefill } = require("../../../../orders/refillExecute");

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: "Database unavailable" });
    }

    const { id } = req.params;
    const result = await executeOrderRefill(db, {
      panelOrderId: id,
      requesterUserId: null,
      allowAdmin: true,
    });

    return res.status(result.httpStatus).json(result.body);
  } catch (err) {
    console.error("[admin refill]", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
