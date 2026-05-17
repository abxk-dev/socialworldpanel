const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const {
  getUpiPaymentSettings,
  submitUpiDeposit,
  getUpiHistory,
} = require("../lib/handlers/upiPayment");
const {
  getCryptomusSettings,
  createCryptomusInvoice,
  cryptomusWebhook,
  getUserCryptoDeposits,
} = require("../lib/handlers/cryptomusPayment");
const {
  getManualQrSettings,
  createManualDeposit,
  submitManualDeposit,
  getManualHistory,
} = require("../lib/handlers/manualQrPayment");
const { getPublicCashfreeSettings } = require("../lib/handlers/cashfreeSettings");
const {
  getGcashSettings,
  createGcashDeposit,
  submitGcashDeposit,
} = require("../lib/handlers/gcashPayment");

const router = express.Router();

router.get("/upi/settings", wrap(getUpiPaymentSettings));
router.post("/upi/submit", wrap(submitUpiDeposit));
router.get("/upi/history", wrap(getUpiHistory));

router.get("/cryptomus/settings", wrap(getCryptomusSettings));
router.post("/cryptomus/create", wrap(createCryptomusInvoice));
router.post("/cryptomus/webhook", wrap(cryptomusWebhook));
router.get("/cryptomus/history", wrap(getUserCryptoDeposits));

router.get("/manual/settings", wrap(getManualQrSettings));
router.post("/manual/create", wrap(createManualDeposit));
router.post("/manual/submit", wrap(submitManualDeposit));
router.get("/manual/history", wrap(getManualHistory));

// Public Cashfree settings for Add Funds page (no secrets, no auth)
router.get("/cashfree/settings", wrap(getPublicCashfreeSettings));

router.get("/gcash/settings", wrap(getGcashSettings));
router.post("/gcash/create", wrap(createGcashDeposit));
router.post("/gcash/submit", wrap(submitGcashDeposit));

module.exports = router;
