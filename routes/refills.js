const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const { getUserRefills } = require("../lib/handlers/refillHandler");

const router = express.Router();
router.get("/", wrap(getUserRefills));

module.exports = router;
