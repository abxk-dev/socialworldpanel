const express = require("express");
const { wrap } = require("../lib/wrapHandler");

const profile = require("../lib/handlers/user/profile");
const apiKey = require("../lib/handlers/user/api-key");
const regenerateApiKey = require("../lib/handlers/user/api-key/regenerate");
const notificationsList = require("../lib/handlers/user/notifications-list");
const notificationsUnreadCount = require("../lib/handlers/user/notifications-unread-count");
const notificationsReadOne = require("../lib/handlers/user/notifications-read-one");
const notificationsReadAll = require("../lib/handlers/user/notifications-read-all");
const stats = require("../lib/handlers/user/stats");
const currency = require("../lib/handlers/user/currency");
const referral = require("../lib/handlers/user/referral");

const router = express.Router();

router.get("/profile", wrap(profile));
router.get("/referral", wrap(referral));
router.post("/referral", wrap(referral));
router.put("/profile", wrap(profile));
router.get("/api-key", wrap(apiKey));
router.post("/api-key/regenerate", wrap(regenerateApiKey));
router.get("/notifications", wrap(notificationsList));
router.get("/notifications/unread-count", wrap(notificationsUnreadCount));
router.post("/notifications/read-all", wrap(notificationsReadAll));
router.post("/notifications/:id/read", wrap(notificationsReadOne));
router.get("/stats", wrap(stats));
router.patch("/currency", wrap(currency));

module.exports = router;
