const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const reviewHandler = require("../lib/handlers/reviewHandler");

const router = express.Router();

// Public (no auth)
router.get("/service/:serviceId", wrap(reviewHandler.getServiceReviews));
router.get("/summary/:serviceId", wrap(reviewHandler.getServiceReviewSummary));

// User (auth required)
router.post("/", wrap(reviewHandler.submitReview));
router.get("/my", wrap(reviewHandler.getUserReviews));
router.get("/eligible", wrap(reviewHandler.getEligibleServices));
router.put("/:serviceId", wrap(reviewHandler.updateReview));

// Collaboration reviews (auth required) — matches requested endpoints
// POST /api/reviews { collab_id, campaign_id?, rating, feedback, type }
// GET  /api/reviews/:collab_id
try {
  const collabReviews = require("../lib/handlers/reviewHandlerCollab");
  router.post("/collaboration", wrap(collabReviews.submitCollabReview));
  router.get("/collaboration/:collab_id", wrap(collabReviews.getCollabReviews));
  // For strict compatibility with requested GET /api/reviews/:collab_id,
  // we only enable when the param clearly looks like a collab id.
  router.get("/:collab_id", wrap(async (req, res, next) => {
    const id = String(req.params.collab_id || "");
    if (id.startsWith("collab_")) return collabReviews.getCollabReviews(req, res);
    return next();
  }));
  router.post("/", wrap(async (req, res, next) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (body && body.collab_id) return collabReviews.submitCollabReview(req, res);
    return next();
  }));
} catch (_) {}

module.exports = router;
