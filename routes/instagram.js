const express = require("express");
const { wrap } = require("../lib/wrapHandler");

const profile = require("../lib/handlers/instagram/profile");
const proxyImage = require("../lib/handlers/instagram/proxy-image");
const savedProfiles = require("../lib/handlers/instagram/saved-profiles");
const saveProfile = require("../lib/handlers/instagram/save-profile");
const unsaveProfile = require("../lib/handlers/instagram/unsave-profile");
const services = require("../lib/handlers/instagram/services");

const router = express.Router();

router.get("/profile", wrap(profile));
router.get("/proxy-image", wrap(proxyImage));
router.get("/saved-profiles", wrap(savedProfiles));
router.post("/save-profile", wrap(saveProfile));
router.delete("/save-profile/:username", wrap(unsaveProfile));
router.get("/services", wrap(services));

module.exports = router;
