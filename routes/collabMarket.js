const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const c = require("../lib/handlers/collaborationMarketHandler");

const router = express.Router();
router.get("/listings", wrap(c.listListings));
router.post("/listings", wrap(c.createListing));
router.get("/listings/:id", wrap(c.getListing));
router.put("/listings/:id", wrap(c.updateListing));
router.delete("/listings/:id", wrap(c.deleteListing));
router.post("/listings/:id/apply", wrap(c.applyListing));
router.post("/listings/:id/report", wrap(c.reportListing));
router.get("/my-listings", wrap(c.myListings));
router.get("/my-applications", wrap(c.myApplications));
router.put("/applications/:id/accept", wrap(c.acceptApplication));
router.put("/applications/:id/reject", wrap(c.rejectApplication));

module.exports = router;
