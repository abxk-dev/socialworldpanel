const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const analyticsHandler = require("../lib/handlers/analyticsHandler");

const router = express.Router();

router.get("/dashboard", wrap(analyticsHandler.getDashboard));
router.get("/spending-chart", wrap(analyticsHandler.getSpendingChart));
router.get("/top-services", wrap(analyticsHandler.getTopServices));
router.get("/activity", wrap(analyticsHandler.getRecentActivity));

module.exports = router;
