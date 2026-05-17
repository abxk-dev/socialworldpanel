const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const h = require("../lib/handlers/reorderAlertHandler");

const router = express.Router();
router.get("/", wrap(h.listAlerts));
router.get("/unread-count", wrap(h.unreadCount));
router.get("/settings", wrap(h.getSettings));
router.put("/settings", wrap(h.putSettings));
router.post("/:id/dismiss", wrap(h.dismissAlert));
router.post("/:id/reorder", wrap(h.reorderFromAlert));

module.exports = router;
