const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const contracts = require("../lib/handlers/contractHandler");

const router = express.Router();

router.post("/", wrap(contracts.generateContract));
router.get("/:id", wrap(contracts.getContract));
router.put("/:id/sign", wrap(contracts.signContract));

module.exports = router;

