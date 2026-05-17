const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const drip = require("../lib/handlers/dripCampaignHandler");

const router = express.Router();
router.post("/create", wrap(drip.createCampaign));
router.get("/campaigns", wrap(drip.listCampaigns));
router.get("/campaigns/:id/stats", wrap(drip.campaignStats));
router.put("/campaigns/:id/pause", wrap(drip.pauseCampaign));
router.put("/campaigns/:id/resume", wrap(drip.resumeCampaign));
router.delete("/campaigns/:id", wrap(drip.deleteCampaign));

module.exports = router;
