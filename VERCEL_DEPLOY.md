# Deploy to Vercel – Step-by-Step Guide

This guide walks you through deploying the Social World Panel (frontend + API) to Vercel in one project.

---

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier is enough)
- Your code in a **Git repository** (GitHub, GitLab, or Bitbucket)
- A **MongoDB** database (e.g. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier)

---

## Step 1: Push Your Code to Git

If the project is not in a Git repo yet:

```bash
cd /path/to/socialworldpanel-main
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Use your actual repo URL and branch name (`main` or `master`).

---

## Step 2: Import the Project on Vercel

1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **“Add New…”** → **“Project”**.
3. **Import** your Git repository (GitHub/Gitlab/Bitbucket).
4. Select the **socialworldpanel** repo when it appears.
5. **Do not** change the “Root Directory”. Leave it as **`.`** (project root).
6. Click **“Deploy”** once to create the project (the first deploy may fail until env vars are set; that’s OK).

---

## Step 3: Set Environment Variables

After the project is created (even if the first deploy failed):

1. Open your project on Vercel.
2. Go to **Settings** → **Environment Variables**.
3. Add these variables. Use the same names exactly.

| Name | Value | Notes |
|------|--------|--------|
| `MONGO_URL` or `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/` | Your MongoDB connection string |
| `DB_NAME` | `socialworldpanel` | Database name |
| `JWT_SECRET` | A long random string | e.g. generate with `openssl rand -base64 32` |

**Using the main Vercel domain (e.g. `https://your-project.vercel.app`):**

- **Do not** add `REACT_APP_BACKEND_URL` in Vercel Environment Variables.
- The frontend code then uses **relative** `/api`, so in production all requests go to the same domain:
  - Page: `https://your-project.vercel.app`
  - API: `https://your-project.vercel.app/api/auth/login`, `/api/orders`, etc.
- One domain, no CORS issues, login and all API calls work on the main Vercel URL.

**Optional – only if you use a custom domain:**

- Set `REACT_APP_BACKEND_URL` = `https://your-custom-domain.com` (no `/api` at the end).

4. Choose **Production**, **Preview**, and **Development** for each variable (or at least **Production**).
5. Click **Save**.

**If you see 500 or 503 on login or “Failed to load settings”:** The API needs `MONGO_URL` (or `MONGODB_URI`) and `JWT_SECRET` in Vercel → Settings → Environment Variables. Add them, then redeploy.

---

## Step 4: Redeploy

1. Go to the **Deployments** tab.
2. Open the **⋯** menu on the latest deployment.
3. Click **Redeploy**.
4. Wait for the build to finish (a few minutes). The build will:
   - Install root dependencies (for the API)
   - Run `cd frontend && npm install --legacy-peer-deps && npm run build`
   - Deploy the `frontend/build` output and the `api/` folder as serverless functions

---

## Step 5: Create an Admin User (One-Time)

The app needs at least one admin user. You have two options.

**Option A – Run the seed script locally (recommended)**

1. In the project root, create a `.env` with the **same** values as on Vercel:
   - `MONGO_URL` or `MONGODB_URI`
   - `DB_NAME`
   - `JWT_SECRET`
   - Optionally `ADMIN_EMAIL` and `ADMIN_PASSWORD` (or the script will use defaults).
2. Run:
   ```bash
   npm run seed:admin
   ```
3. Use the printed (or default) email/password to log in on the deployed site.

**Option B – Register on the site and promote to admin in MongoDB**

1. Register a normal user on the deployed site.
2. In MongoDB (e.g. Atlas), open the `users` collection and set that user’s `role` to `admin`.

---

## Step 6: Open Your Live Site

1. In Vercel, open the **Deployments** tab.
2. Click the **Visit** link (e.g. `https://your-project.vercel.app`).
3. Log in with your admin account and start using the panel.

---

## Summary of What Runs on Vercel

- **Frontend:** Built from `frontend/` and served as static files. All non-`/api` routes are rewritten to the SPA (see `vercel.json`).
- **API:** A **single** serverless function (`api/index.js`) handles all `/api/*` routes (Express). It uses the root `node_modules` and the env vars you set.

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| **“This Serverless Function has crashed” / 500 on login** | Almost always **missing env vars**. In Vercel go to **Settings → Environment Variables** and add: `MONGO_URL` or `MONGODB_URI` (MongoDB connection string), `DB_NAME` (e.g. `socialworldpanel`), and `JWT_SECRET` (long random string). Then **Redeploy** from the Deployments tab. |
| Build fails on “dependency” or “peer dependency” | The root `vercel.json` uses `npm install --legacy-peer-deps` in the frontend build. If it still fails, add an **Install Command** in Vercel: `npm install && cd frontend && npm install --legacy-peer-deps`. |
| API returns 500 or “MONGO_URL is not set” | Add `MONGO_URL` (or `MONGODB_URI`) and `DB_NAME` in **Settings → Environment Variables** and redeploy. |
| Frontend loads but API calls fail | Ensure you did **not** set `REACT_APP_BACKEND_URL` (so the app uses relative `/api` on the same domain). If you use a custom domain, set `REACT_APP_BACKEND_URL` to that domain (e.g. `https://panel.example.com`). |
| 404 on `/api/...` | Confirm the repo root has both `api/` and `frontend/` and that **Root Directory** in Vercel is `.` (empty or project root). |
| Need a custom domain | In Vercel: **Settings → Domains** → add your domain and follow the DNS instructions. |

---

## Quick Reference – Repo Layout and Config

- **Root** `vercel.json`: build command, output directory, SPA rewrites, and (optional) function settings.
- **Root** `package.json`: dependencies for the API (e.g. `mongodb`, `jsonwebtoken`, `bcryptjs`).
- **Frontend** lives in `frontend/`; build output is `frontend/build`.
- **API** is a single file `api/index.js` (Express); all `/api/*` requests are handled by it.

You only need **one** Vercel project; the root `vercel.json` configures both the frontend and the API.
