# Backend Modular Architecture – Migration Guide

This document describes the refactored backend layout and how to work with it locally and on Vercel.

---

## New Folder Structure

```
project-root/
├── api/
│   └── index.js              # Single serverless entry: Express app + Vercel wrapper
├── routes/
│   ├── auth.js               # /api/auth (login, register, me, session)
│   ├── orders.js             # /api/orders
│   ├── services.js           # /api/services
│   ├── user.js               # /api/user (profile, api-key, notifications, stats)
│   ├── deposits.js           # /api/deposits
│   ├── tickets.js            # /api/tickets
│   ├── public.js             # /api/public (settings, stats, pages/:slug)
│   └── admin.js              # /api/admin/* (dashboard, orders, providers, etc.)
├── lib/
│   ├── db.js                 # MongoDB connection (reused, not per-request)
│   ├── auth.js               # JWT / bcrypt helpers
│   ├── wrapHandler.js        # Wraps async handlers for Express + serverless
│   └── handlers/             # Existing handlers (unchanged)
│       ├── auth/
│       ├── orders/
│       ├── services/
│       ├── user/
│       ├── deposits/
│       ├── tickets/
│       ├── public/
│       ├── admin/
│       └── health.js
├── local-api-server.js       # Runs api/index.js on port 4000
└── vercel.json               # Rewrites /api/* → single function
```

---

## What Changed

| Before | After |
|--------|--------|
| All routes and `require()` calls lived in `api/index.js` | Routes live in `routes/*.js`; `api/index.js` only mounts them |
| Handlers were required and wrapped inline in one big file | Each route module uses Express Router and imports handlers from `lib/handlers/` |
| One large entry file, harder to debug and prone to load-time issues | Single entry `api/index.js` + small route modules; handlers unchanged |

---

## File Roles

- **`api/index.js`**  
  - Loads env, warms MongoDB via `lib/db`, creates Express app.  
  - Applies CORS, body parsing, `req.url` normalization, then mounts:
    - `/api/health` → health handler  
    - `/api/auth` → `routes/auth.js`  
    - `/api/orders` → `routes/orders.js`  
    - … same for services, user, deposits, tickets, public, admin.  
  - Registers 404 and error handler.  
  - Exports a **wrapper function** `(req, res)` for Vercel so uncaught errors don’t crash the function.

- **`lib/wrapHandler.js`**  
  - `wrap(handler)`: sets `req.url` from `req.originalUrl` and runs `handler(req, res)`, forwarding promise rejections to `next(err)` so Express and Vercel get a 500 instead of a crash.

- **`routes/*.js`**  
  - Each file creates an `express.Router()`, attaches handlers from `lib/handlers/` with `wrap()`, and exports the router.  
  - No business logic here; only routing and wrapping.

- **`lib/handlers/`**  
  - Unchanged. Same handlers as before; they are only imported by the new route modules.

- **`lib/db.js`**  
  - Same as before. Connection is cached in `globalThis` and reused across invocations (no new connection per request).

---

## Frontend API Paths (Unchanged)

All existing frontend paths still work:

- `/api/auth/login`, `/api/auth/register`, `/api/auth/me`
- `/api/orders`, `/api/orders/:id/refill`
- `/api/services`, `/api/services/categories`
- `/api/user/profile`, `/api/user/api-key`, `/api/user/stats`, …
- `/api/deposits`, `/api/tickets`, `/api/public/settings`, `/api/public/stats`, `/api/public/pages/:slug`
- `/api/admin/dashboard`, `/api/admin/orders`, `/api/admin/providers`, … (all admin routes)
- `/api/health`

---

## Migration Steps (Already Applied)

If you are re-applying or verifying the refactor:

1. **Create route modules**  
   Ensure all of `routes/auth.js`, `routes/orders.js`, `routes/services.js`, `routes/user.js`, `routes/deposits.js`, `routes/tickets.js`, `routes/public.js`, and `routes/admin.js` exist and match the structure above.

2. **Create `lib/wrapHandler.js`**  
   Export `wrap(handler)` as described.

3. **Replace `api/index.js`**  
   Use the version that only:
   - Requires env, `lib/db`, express.
   - Warms DB with `getDb().catch(() => {})`.
   - Uses `express.json()`, CORS, and `req.url` middleware.
   - Requires and mounts the route modules under `/api/...`.
   - Registers `/api/health`, 404, and error handler.
   - Exports the Vercel wrapper function.

4. **Leave `lib/handlers/` and `lib/db.js` unchanged.**

5. **Local run**  
   - `npm run dev:api` (uses `local-api-server.js` → `api/index.js`).  
   - Frontend: `cd frontend && npm start`.  
   - API base: `http://localhost:4000`; paths as above.

6. **Vercel**  
   - Single function: `api/index.js`.  
   - `vercel.json` rewrites `/api/(.*)` to `/api` so the same function serves all `/api/*` routes.  
   - Set env: `MONGO_URL` or `MONGODB_URI`, `DB_NAME`, `JWT_SECRET`.  
   - Redeploy after changing env or code.

---

## Adding a New Route

1. Add the handler in `lib/handlers/` (same as before).
2. In the right `routes/*.js` file, require the handler and add a route, e.g.:

   ```js
   const myHandler = require("../lib/handlers/...");
   router.get("/my-path", wrap(myHandler));
   ```

3. No need to touch `api/index.js` unless you add a whole new mount (e.g. a new `routes/other.js` and `app.use("/api/other", otherRoutes)`).

---

## Troubleshooting

- **500 / Function crashed on Vercel**  
  Check env vars (`MONGODB_URI`, `DB_NAME`, `JWT_SECRET`). Ensure `lib/db.js` and handlers are not modified in a way that throws at load time.

- **404 on a path**  
  Confirm the path is registered in the right `routes/*.js` and that the mount in `api/index.js` matches (e.g. `app.use("/api/auth", authRoutes)` so `routes/auth.js` serves `/api/auth/*`).

- **Handlers that use `req.url`**  
  The middleware in `api/index.js` sets `req.url = req.originalUrl || req.url` (and checks Vercel invoke headers). If a handler still sees the wrong path, ensure it runs after this middleware.
