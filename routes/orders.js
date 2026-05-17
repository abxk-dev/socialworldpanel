const express = require("express");
const { wrap } = require("../lib/wrapHandler");

const ordersIndex = require("../lib/handlers/orders/index");
const scheduled = require("../lib/handlers/orders/scheduled");
const reorder = require("../lib/handlers/orders/reorder");
const {
  orderBundle,
  getBundleSubOrders,
} = require("../lib/handlers/bundleHandler");
const { requestRefill } = require("../lib/handlers/refillHandler");
const resend = require("../lib/handlers/orders/[id]/resend");
const status = require("../lib/handlers/orders/[id]/status");
const cancelSchedule = require("../lib/handlers/orders/[id]/cancel-schedule");
const massOrderHandler = require("../lib/handlers/massOrderHandler");
const reorderHandler = require("../lib/handlers/reorderHandler");

const router = express.Router();

router.get("/frequently-reordered", wrap(reorderHandler.getFrequentlyReordered));
router.get("/:orderId/reorder-data", wrap(reorderHandler.getReorderData));
router.post("/:orderId/reorder", wrap(reorderHandler.confirmReorder));

router.post("/mass", wrap(massOrderHandler.placeMassOrder));
router.get("/mass", wrap(massOrderHandler.getUserMassOrders));
router.get("/mass/:id", wrap(massOrderHandler.getMassOrderDetail));
router.get("/mass/:id/orders", wrap(massOrderHandler.getMassOrderChildren));

router.get("/", wrap(ordersIndex));
router.get("/scheduled", wrap(scheduled));
router.post("/reorder", wrap(reorder));
router.post("/bundle", wrap(orderBundle));
router.get("/bundle/:id/sub-orders", wrap(getBundleSubOrders));
router.get("/:id/status", wrap(status));
router.delete("/:id/schedule", wrap(cancelSchedule));
router.post("/", wrap(ordersIndex));
router.post("/:id/refill", wrap(requestRefill));
router.post("/:id/resend", wrap(resend));

module.exports = router;
