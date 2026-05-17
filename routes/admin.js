const express = require("express");
const { wrap } = require("../lib/wrapHandler");

const dashboard = require("../lib/handlers/admin/dashboard");
const dashboardCharts = require("../lib/handlers/admin/dashboard/charts");
const orders = require("../lib/handlers/admin/orders");
const refreshProviderCharges = require("../lib/handlers/admin/orders/refresh-provider-charges");
const syncProviderStatuses = require("../lib/handlers/admin/orders/sync-provider-statuses");
const ordersById = require("../lib/handlers/admin/orders/[id]");
const ordersResend = require("../lib/handlers/admin/orders/[id]/resend");
const ordersRefill = require("../lib/handlers/admin/orders/[id]/refill");
const providers = require("../lib/handlers/admin/providers");
const providerById = require("../lib/handlers/admin/providers/[id]");
const providerTest = require("../lib/handlers/admin/providers/[id]/test");
const providerRefreshBalance = require("../lib/handlers/admin/providers/[id]/refresh-balance");
const providerServices = require("../lib/handlers/admin/providers/[id]/services");
const providerLogs = require("../lib/handlers/admin/providers/[id]/logs");
const providerImportServices = require("../lib/handlers/admin/providers/[id]/import-services");
const importHandlers = require("../lib/handlers/admin/importServices");
const providerSyncPrices = require("../lib/handlers/admin/providers/[id]/sync-prices");
const services = require("../lib/handlers/admin/services");
const servicesAvgTimes = require("../lib/handlers/admin/services-avg-times");
const serviceById = require("../lib/handlers/admin/services/[id]");
const duplicateService = require("../lib/handlers/admin/services/[id]/duplicate");
const users = require("../lib/handlers/admin/users");
const usersBulk = require("../lib/handlers/admin/users-bulk");
const userById = require("../lib/handlers/admin/users/[id]");
const userLoginAs = require("../lib/handlers/admin/users/login-as");
const platforms = require("../lib/handlers/admin/platforms");
const platformById = require("../lib/handlers/admin/platforms/[id]");
const pages = require("../lib/handlers/admin/pages");
const pageById = require("../lib/handlers/admin/pages/[id]");
const menu = require("../lib/handlers/admin/menu");
const adminNav = require("../lib/handlers/admin/admin-nav");
const settings = require("../lib/handlers/admin/settings");
const payments = require("../lib/handlers/admin/payments");
const balanceAdjust = require("../lib/handlers/admin/balance/adjust");
const tickets = require("../lib/handlers/admin/tickets");
const ticketById = require("../lib/handlers/admin/tickets/[id]");
const ticketReply = require("../lib/handlers/admin/tickets/[id]/reply");
const ticketClose = require("../lib/handlers/admin/tickets/[id]/close");
const notifications = require("../lib/handlers/admin/notifications");
const notificationsById = require("../lib/handlers/admin/notifications/[id]");
const notificationsResend = require("../lib/handlers/admin/notifications/[id]/resend");
const reportsRevenue = require("../lib/handlers/admin/reports/revenue");
const reportsProfit = require("../lib/handlers/admin/reports/profit");
const reportsOrders = require("../lib/handlers/admin/reports/orders");
const reportsPayments = require("../lib/handlers/admin/reports/payments");
const reportsDelivery = require("../lib/handlers/admin/reports/delivery");
const reportsExport = require("../lib/handlers/admin/reports/[type]/export");
const depositsReverse = require("../lib/handlers/admin/deposits/reverse");
const depositsUnblock = require("../lib/handlers/admin/deposits/unblock");
const { adminListRefills, adminRetryRefill } = require("../lib/handlers/refillHandler");
const files = require("../lib/handlers/admin/files");
const theme = require("../lib/handlers/admin/theme");
const meta = require("../lib/handlers/admin/meta");
const seo = require("../lib/handlers/admin/seo");
const statsSettings = require("../lib/handlers/admin/stats-settings");
const bulkAction = require("../lib/handlers/admin/bulk-action");
const hiddenServices = require("../lib/handlers/admin/hidden-services");
const freeTrialStats = require("../lib/handlers/admin/free-trial/stats");
const freeTrialSettings = require("../lib/handlers/admin/free-trial/settings");
const liveFeedSettings = require("../lib/handlers/admin/live-feed/settings");
const categories = require("../lib/handlers/services/categories");
const uploadLogo = require("../lib/handlers/admin/uploadLogo");
const uploadFavicon = require("../lib/handlers/admin/uploadFavicon");
const uploadHero = require("../lib/handlers/admin/uploadHero");
const uploadsServe = require("../lib/handlers/admin/uploadsServe");
const bonusTiers = require("../lib/handlers/admin/bonus/tiers");
const bonusPromotions = require("../lib/handlers/admin/bonus/promotions");
const bonusSettings = require("../lib/handlers/admin/bonus/settings");
const vipTiers = require("../lib/handlers/admin/vip-tiers");
const jobsStatus = require("../lib/handlers/admin/jobs-status");
const currenciesRates = require("../lib/handlers/admin/currencies-rates");
const {
  adminGetDeposits,
  adminSaveUpiSettings,
  adminGetUpiSettings,
} = require("../lib/handlers/upiPayment");
const {
  adminGetCryptoSettings,
  adminSaveCryptoSettings,
  adminGetCryptoDeposits,
} = require("../lib/handlers/cryptomusPayment");
const {
  adminGetManualDeposits,
  adminGetManualScreenshot,
  adminApproveManual,
  adminRejectManual,
  adminGetManualSettings,
  adminSaveManualSettings,
} = require("../lib/handlers/manualQrPayment");

