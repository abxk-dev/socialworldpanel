# Fix: "Server selection timed out" and "querySrv EREFUSED" (MongoDB Atlas)

## 0. querySrv EREFUSED (DNS / SRV resolution)

If you see **`querySrv EREFUSED _mongodb._tcp.cluster0.xxxxx.mongodb.net`**:

- Your network or DNS server is blocking or refusing SRV lookups. The app tries to use public DNS (8.8.8.8, 1.1.1.1) when using a `mongodb+srv://` URI so this often fixes itself after a restart.
- If it persists: use a **standard connection string** from Atlas (no `+srv`). In Atlas: **Database → Connect → Connect using MongoDB Compass** and copy the URI (it uses `mongodb://` and explicit host:port). Set that as `MONGODB_URI` in your `.env`.

---

## 1. Network Access (IP Whitelist)

If you don't have `0.0.0.0/0` in **Network Access → IP Access List**:
- Add it: **Add IP Address** → **Allow Access from Anywhere**
- Wait 1–2 minutes after saving

---

## 2. Still timing out? Check these

### Cluster is running
- **Free tier clusters pause after 60 days** of inactivity
- In Atlas → **Database** → if your cluster shows a **Resume** button, click it and wait 1–2 minutes

### Connection string in Vercel
1. Vercel → Project → **Settings** → **Environment Variables**
2. Ensure `MONGODB_URI` or `MONGO_URL` is set for **Production**
3. Copy the URI from Atlas: **Database** → **Connect** → **Connect your application** → copy the string
4. Use this format:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Password with special characters** must be URL-encoded (e.g. `@` → `%40`, `#` → `%23`)
6. After changing env vars, **Redeploy** (Deployments → ⋮ → Redeploy)

### Database user permissions
- Atlas → **Database Access** → your user → **Edit**
- Ensure **Built-in Role** is at least **Read and write to any database** (or Atlas Admin)

### Wrong variable name
- Code checks `MONGO_URL` first, then `MONGODB_URI`
- Use exactly one of these names in Vercel

---

## 3. Test locally

Run locally with the same `.env` as production. If it works locally but not on Vercel, the issue is with Vercel env vars or deployment.
