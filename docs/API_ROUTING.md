# API Routing — This Project Is Not Next.js

**There are no Next.js API routes in this project.** There is no `/app` directory, no `/pages/api`, and no catch-all like `[...path]` or `[...slug]`.

- **Frontend:** React (Create React App) in `/frontend` — built and served as static files from Vercel.
- **API:** A single **Express** app in **`api/index.js`** (Vercel serverless function). All `/api/*` requests are handled by this file.

The message `{"error":"Route /api/test?path=test not found"}` (or similar) comes from the **Express 404 handler** in `api/index.js`, not from a Next.js catch-all. When no Express route matches, that handler runs. Path restoration turns Vercel’s `/api?path=...` into `req.url = "/api/..."` so Express can match routes like `/api/admin/users`.

**Do not add** Next.js-style route files such as:
- `/app/api/[...path]/route.ts`
- `/app/api/admin/users/route.ts`
- `/pages/api/[...path].ts`

They would not be used; Vercel is configured to send all `/api/*` traffic to `api/index.js`. Adding them would duplicate or conflict with the existing API.

---

## How it works

| Layer | What |
|-------|------|
| **Vercel** | Rewrites `/api/(.*)` → `/api?path=$1`, so the function at `api/index.js` receives every `/api/*` request. |
| **api/index.js** | Restores the path from the `path` query (e.g. `path=admin/users` → `req.url = "/api/admin/users"`), then runs the Express app. |
| **Express** | Mounts routers: `app.use("/api/admin", adminRoutes)`, etc. So `/api/admin/users` is handled by `routes/admin.js` → `lib/handlers/admin/users.js`. |

## Express entry and route mounts

| Purpose | File / Mount |
|--------|---------------|
| **Server entry** | `api/index.js` (Vercel serverless; no `backend/server.js`) |
| **All /routes files** | Imported in `api/index.js` and mounted under `/api/*` |
| **Vercel export** | `module.exports = handler` where `handler(req, res)` runs `app(req, res)` |

| Mount | Route file | Example endpoint |
|-------|------------|-------------------|
| `app.use("/api/admin", adminRoutes)` | `routes/admin.js` | GET /api/admin/users, /api/admin/tickets, /api/admin/withdrawals/stats |
| `app.use("/api/auth", authRoutes)` | `routes/auth.js` | POST /api/auth/login |
| `app.use("/api/orders", orderRoutes)` | `routes/orders.js` | POST /api/orders |
| `app.use("/api/tickets", ticketsRoutes)` | `routes/tickets.js` | GET /api/tickets |
| `app.use("/api/withdrawals", withdrawalRoutes)` | `routes/withdrawals.js` | GET /api/withdrawals |
| … plus accounts, addfunds, analytics, payment, reviews, deposits, public, recommend, currencies, spin, upi, refills, reseller, loyalty, analytics, reviews, etc. | (all in `/routes`) | — |

- **GET /api/test** — Test route; returns `{ status: "API working" }`. No DB.
- **GET /api/ping** — Health ping; no DB.
- **GET /api/admin/users** — `routes/admin.js` → `router.get("/users", ...)` → `lib/handlers/admin/users.js`
- **GET /api/admin/tickets** — `routes/admin.js` → `router.get("/tickets", ...)` → `lib/handlers/admin/tickets.js`
- **GET /api/admin/withdrawals/stats** — `routes/admin.js` → `router.get("/withdrawals/stats", ...)` → `lib/handlers/withdrawalHandler.adminStats`

All admin handlers support **GET** (and some **POST/PUT**). They are wrapped with `wrap()` so async errors are passed to Express and return JSON.

## Files (no Next.js routes)

- **api/index.js** — Single serverless entry; path restoration, DB middleware, Express app, 404 handler.
- **routes/admin.js** — Admin route definitions; requires handlers from `lib/handlers/admin/`.
- **lib/handlers/admin/users.js**, **tickets.js**, etc. — Actual request handlers (export a single `async function handler(req, res)`).

## 404 response

If you hit a path that has no route, you get:

```json
{
  "error": "Route not found",
  "path": "/api/whatever",
  "message": "No handler registered for this path. API is Express in api/index.js (Vercel serverless), not Next.js."
}
```

Path is logged as `[API] 404 — no route for: /api/whatever` in Vercel function logs.

## Debugging

- Visit **GET /api/test** to confirm routing and path restoration.
- In Vercel → Project → Logs, look for `[API] Request path: GET /api/...` and `[API] 404 — no route for: ...`.
