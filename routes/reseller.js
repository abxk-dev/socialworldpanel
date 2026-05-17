const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const resellerHandler = require("../lib/handlers/resellerHandler");
const resellerPanel = require("../lib/handlers/resellerPanelHandler");
const { resellerUserAuth, resellerAdminAuth } = require("../lib/middleware/resellerAuth");

function asyncAuth(mw) {
  return (req, res, next) => Promise.resolve(mw(req, res, next)).catch(next);
}

const router = express.Router();

// Main-panel users: white-label reseller setup (JWT = panel user)
router.post("/setup", wrap(resellerPanel.setup));
router.get("/panel-settings", wrap(resellerPanel.getPanelSettings));
router.put("/panel-settings", wrap(resellerPanel.putPanelSettings));
router.get("/clients", wrap(resellerPanel.listClients));
router.get("/profits", wrap(resellerPanel.profits));
router.get("/markup-prices", wrap(resellerPanel.getMarkups));
router.put("/markup-prices", wrap(resellerPanel.putMarkups));

router.get("/config", wrap(resellerHandler.getResellerConfig));
router.post("/auth/login", wrap(resellerHandler.resellerUserLogin));
router.post("/auth/register", wrap(resellerHandler.resellerUserRegister));
router.get("/services", wrap(resellerHandler.getResellerServices));
router.post("/orders", asyncAuth(resellerUserAuth), wrap(resellerHandler.placeResellerOrder));
router.get("/me", asyncAuth(resellerUserAuth), wrap(resellerHandler.getResellerMe));
router.get("/orders", asyncAuth(resellerUserAuth), wrap(resellerHandler.getResellerUserOrders));
router.get("/balance", asyncAuth(resellerUserAuth), wrap(resellerHandler.getResellerUserBalance));

router.post("/admin/login", wrap(resellerHandler.resellerAdminLogin));
router.get("/admin/dashboard", asyncAuth(resellerAdminAuth), wrap(resellerHandler.getResellerDashboard));
router.get("/admin/users", asyncAuth(resellerAdminAuth), wrap(resellerHandler.getResellerUsers));
router.post("/admin/users/:id/add-balance", asyncAuth(resellerAdminAuth), wrap(resellerHandler.addBalanceToUser));
router.get("/admin/prices", asyncAuth(resellerAdminAuth), wrap(resellerHandler.getResellerAdminPrices));
router.put("/admin/prices", asyncAuth(resellerAdminAuth), wrap(resellerHandler.updateResellerPrices));
router.get("/admin/orders", asyncAuth(resellerAdminAuth), wrap(resellerHandler.getResellerOrders));
router.put("/admin/brand", asyncAuth(resellerAdminAuth), wrap(resellerHandler.updateResellerBrand));

module.exports = router;
