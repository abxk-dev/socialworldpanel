# Social World Panel - SMM SaaS Platform

## Overview
A comprehensive Social Media Marketing (SMM) Panel SaaS platform allowing users to purchase social media services (followers, likes, views, etc.) with an advanced admin panel for management.

## Tech Stack
- **Frontend:** React 18, Tailwind CSS, Framer Motion, Recharts
- **Backend:** FastAPI (Python), modular architecture
- **Database:** MongoDB
- **Authentication:** JWT-based with session support

## Architecture

### Backend Structure (Modularized)
```
/app/backend/
├── main.py                 # App entry point, router setup
├── server.py              # Legacy re-export (imports from main.py)
├── models/
│   └── schemas.py         # Pydantic models for all entities
├── routes/
│   ├── auth.py           # Login, register, session handling
│   ├── user.py           # User profile, stats, API key
│   ├── services.py       # Public service listing
│   ├── orders.py         # Order creation, history
│   ├── payments.py       # Deposits, bonus preview
│   ├── tickets.py        # Support tickets
│   ├── providers.py      # Admin - API provider management
│   ├── admin.py          # Admin - Dashboard, CRUD operations
│   ├── reports.py        # Admin - Revenue/Profit/Orders/Payments reports
│   └── public.py         # Public stats, promotions
├── services/
│   ├── mock_provider.py  # MockSMMProvider for testing
│   ├── bonus.py          # Bonus calculation logic
│   └── activity.py       # Activity logging
└── middleware/
    └── auth.py           # JWT handling, user authentication
```

### Frontend Structure
```
/app/frontend/src/
├── pages/
│   ├── HomePage.jsx             # Landing page with animated stats
│   ├── LoginPage.jsx, RegisterPage.jsx
│   ├── dashboard/               # User panel pages
│   └── admin/
│       ├── AdminDashboard.jsx   # Charts dashboard (Recharts)
│       ├── AdminServices.jsx
│       ├── AdminOrders.jsx
│       ├── AdminUsers.jsx
│       ├── AdminProviders.jsx   # Provider management
│       ├── AdminBonuses.jsx     # Bonus tiers & promotions
│       ├── AdminReports.jsx     # Reports with CSV export
│       ├── AdminTickets.jsx
│       └── AdminSettings.jsx
├── components/
│   ├── layouts/                 # AdminLayout, DashboardLayout
│   └── ui/                      # Shadcn components
└── App.js                       # Router configuration
```

## Implemented Features

### Phase 1 (COMPLETE - March 2026)

#### 1. Admin Dashboard with Charts
- [x] Summary cards: Today Revenue, Total Revenue, Pending Orders, Total Users, Active Providers, Total Profit
- [x] Line chart: Revenue last 30 days (daily)
- [x] Bar chart: Orders last 30 days (daily)
- [x] Line chart: New users last 30 days
- [x] Donut chart: Orders by status (Pending/Processing/Completed/Failed/Cancelled)
- [x] Donut chart: Revenue by payment method
- [x] Horizontal bar chart: Top 5 best-selling services
- [x] Recent orders and deposits list
- [x] Low balance provider alerts

#### 2. Mock API Provider System
- [x] Providers list page with Name, URL, API Key (masked), Status, Balance, Last Sync
- [x] Add/Edit provider form with mock toggle
- [x] Test Connection button with ping time
- [x] Refresh Balance button
- [x] Import services with markup % setting
- [x] Sync prices from provider
- [x] Provider activity logs (last 10 API calls)
- [x] Color-coded balance: Green >$50, Yellow $10-50, Red <$10
- [x] MockSMMProvider class simulating real SMM API

#### 3. Fund Bonus Tier System
- [x] Admin page to configure bonus tiers
- [x] Default tiers: $10-49→3%, $50-99→5%, $100-199→8%, $200-499→10%, $500+→15%
- [x] Toggle: enable/disable entire bonus system
- [x] First deposit bonus: extra % on user's first deposit
- [x] Promotional bonus: time-limited with title, start/end date, bonus %, min deposit
- [x] Bonus shown to user before payment
- [x] Bonus logged in payment history

#### 4. Reports
- [x] Revenue Report: Date range, total revenue, transaction count, average, line chart, CSV export
- [x] Profit Report: Gross revenue vs provider costs vs net profit, margin %, CSV export
- [x] Orders Report: Orders by status breakdown, top 10 services by volume, CSV export
- [x] Payments Report: Table filterable by method/status/date, summary by method, total bonuses, CSV export

### Previously Implemented
- [x] Public website: Homepage, Services, Pricing, API docs, Blog, About, Contact
- [x] JWT authentication with email/password
- [x] User panel: Dashboard, New Order, Order History, Add Funds, Support Tickets
- [x] Dark Cyberpunk-Neon theme with glassmorphism
- [x] Animated homepage with stats ticker

## API Endpoints

### Public
- `GET /api/public/stats` - Platform statistics
- `GET /api/public/services` - Service listings
- `GET /api/public/promotions` - Active bonus promotions

### Auth
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user info
- `POST /api/auth/logout` - Logout

### User
- `GET /api/user/profile` - User profile
- `GET /api/user/stats` - User statistics
- `GET /api/services` - Browse services
- `POST /api/orders` - Create order
- `GET /api/orders` - Order history
- `GET /api/deposits/bonus-preview` - Preview bonus before deposit
- `POST /api/deposits` - Create deposit
- `POST /api/tickets` - Create ticket

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/dashboard/charts` - Chart data
- `GET /api/admin/providers` - List providers
- `POST /api/admin/providers/{id}/test` - Test connection
- `POST /api/admin/providers/{id}/import-services` - Import services
- `GET /api/admin/bonus/tiers` - List bonus tiers
- `GET /api/admin/bonus/promotions` - List promotions
- `GET /api/admin/reports/revenue` - Revenue report
- `GET /api/admin/reports/profit` - Profit report
- `GET /api/admin/reports/orders` - Orders report
- `GET /api/admin/reports/payments` - Payments report
- CSV export endpoints: `/api/admin/reports/{type}/export`

## Credentials
- **Admin:** admin@kalia.com / Hanumanji22@

## Mocked Integrations
- SMM API Provider (MockSMMProvider class)
- Payment Gateways (Paytm, Cryptomus, Stripe) - auto-complete for demo

## Upcoming Tasks (Phase 2)
- [ ] Promo codes system
- [ ] Enhanced user management (bulk actions, detailed view)
- [ ] Announcements system
- [ ] Affiliate/referral system

## Future Tasks (Phase 3+)
- [ ] Blog & SEO content management
- [ ] Staff roles and permissions
- [ ] Database backup system
- [ ] Real payment gateway integration
- [ ] Real SMM API provider integration
- [ ] 2FA authentication
- [ ] Drip-feed orders
