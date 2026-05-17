const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const templatesIndex = require("../lib/handlers/templates/index");
const templatesId = require("../lib/handlers/templates/[id]");

const router = express.Router();
router.get("/", wrap(templatesIndex));
router.get("/:id", wrap(templatesId));
router.post("/", wrap(templatesIndex));
router.put("/:id", wrap(templatesId));
router.delete("/:id", wrap(templatesId));
router.post("/:id/use", wrap(templatesId));
module.exports = router;