const {
  adminGetCashfreeSettings,
  adminSaveCashfreeSettings,
} = require("../lib/handlers/cashfreeSettings");
const {
  adminGetGcashDeposits,
  adminGetGcashScreenshot,
  adminApproveGcash,
  adminRejectGcash,
  adminGetGcashSettings,
  adminSaveGcashSettings,
} = require("../lib/handlers/gcashPayment");
const resellerHandler = require("../lib/handlers/resellerHandler");
const providerHandler = require("../lib/handlers/providerHandler");
const adminCollabStats = require("../lib/handlers/admin/collab-stats");
const { getDb } = require("../lib/db");
const { roleGuard } = require("../lib/middleware/roleGuard");
const activityLogs = require("../lib/handlers/admin/activity-logs");
const spamHandler = require("../lib/handlers/admin/spamHandler");
const {
  changeRoleHandler,
  roleHistoryHandler,
  bulkRoleHandler,
} = require("../lib/handlers/admin/user-roles");

const router = express.Router();

router.get("/jobs/status", wrap(jobsStatus));
router.post("/currencies/rates", wrap(currenciesRates));

router.post("/upload/logo", wrap(uploadLogo));
router.post("/upload/favicon", wrap(uploadFavicon));
router.post("/upload/hero", wrap(uploadHero));
router.get("/uploads/:id", wrap(uploadsServe));

router.get("/bonus/tiers", wrap(bonusTiers));
router.post("/bonus/tiers", wrap(bonusTiers));
router.get("/bonus/tiers/:id", wrap(bonusTiers));
router.put("/bonus/tiers/:id", wrap(bonusTiers));
router.delete("/bonus/tiers/:id", wrap(bonusTiers));
router.get("/bonus/promotions", wrap(bonusPromotions));
router.post("/bonus/promotions", wrap(bonusPromotions));
router.get("/bonus/promotions/:id", wrap(bonusPromotions));
router.put("/bonus/promotions/:id", wrap(bonusPromotions));
router.delete("/bonus/promotions/:id", wrap(bonusPromotions));
router.get("/bonus/settings", wrap(bonusSettings));
router.put("/bonus/settings", wrap(bonusSettings));

router.get("/vip-tiers", wrap(vipTiers));
router.post("/vip-tiers", wrap(vipTiers));
router.put("/vip-tiers/:id", wrap(vipTiers));
router.delete("/vip-tiers/:id", wrap(vipTiers));

