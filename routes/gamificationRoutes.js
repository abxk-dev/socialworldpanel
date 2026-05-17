const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const g = require("../lib/handlers/gamificationHandler");

const router = express.Router();
router.get("/profile", wrap(g.getProfile));
router.get("/leaderboard", wrap(g.getLeaderboard));
router.get("/achievements", wrap(g.getAchievements));
router.get("/rewards", wrap(g.getRewards));

module.exports = router;
