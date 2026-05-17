const express = require("express");
const { wrap } = require("../lib/wrapHandler");

const depositsIndex = require("../lib/handlers/deposits/index");

const router = express.Router();

router.get("/", wrap(depositsIndex));
router.post("/", wrap(depositsIndex));

module.exports = router;