router.get("/dashboard", wrap(dashboard));
router.get("/dashboard/charts", wrap(dashboardCharts));
router.get("/recommendations/stats", wrap(require("../lib/handlers/admin/recommendations/stats")));
const withdrawalHandler = require("../lib/handlers/withdrawalHandler");
router.get("/withdrawals/stats", wrap(withdrawalHandler.adminStats));
router.get("/withdrawals", wrap(withdrawalHandler.adminListWithdrawals));
router.post("/withdrawals/:id/approve", wrap(withdrawalHandler.adminApprove));
router.post("/withdrawals/:id/reject", wrap(withdrawalHandler.adminReject));
router.get("/orders", wrap(orders));
router.post("/orders/refresh-provider-charges", wrap(refreshProviderCharges));
router.post("/orders/sync-provider-statuses", wrap(syncProviderStatuses));
router.post("/orders/:id/resend", wrap(ordersResend));
router.post("/orders/:id/refill", wrap(ordersRefill));
router.post("/orders/:orderId/switch-provider", wrap(providerHandler.manualSwitchOrder));
router.get("/orders/:id", wrap(ordersById));
router.put("/orders/:id", wrap(ordersById));
router.patch("/orders/:id", wrap(ordersById));
router.get("/providers", wrap(providerHandler.listProviders));
router.post("/providers", wrap(providerHandler.createProvider));
router.post("/providers/switch-all", wrap(providerHandler.switchAllPending));
router.post("/providers/test", wrap(importHandlers.testConnection));
router.post("/providers/fetch-services", wrap(importHandlers.fetchServices));
router.get("/provider-mappings", wrap(providerHandler.listMappings));
router.get("/provider-mappings/:serviceId", wrap(providerHandler.getServiceMapping));
router.put("/provider-mappings/:serviceId", wrap(providerHandler.updateServiceMapping));
router.get("/providers/:id", wrap(providerHandler.getProvider));
router.put("/providers/:id", wrap(providerHandler.updateProvider));
router.delete("/providers/:id", wrap(providerHandler.deleteProvider));
router.post("/providers/:id/pause", wrap(providerHandler.pauseProvider));
router.post("/providers/:id/resume", wrap(providerHandler.resumeProvider));
router.get("/providers/:id/balance", wrap(providerHandler.checkProviderBalance));
router.post("/providers/:id/test", wrap(providerTest));
router.post("/providers/:id/refresh-balance", wrap(providerRefreshBalance));
router.get("/providers/:id/services", wrap(providerServices));
router.get("/providers/:id/logs", wrap(providerLogs));
router.post("/providers/:id/import-services", wrap(providerImportServices));
router.post("/providers/:id/sync-prices", wrap(providerSyncPrices));
router.get("/services", wrap(services));
router.get("/services/avg-times", wrap(servicesAvgTimes));
router.post("/services", wrap(services));
router.post("/services/bulk-import", wrap(importHandlers.bulkImport));
router.get("/services/:id", wrap(serviceById));
router.put("/services/:id", wrap(serviceById));
router.delete("/services/:id", wrap(serviceById));
router.post("/services/:id/duplicate", wrap(duplicateService));
router.get("/categories", wrap(categories));
router.post("/categories", wrap(categories));
router.put("/categories/:category_id", wrap(categories));
router.delete("/categories/:category_id", wrap(categories));
router.patch("/categories/:category_id/toggle-status", wrap(categories));
router.get("/users", wrap(users));
router.post("/users/bulk", wrap(usersBulk));
router.get("/spam-stats", wrap(spamHandler.getSpamStats));
router.get("/spam-users", wrap(spamHandler.getSpamUsers));
router.get("/spam-alerts", wrap(spamHandler.getSpamAlerts));
router.get("/spam-scan-history", wrap(spamHandler.getScanHistory));
router.get("/spam-users/:userId/login-history", wrap(spamHandler.getUserLoginHistory));
router.post("/spam-users/:userId/ban", wrap(spamHandler.banSpamUser));
router.post("/spam-users/:userId/unban", wrap(spamHandler.unbanSpamUser));
router.post("/spam-alerts/:alertId/dismiss", wrap(spamHandler.dismissAlert));
router.get("/spam-ip/:ip", wrap(spamHandler.getIpDetails));
router.post("/spam-scan", wrap(spamHandler.runManualScan));
router.get("/users/:id", wrap(userById));
router.put("/users/:id", wrap(userById));
router.post("/users/:id/login-as", wrap(userLoginAs));
router.put("/users/:id/role", roleGuard(["main_admin"]), wrap(changeRoleHandler));
router.get("/users/:id/role-history", roleGuard(["main_admin"]), wrap(roleHistoryHandler));
router.put("/users/bulk-role", roleGuard(["main_admin"]), wrap(bulkRoleHandler));
router.get("/logs", roleGuard(["main_admin"]), wrap(activityLogs));
router.get("/platforms", wrap(platforms));
router.post("/platforms", wrap(platforms));
router.get("/platforms/:id", wrap(platformById));
router.put("/platforms/:id", wrap(platformById));
router.delete("/platforms/:id", wrap(platformById));
router.get("/pages", wrap(pages));
router.post("/pages", wrap(pages));
router.get("/pages/:id", wrap(pageById));
router.put("/pages/:id", wrap(pageById));
router.delete("/pages/:id", wrap(pageById));
router.get("/menu", wrap(menu));
router.put("/menu", wrap(menu));
router.get("/admin-nav", wrap(adminNav));
router.put("/admin-nav", wrap(adminNav));
router.get("/settings", wrap(settings));
router.put("/settings", wrap(settings));
router.get("/payments", wrap(payments));
router.put("/payments", wrap(payments));
router.get("/payment/upi/settings", wrap(adminGetUpiSettings));
router.post("/payment/upi/settings", wrap(adminSaveUpiSettings));
router.get("/payment/upi/deposits", wrap(adminGetDeposits));
router.get("/payment/cryptomus/settings", wrap(adminGetCryptoSettings));
router.post("/payment/cryptomus/settings", wrap(adminSaveCryptoSettings));
router.get("/payment/cryptomus/deposits", wrap(adminGetCryptoDeposits));
router.get("/payment/manual/deposits", wrap(adminGetManualDeposits));
router.get("/payment/manual/deposits/:id/screenshot", wrap(adminGetManualScreenshot));
router.post("/payment/manual/approve", wrap(adminApproveManual));
router.post("/payment/manual/reject", wrap(adminRejectManual));
router.get("/payment/manual/settings", wrap(adminGetManualSettings));
router.post("/payment/manual/settings", wrap(adminSaveManualSettings));
router.get("/payment/cashfree/settings", wrap(adminGetCashfreeSettings));
router.post("/payment/cashfree/settings", wrap(adminSaveCashfreeSettings));
router.get("/payment/gcash/settings", wrap(adminGetGcashSettings));
router.post("/payment/gcash/settings", wrap(adminSaveGcashSettings));
router.get("/payment/gcash/deposits", wrap(adminGetGcashDeposits));
router.get("/payment/gcash/deposits/:id/screenshot", wrap(adminGetGcashScreenshot));
router.post("/payment/gcash/approve", wrap(adminApproveGcash));
router.post("/payment/gcash/reject", wrap(adminRejectGcash));
router.post("/balance/adjust", wrap(balanceAdjust));
router.get("/tickets", wrap(tickets));
router.get("/tickets/:id", wrap(ticketById));
router.post("/tickets/:id/reply", wrap(ticketReply));
router.put("/tickets/:id/close", wrap(ticketClose));
router.get("/notifications", wrap(notifications));
router.post("/notifications", wrap(notifications));
router.get("/notifications/:id", wrap(notificationsById));
router.put("/notifications/:id", wrap(notificationsById));
router.delete("/notifications/:id", wrap(notificationsById));
router.post("/notifications/:id/resend", wrap(notificationsResend));
router.get("/reports/revenue", wrap(reportsRevenue));
router.get("/reports/profit", wrap(reportsProfit));
router.get("/reports/orders", wrap(reportsOrders));
router.get("/reports/payments", wrap(reportsPayments));
router.get("/reports/delivery", wrap(reportsDelivery));
router.get("/reports/:type/export", wrap(reportsExport));
router.post("/deposits/reverse", wrap(depositsReverse));
router.post("/deposits/unblock", wrap(depositsUnblock));
router.get("/refills", wrap(adminListRefills));
router.post("/refills/:refillId/retry", wrap(adminRetryRefill));
router.get("/files", wrap(files));
router.post("/files", wrap(files));
router.get("/theme", wrap(theme));
router.put("/theme", wrap(theme));
router.get("/meta", wrap(meta));
router.put("/meta", wrap(meta));
router.get("/seo", wrap(seo));
router.put("/seo", wrap(seo));
router.put("/seo/:page", wrap(seo));
router.get("/stats-settings", wrap(statsSettings));
router.put("/stats-settings", wrap(statsSettings));
router.post("/bulk-action", wrap(bulkAction));
router.get("/hidden-services", wrap(hiddenServices));
router.put("/hidden-services", wrap(hiddenServices));
router.get("/free-trial/stats", wrap(freeTrialStats));
router.get("/free-trial/settings", wrap(freeTrialSettings));
router.post("/free-trial/settings", wrap(freeTrialSettings));
router.get("/live-feed/settings", wrap(liveFeedSettings));
router.post("/live-feed/settings", wrap(liveFeedSettings));

