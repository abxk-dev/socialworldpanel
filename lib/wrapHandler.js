/**
 * Async wrapper for Express route handlers.
 * Ensures thrown/rejected errors get converted to JSON responses
 * (and don't crash the process).
 */
function wrap(handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('wrap(handler) expects a function');
  }

  return async function wrapped(req, res, next) {
    try {
      // Support both sync and async handlers.
      return await handler(req, res, next);
    } catch (err) {
      if (res && res.headersSent) return next ? next(err) : undefined;

      const status =
        err?.statusCode ||
        err?.status ||
        (typeof err?.code === 'number' ? err.code : undefined) ||
        500;

      const message = err?.message || 'Internal server error';
      if (res && typeof res.status === 'function' && typeof res.json === 'function') {
        return res.status(status).json({ error: 'Server error', message });
      }

      if (next) return next(err);
      return undefined;
    }
  };
}

module.exports = { wrap };

