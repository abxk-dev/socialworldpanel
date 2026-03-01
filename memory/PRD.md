# Social World Panel - SMM SaaS Platform PRD

## Original Problem Statement
Build a full-stack SMM Panel SaaS website called "Social World Panel" (domain: socialworldpanel.com). Production-ready, SEO-optimized, mobile-responsive platform with stunning animations.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + shadcn/ui + Framer Motion + tsParticles
- **Backend**: FastAPI (Python) with async MongoDB
- **Database**: MongoDB
- **Auth**: JWT + Emergent Google OAuth
- **Theme**: Dark cyberpunk/neon with glassmorphism

## User Personas
1. **Social Media Marketers** - Need bulk SMM services
2. **Influencers** - Growing followers/engagement
3. **Resellers** - API access for own panels
4. **Businesses** - Brand awareness services
5. **Admin** - Panel management

## Core Requirements
- [x] Homepage with animated hero, stats ticker, typing effect
- [x] Services page with categories and filtering
- [x] User registration & login (JWT + Google OAuth)
- [x] User Dashboard with stats
- [x] New Order with real-time price calculation
- [x] Order History with status badges
- [x] Add Funds (Mock: Paytm, Cryptomus, Stripe)
- [x] Deposit History
- [x] Support Tickets system
- [x] API Access with key management
- [x] Profile settings
- [x] Admin Dashboard with revenue/orders/users
- [x] Admin Service Management (CRUD)
- [x] Admin Order Management
- [x] Admin User Management
- [x] Admin Ticket Management
- [x] Admin Settings

## What's Been Implemented (March 2026)
### Phase 1 - MVP Complete
- Full homepage with particle animations, typing effect, stats ticker
- Services page with category filtering, platform badges
- Complete auth flow (JWT + Google OAuth)
- User dashboard with stats cards and quick actions
- New Order with service selection, price calculator
- Order history with status tracking
- Add Funds with mock payment methods
- Support ticket system with messaging
- API key generation and documentation
- Admin panel with all CRUD operations
- Mobile responsive design
- Seeded sample services and categories

## P0 Features (Implemented)
- [x] User authentication (JWT + Google)
- [x] Services listing and ordering
- [x] Balance management
- [x] Order tracking
- [x] Admin CRUD operations

## P1 Features (Next Phase)
- [ ] Real payment integrations (Stripe, Paytm, Cryptomus)
- [ ] Email notifications (signup, orders, tickets)
- [ ] Order auto-status updates via cron
- [ ] SMM provider API integration
- [ ] Mass order feature (CSV upload)

## P2 Features (Future)
- [ ] Affiliate/referral system
- [ ] Multi-language support
- [ ] Child panels for resellers
- [ ] Advanced reporting
- [ ] Blog CMS

## Admin Credentials
- Email: admin@kalia.com
- Password: Hanumanji22@

## Mocked Features
- Payment processing (auto-completes for demo)
- SMM API provider (orders stay pending)
