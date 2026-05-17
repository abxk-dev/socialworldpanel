const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const promo = require("../lib/handlers/promocodeHandler");

const router = express.Router();

// Public/user endpoints (require auth inside handler)
router.post("/validate", wrap(promo.validatePromo));
router.post("/apply", wrap(promo.applyPromo));

// Admin helpers (duplicate of /api/admin/promocodes for compatibility)
router.post("/", wrap(promo.adminCreatePromo));
router.get("/", wrap(promo.adminListPromos));
router.get("/:id", wrap(promo.adminGetPromo));
router.put("/:id", wrap(promo.adminUpdatePromo));
router.delete("/:id", wrap(promo.adminDeletePromo));
router.put("/:id/toggle", wrap(promo.adminTogglePromo));
router.get("/:id/usage", wrap(promo.adminPromoUsage));

module.exports = router;

