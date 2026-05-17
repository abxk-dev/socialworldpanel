/**
 * Domain middleware (no-op fallback).
 *
 * The app expects `../lib/middleware/domainMiddleware` to exist, but your
 * revert removed it. For local development, we don't need domain filtering;
 * we just forward requests to route handlers.
 */
module.exports = function domainMiddleware(req, res, next) {
  return next();
};

