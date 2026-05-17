// Plain config (no React components) describing the default admin navigation
// structure. This is used both by the Admin navigation layout and the
// Admin Menu builder when saving custom order.

export const DEFAULT_ADMIN_NAV_CONFIG = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    type: 'submenu',
    children: [
      { id: 'dashboard-main', label: 'Dashboard', path: '/admin' },
      { id: 'dashboard-payments', label: 'Payment Methods', path: '/admin/payments' },
      { id: 'dashboard-reports', label: 'Payment History', path: '/admin/payment-history' },
    ],
  },
  {
    id: 'user',
    label: 'User',
    type: 'submenu',
    children: [
      { id: 'user-users', label: 'Users', path: '/admin/users' },
      { id: 'user-resellers', label: 'Resellers', path: '/admin/resellers' },
      { id: 'user-orders', label: 'Orders', path: '/admin/orders' },
      { id: 'user-refills', label: 'Refill Requests', path: '/admin/refills' },
      { id: 'user-reviews', label: 'Reviews', path: '/admin/reviews' },
      { id: 'user-spam', label: 'Spam Users', path: '/admin/spam-users' },
    ],
  },
  {
    id: 'category',
    label: 'Category',
    type: 'submenu',
    children: [
      { id: 'category-services', label: 'Services', path: '/admin/services' },
      { id: 'category-bundles', label: 'Bundle Packages', path: '/admin/bundles' },
      { id: 'category-management', label: 'Category Management', path: '/admin/category-management' },
    ],
  },
  {
    id: 'provider',
    label: 'Provider',
    type: 'submenu',
    children: [
      { id: 'provider-providers', label: 'Providers', path: '/admin/providers' },
      { id: 'provider-import', label: 'Import Services', path: '/admin/import' },
    ],
  },
  {
    id: 'bonuses',
    label: 'Bonuses',
    type: 'submenu',
    children: [
      { id: 'bonuses-bonuses', label: 'Bonuses', path: '/admin/bonuses' },
      { id: 'bonuses-loyalty', label: 'Loyalty Program', path: '/admin/loyalty' },
      { id: 'bonuses-vip', label: 'VIP Tiers', path: '/admin/vip-tiers' },
      { id: 'bonuses-spin', label: 'Spin Wheel', path: '/admin/spin-rewards' },
      { id: 'bonuses-promocodes', label: 'Promo Codes', path: '/admin/promocodes' },
      { id: 'bonuses-user-pricing', label: 'User Pricing', path: '/admin/user-pricing' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    type: 'submenu',
    children: [
      { id: 'reports-main', label: 'Reports', path: '/admin/reports' },
      { id: 'reports-withdrawals', label: 'Withdrawals', path: '/admin/withdrawals' },
      { id: 'reports-analytics', label: 'Analytics', path: '/admin/analytics' },
      { id: 'reports-logs', label: 'Activity Logs', path: '/admin/logs' },
    ],
  },
  {
    id: 'advance',
    label: 'Advance',
    type: 'submenu',
    children: [
      { id: 'advance-advanced', label: 'Advanced', path: '/admin/advanced' },
      { id: 'advance-seo', label: 'SEO', path: '/admin/seo' },
      { id: 'advance-pages', label: 'Pages', path: '/admin/pages' },
      { id: 'advance-blog', label: 'Blog', path: '/admin/blogs' },
      { id: 'advance-menu', label: 'Menu', path: '/admin/menu' },
      { id: 'advance-notifications', label: 'Notifications', path: '/admin/notifications' },
      { id: 'advance-ai-conv', label: 'AI conversations', path: '/admin/ai-conversations' },
      { id: 'advance-health', label: 'Health scores', path: '/admin/health-scores' },
      { id: 'advance-drip', label: 'Drip campaigns', path: '/admin/drip-campaigns' },
      { id: 'advance-reseller-panels', label: 'Reseller panels', path: '/admin/reseller-panels' },
      { id: 'advance-reorder-alerts', label: 'Reorder alerts', path: '/admin/reorder-alerts' },
      { id: 'advance-gamification', label: 'Gamification', path: '/admin/gamification' },
      { id: 'advance-collab', label: 'Collab listings', path: '/admin/collab-listings' },
      { id: 'advance-invoices', label: 'Platform invoices', path: '/admin/platform-invoices' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    type: 'link',
    path: '/admin/settings',
  },
];

