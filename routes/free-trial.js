const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const check = require("../lib/handlers/free-trial/check");
const claim = require("../lib/handlers/free-trial/claim");

const router = express.Router();
router.get("/check", wrap(check));
router.post("/claim", wrap(claim));
module.exports = router;
