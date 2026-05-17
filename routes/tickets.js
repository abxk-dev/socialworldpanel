const express = require("express");
const { wrap } = require("../lib/wrapHandler");

const ticketsIndex = require("../lib/handlers/tickets/index");
const ticketById = require("../lib/handlers/tickets/[id]/index");
const ticketReply = require("../lib/handlers/tickets/[id]/reply");

const router = express.Router();

router.get("/", wrap(ticketsIndex));
router.post("/", wrap(ticketsIndex));
router.get("/:id", wrap(ticketById));
router.post("/:id/reply", wrap(ticketReply));

module.exports = router;
