const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const collabReviews = require("../lib/handlers/reviewHandlerCollab");

const router = express.Router();

// Alias endpoints
router.post("/", wrap(collabReviews.submitCollabReview));
router.get("/:collab_id", wrap(collabReviews.getCollabReviews));

module.exports = router;

