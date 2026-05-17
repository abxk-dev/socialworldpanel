const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const { analyze } = require("../lib/handlers/healthScoreHandler");

const router = express.Router();
router.post("/analyze", wrap(analyze));

module.exports = router;
