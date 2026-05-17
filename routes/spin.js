const express = require("express");
const { wrap } = require("../lib/wrapHandler");

const status = require("../lib/handlers/spin/status");
const spin = require("../lib/handlers/spin/spin");
const history = require("../lib/handlers/spin/history");

const router = express.Router();

router.get("/status", wrap(status));
router.post("/spin", wrap(spin));
router.get("/history", wrap(history));

module.exports = router;
