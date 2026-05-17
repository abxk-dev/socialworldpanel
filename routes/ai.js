const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const ai = require("../lib/handlers/aiRecommenderHandler");
const { orderAssist } = require("../lib/handlers/aiOrderAssistant");

const router = express.Router();

router.post("/recommend-influencers", wrap(ai.recommendInfluencers));
router.post("/suggest-campaign", wrap(ai.suggestCampaign));
router.post("/order-assist", wrap(orderAssist));

module.exports = router;

