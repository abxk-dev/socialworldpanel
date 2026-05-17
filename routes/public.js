const express = require("express");
const { wrap } = require("../lib/wrapHandler");

const settings = require("../lib/handlers/public/settings");
const stats = require("../lib/handlers/public/stats");
const liveFeed = require("../lib/handlers/public/live-feed");
const pageBySlug = require("../lib/handlers/public/pages/[slug]");
const vipTiers = require("../lib/handlers/public/vip-tiers");
const publicUploads = require("../lib/handlers/public/uploads");
const { getUpiPaymentSettings } = require("../lib/handlers/upiPayment");

const router = express.Router();

router.get("/uploads/:id", wrap(publicUploads));
router.get("/settings", wrap(settings));
router.get("/upi-settings", wrap(getUpiPaymentSettings));
router.get("/stats", wrap(stats));
router.get("/live-feed", wrap(liveFeed));
router.get("/vip-tiers", wrap(vipTiers));
router.get("/pages/:slug", wrap(pageBySlug));

module.exports = router;
