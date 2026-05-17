const express = require("express");
const { wrap } = require("../lib/wrapHandler");

const currenciesIndex = require("../lib/handlers/currencies/index");

const router = express.Router();

router.get("/", wrap(currenciesIndex));

module.exports = router;
