const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const collab = require("../lib/handlers/collaborationHandler");

const router = express.Router();

router.post("/", wrap(collab.createCollaboration));
router.get("/", wrap(collab.listCollaborations));
router.get("/:id", wrap(collab.getCollaboration));
router.put("/:id/status", wrap(collab.updateCollaborationStatus));
router.delete("/:id", wrap(collab.cancelCollaboration));

module.exports = router;

