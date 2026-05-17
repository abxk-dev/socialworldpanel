const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const influencers = require("../lib/handlers/influencerHandler");

const router = express.Router();

router.post("/register", wrap(influencers.registerInfluencer));
router.get("/", wrap(influencers.discoverInfluencers));
router.get("/:id", wrap(influencers.getInfluencer));
router.put("/:id", wrap(influencers.updateInfluencer));
router.get("/:id/analytics", wrap(influencers.getInfluencerAnalytics));

module.exports = router;

