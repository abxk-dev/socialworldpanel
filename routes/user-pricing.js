const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const userPricing = require("../lib/handlers/userPricingHandler");

const router = express.Router();

// User-side route: /api/user/my-pricing
router.get("/my-pricing", wrap(userPricing.getMyPricing));

// Admin-style routes (can be mounted under /api/user-pricing as well)
router.post("/", wrap(userPricing.adminSetUserPricing));
router.get("/", wrap(userPricing.adminListUserPricing));
router.get("/:id", wrap(userPricing.adminGetUserPricing));
router.put("/:id", wrap(userPricing.adminUpdateUserPricing));
router.delete("/:id", wrap(userPricing.adminDeleteUserPricing));
router.put("/:id/toggle", wrap(userPricing.adminToggleUserPricing));
router.get("/by-username/:username", wrap(userPricing.adminGetPricingsByUsername));
router.get("/by-service/:service_id", wrap(userPricing.adminGetPricingsByService));

module.exports = router;
