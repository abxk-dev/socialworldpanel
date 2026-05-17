const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const accountsIndex = require("../lib/handlers/accounts/index");
const accountsId = require("../lib/handlers/accounts/[id]");

const router = express.Router();
router.get("/", wrap(accountsIndex));
router.post("/", wrap(accountsIndex));
router.put("/:id", wrap(accountsId));
router.delete("/:id", wrap(accountsId));
module.exports = router;
