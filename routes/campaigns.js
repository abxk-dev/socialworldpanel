const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const campaigns = require("../lib/handlers/campaignHandler");

const router = express.Router();

router.post("/", wrap(campaigns.createCampaign));
router.get("/", wrap(campaigns.listCampaigns));
router.get("/:id", wrap(campaigns.getCampaign));
router.put("/:id", wrap(campaigns.updateCampaign));
router.put("/:id/performance", wrap(campaigns.updateCampaignPerformance));
router.delete("/:id", wrap(campaigns.deleteCampaign));

module.exports = router;