router.get("/resellers", wrap(resellerHandler.adminListResellers));
router.post("/resellers", wrap(resellerHandler.adminCreateReseller));
router.put("/resellers/:id", wrap(resellerHandler.adminUpdateReseller));
router.delete("/resellers/:id", wrap(resellerHandler.adminSuspendReseller));
router.get("/resellers/:id/stats", wrap(resellerHandler.adminGetResellerStats));
router.post("/resellers/:id/add-balance", wrap(resellerHandler.adminAddResellerBalance));

const loyaltyHandler = require("../lib/handlers/loyaltyHandler");
router.get("/loyalty/settings", wrap(loyaltyHandler.getSettings));
router.put("/loyalty/settings", wrap(loyaltyHandler.updateSettings));
router.get("/loyalty", wrap(loyaltyHandler.getSettings));
router.put("/loyalty", wrap(loyaltyHandler.updateSettings));
router.get("/loyalty/users", wrap(loyaltyHandler.adminGetLoyaltyUsers));
router.post("/loyalty/adjust", wrap(loyaltyHandler.adminAdjustPoints));
router.get("/loyalty/transactions", wrap(loyaltyHandler.adminGetLoyaltyTransactions));

const massOrderHandler = require("../lib/handlers/massOrderHandler");
router.get("/mass-orders", wrap(massOrderHandler.adminListMassOrders));
router.get("/mass-orders/:id", wrap(massOrderHandler.adminGetMassOrder));
router.post("/mass-orders/:id/cancel", wrap(massOrderHandler.adminCancelMassOrder));

