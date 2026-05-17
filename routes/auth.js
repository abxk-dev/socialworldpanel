const express = require("express");
const rateLimit = require("express-rate-limit");
const { wrap } = require("../lib/wrapHandler");

const login = require("../lib/handlers/auth/login");
const register = require("../lib/handlers/auth/register");
const me = require("../lib/handlers/auth/me");
const refresh = require("../lib/handlers/auth/refresh");
const googleAuth = require("../lib/handlers/auth/google");
const googleCallback = require("../lib/handlers/auth/google-callback");

const DISABLE_AUTH_RATE_LIMIT =
  process.env.DISABLE_AUTH_RATE_LIMIT === "1" ||
  process.env.DISABLE_AUTH_RATE_LIMIT === "true";
const AUTH_RATE_LIMIT_WINDOW_MS = Math.max(
  10 * 1000,
  Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000)
);
const AUTH_RATE_LIMIT_MAX = Math.max(
  1,
  Number(process.env.AUTH_RATE_LIMIT_MAX || 30)
);

const authLimiter = DISABLE_AUTH_RATE_LIMIT
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
      max: AUTH_RATE_LIMIT_MAX,
      message: {
        error: `Too many attempts. Try again in ${Math.ceil(
          AUTH_RATE_LIMIT_WINDOW_MS / 60000
        )} minutes.`,
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
    });

const router = express.Router();

router.get("/google", wrap(googleAuth));
router.get("/google/callback", wrap(googleCallback));
router.post("/login", authLimiter, wrap(login));
router.post("/register", authLimiter, wrap(register));
router.get("/me", wrap(me));
router.post("/refresh", authLimiter, wrap(refresh));
router.post("/session", (req, res) => res.status(501).json({ detail: "Session callback not implemented" }));

module.exports = router;
