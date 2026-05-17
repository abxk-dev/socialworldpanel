# Sub-Reseller / White-Label Setup

When admin creates a new reseller with domain `johnsmmpanel.com`:

1. **Add domain in Vercel**
   - Vercel Dashboard → Project → Settings → Domains → Add `johnsmmpanel.com`
   - Or via CLI: `vercel domains add johnsmmpanel.com`

2. **Reseller DNS**
   - Reseller points their domain DNS:
   - **CNAME** `@` (or `www`) → `cname.vercel-dns.com`
   - Or use Vercel nameservers if transferring DNS to Vercel

3. **Environment**
   - Set `MAIN_DOMAIN=socialworldpanel.com` in Vercel (so main panel is not treated as reseller).

4. **Go live**
   - Once DNS propagates, the reseller panel is live at their domain.
   - Backend detects the `Host` header → loads reseller config → white-label (logo, colors, footer) applies automatically.

5. **Reseller admin**
   - Reseller logs in at `https://johnsmmpanel.com/reseller-admin/login` (reseller admin panel).
   - They manage their users, prices, orders, and branding from there.