const reviewHandler = require("../lib/handlers/reviewHandler");
router.get("/reviews", wrap(reviewHandler.adminListReviews));
router.put("/reviews/:id/hide", wrap(reviewHandler.adminHideReview));
router.put("/reviews/:id/show", wrap(reviewHandler.adminShowReview));
router.delete("/reviews/:id", wrap(reviewHandler.adminDeleteReview));

// Promo codes (admin)
const promoHandler = require("../lib/handlers/promocodeHandler");
router.post("/promocodes", wrap(promoHandler.adminCreatePromo));
router.get("/promocodes", wrap(promoHandler.adminListPromos));
router.get("/promocodes/:id", wrap(promoHandler.adminGetPromo));
router.put("/promocodes/:id", wrap(promoHandler.adminUpdatePromo));
router.delete("/promocodes/:id", wrap(promoHandler.adminDeletePromo));
router.put("/promocodes/:id/toggle", wrap(promoHandler.adminTogglePromo));
router.get("/promocodes/:id/usage", wrap(promoHandler.adminPromoUsage));

// User custom pricing (admin)
const userPricingHandler = require("../lib/handlers/userPricingHandler");
router.post("/user-pricing", wrap(userPricingHandler.adminSetUserPricing));
router.get("/user-pricing", wrap(userPricingHandler.adminListUserPricing));
router.get("/user-pricing/:id", wrap(userPricingHandler.adminGetUserPricing));
router.put("/user-pricing/:id", wrap(userPricingHandler.adminUpdateUserPricing));
router.delete("/user-pricing/:id", wrap(userPricingHandler.adminDeleteUserPricing));
router.put("/user-pricing/:id/toggle", wrap(userPricingHandler.adminToggleUserPricing));
router.get("/user-pricing/by-username/:username", wrap(userPricingHandler.adminGetPricingsByUsername));
router.get("/user-pricing/by-service/:service_id", wrap(userPricingHandler.adminGetPricingsByService));

