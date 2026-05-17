# Run Full Website on Localhost (Frontend + API)

## 1) Create env file

Copy `.env.example` → `.env` in the project root and fill:

- `MONGO_URL` (or `MONGODB_URI`) = your MongoDB connection string
- `DB_NAME` = `socialworldpanel`
- `JWT_SECRET` = any long random string

For local testing, keep `REACT_APP_BACKEND_URL` empty so the frontend uses `/api`.
If you are serving the frontend from a non-CRA dev server (e.g., port 8000),
the app will still point to `http://localhost:4000/api` automatically in localhost.

## 2) Install dependencies

From the project root:

```bash
npm install
```

From the frontend folder:

```bash
cd frontend
npm install
```

## 3) Start API (port 4000)

From the project root:

```bash
npm run dev:api
```

This starts the API at:

- http://localhost:4000/api/public/settings

## 4) Start Frontend (port 3000)

In a second terminal:

```bash
cd frontend
npm start
```

Open:

- http://localhost:3000

The frontend proxies `/api/*` to `http://localhost:4000` automatically.

## 5) Create an admin user (one-time)

If you don’t have an admin account in MongoDB yet:

```bash
npm run seed:admin
```

Then login from the website with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
