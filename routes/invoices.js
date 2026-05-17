const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const inv = require("../lib/handlers/invoiceHandler");

const router = express.Router();
router.get("/", wrap(inv.listInvoices));
router.get("/settings", wrap(inv.getBillingSettings));
router.put("/settings", wrap(inv.putBillingSettings));
router.get("/order/:orderId", wrap(inv.invoiceByOrder));
router.get("/:invoiceId/download", wrap(inv.downloadInvoice));
router.post("/bulk-download", wrap(inv.bulkDownload));

module.exports = router;