// --- Influencer Collaboration & Campaign Management (admin) ---
async function requireAdminInline(req) {
  const db = await getDb();
  const { parseAuth } = require("../lib/auth");
  const claims = parseAuth(req);
  if (!claims) return { db, admin: null };
  const u = await db.collection("users").findOne({ user_id: claims.sub }, { projection: { _id: 0, role: 1 } });
  const role = u?.role || "user";
  if (!u || !["admin", "main_admin"].includes(role)) return { db, admin: null };
  return { db, admin: u };
}

router.get("/collaborations", wrap(async (req, res) => {
  const { db, admin } = await requireAdminInline(req);
  if (!admin) return res.status(401).json({ success: false, data: null, message: "", error: "Unauthorized" });
  const filter = {};
  if (req.query.brand_id) filter.brand_id = String(req.query.brand_id);
  if (req.query.influencer_id) filter.influencer_id = String(req.query.influencer_id);
  if (req.query.status) filter.status = String(req.query.status);
  const items = await db.collection("collaborations").find(filter).sort({ created_at: -1 }).limit(200).toArray();
  return res.status(200).json({ success: true, data: { items }, message: "All collaborations", error: null });
}));

router.get("/campaigns", wrap(async (req, res) => {
  const { db, admin } = await requireAdminInline(req);
  if (!admin) return res.status(401).json({ success: false, data: null, message: "", error: "Unauthorized" });
  const filter = {};
  if (req.query.brand_id) filter.brand_id = String(req.query.brand_id);
  if (req.query.status) filter.status = String(req.query.status);
  const items = await db.collection("campaigns").find(filter).sort({ created_at: -1 }).limit(200).toArray();
  return res.status(200).json({ success: true, data: { items }, message: "All campaigns", error: null });
}));

router.get("/influencers", wrap(async (req, res) => {
  const { db, admin } = await requireAdminInline(req);
  if (!admin) return res.status(401).json({ success: false, data: null, message: "", error: "Unauthorized" });
  const items = await db.collection("influencers").find({}).project({ _id: 0 }).sort({ verified: -1, followers_count: -1 }).limit(500).toArray();
  return res.status(200).json({ success: true, data: { items }, message: "All influencers", error: null });
}));

router.put("/influencers/:id/verify", wrap(async (req, res) => {
  const { db, admin } = await requireAdminInline(req);
  if (!admin) return res.status(401).json({ success: false, data: null, message: "", error: "Unauthorized" });
  const id = String(req.params.id || "");
  await db.collection("influencers").updateOne({ influencer_id: id }, { $set: { verified: true, updated_at: new Date().toISOString() } });
  const updated = await db.collection("influencers").findOne({ influencer_id: id }, { projection: { _id: 0 } });
  return res.status(200).json({ success: true, data: updated, message: "Influencer verified", error: null });
}));

router.get("/collab-stats", wrap(adminCollabStats));

const smmAdmin = require("../lib/handlers/admin/smmFeaturesAdmin");
router.get("/ai-conversations", wrap(smmAdmin.aiConversations));
router.get("/health-scores", wrap(smmAdmin.healthScoresAdmin));
router.get("/drip-campaigns", wrap(smmAdmin.dripCampaignsAdmin));
router.get("/reseller-panels", wrap(smmAdmin.resellerPanelsAdmin));
router.put("/reseller-panels/:id/approve", wrap(smmAdmin.approveReseller));
router.put("/reseller-panels/:id/suspend", wrap(smmAdmin.suspendReseller));
router.get("/reorder-alerts", wrap(smmAdmin.reorderAlertsAdmin));
router.get("/gamification", wrap(smmAdmin.gamificationAdminGet));
router.put("/gamification", wrap(smmAdmin.gamificationAdminPut));
router.get("/gamification/leaderboard", wrap(smmAdmin.gamificationLeaderboardAdmin));
router.post("/gamification/award-xp", wrap(smmAdmin.gamificationAward));
router.post("/gamification/award-badge", wrap(smmAdmin.gamificationBadge));
router.get("/collab-listings", wrap(smmAdmin.collabListingsAdmin));
router.put("/collab-listings/:id/approve", wrap(smmAdmin.collabApprove));
router.put("/collab-listings/:id/remove", wrap(smmAdmin.collabRemove));
router.get("/platform-invoices", wrap(smmAdmin.invoicesAdmin));
router.get("/platform-invoices/:invoiceId/download", wrap(smmAdmin.invoiceAdminDownload));

module.exports = router;
