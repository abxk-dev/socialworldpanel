const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const withdrawalHandler = require("../lib/handlers/withdrawalHandler");

const router = express.Router();

router.get("/settings", wrap(withdrawalHandler.getWithdrawalSettings));
router.get("/", wrap(withdrawalHandler.getUserWithdrawals));
router.post("/", wrap(withdrawalHandler.requestWithdrawal));
router.delete("/:id", wrap(withdrawalHandler.cancelWithdrawal));

module.exports = router;
