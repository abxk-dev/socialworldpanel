const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const recommendHandler = require("../lib/handlers/recommend/index");
const recommenderHandler = require("../lib/handlers/recommenderHandler");

const router = express.Router();
router.get("/", wrap(recommendHandler));
router.post("/", wrap(recommenderHandler.getRecommendations));
module.exports = router;
