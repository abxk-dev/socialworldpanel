const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const { submitUpiDeposit, getUpiHistory } = require("../lib/handlers/upiPayment");

const router = express.Router();

router.post("/submit", wrap(submitUpiDeposit));
router.get("/history", wrap(getUpiHistory));

module.exports = router;
