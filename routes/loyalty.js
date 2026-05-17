const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const loyaltyHandler = require("../lib/handlers/loyaltyHandler");

const router = express.Router();

router.get("/summary", wrap(loyaltyHandler.getUserLoyaltySummary));
router.get("/transactions", wrap(loyaltyHandler.getLoyaltyTransactions));
router.post("/redeem", wrap(loyaltyHandler.redeemPoints));

module.exports = router;
