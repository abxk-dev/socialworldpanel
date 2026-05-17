export const darkTheme = {
  name: 'dark',
  label: 'Dark Mode',

  '--bg-primary': '#060b14',
  '--bg-secondary': '#0a1628',
  '--bg-tertiary': '#0f1f35',
  '--bg-card': 'rgba(255,255,255,0.02)',
  '--bg-hover': 'rgba(0,210,255,0.05)',
  '--bg-active': 'rgba(0,210,255,0.1)',

  '--accent': '#00d2ff',
  '--accent-hover': '#00b8e0',
  '--accent-secondary': '#0070f3',
  '--accent-light': 'rgba(0,210,255,0.08)',
  '--accent-border': 'rgba(0,210,255,0.2)',
  '--accent-gradient': 'linear-gradient(135deg,#00d2ff,#0070f3)',

  '--text-primary': '#f1f5f9',
  '--text-secondary': '#94a3b8',
  '--text-muted': '#475569',
  '--text-disabled': '#334155',
  '--text-inverse': '#0f172a',

  '--border': 'rgba(255,255,255,0.07)',
  '--border-hover': 'rgba(255,255,255,0.12)',
  '--border-focus': 'rgba(0,210,255,0.4)',

  // Toggle styles
  '--toggle-off': '#1e293b',
  '--toggle-border': 'rgba(255,255,255,0.1)',

  '--success': '#10b981',
  '--success-bg': 'rgba(16,185,129,0.1)',
  '--warning': '#f59e0b',
  '--warning-bg': 'rgba(245,158,11,0.1)',
  '--error': '#ef4444',
  '--error-bg': 'rgba(239,68,68,0.1)',
  '--info': '#3b82f6',
  '--info-bg': 'rgba(59,130,246,0.1)',

  '--shadow-sm': '0 1px 3px rgba(0,0,0,0.4)',
  '--shadow-md': '0 4px 16px rgba(0,0,0,0.4)',
  '--shadow-lg': '0 8px 32px rgba(0,0,0,0.5)',
  '--shadow-accent': '0 4px 20px rgba(0,210,255,0.25)',
  '--shadow-card': '0 2px 8px rgba(0,0,0,0.3)',

  '--sidebar-bg': '#060b14',
  '--sidebar-border': 'rgba(0,210,255,0.08)',
  '--sidebar-text': '#475569',
  '--sidebar-active-bg': 'rgba(0,210,255,0.1)',
  '--sidebar-active-text': '#00d2ff',
  '--sidebar-active-border': 'rgba(0,210,255,0.2)',
  '--sidebar-hover-bg': 'rgba(0,210,255,0.05)',
  '--sidebar-section': '#1e293b',

  '--navbar-bg': 'rgba(6,11,20,0.95)',
  '--navbar-border': 'rgba(0,210,255,0.08)',
  '--navbar-text': '#f1f5f9',

  '--input-bg': 'rgba(255,255,255,0.04)',
  '--input-border': 'rgba(255,255,255,0.1)',
  '--input-border-focus': 'rgba(0,210,255,0.4)',
  '--input-text': '#f1f5f9',
  '--input-placeholder': '#334155',
  '--input-shadow-focus': '0 0 0 3px rgba(0,210,255,0.1)',

  '--card-bg': 'rgba(255,255,255,0.02)',
  '--card-border': 'rgba(255,255,255,0.06)',
  '--card-hover-border': 'rgba(0,210,255,0.25)',
  '--card-hover-bg': 'rgba(0,210,255,0.03)',
  '--card-radius': '16px',

  '--table-header-bg': 'rgba(0,210,255,0.06)',
  '--table-header-text': '#00d2ff',
  '--table-row-hover': 'rgba(0,210,255,0.03)',
  '--table-border': 'rgba(255,255,255,0.05)',
  '--table-stripe': 'rgba(255,255,255,0.01)',

  '--btn-primary-bg': 'linear-gradient(135deg,#00d2ff,#0070f3)',
  '--btn-primary-text': '#ffffff',
  '--btn-primary-shadow': '0 4px 15px rgba(0,210,255,0.3)',
  '--btn-primary-hover-shadow': '0 6px 25px rgba(0,210,255,0.5)',
  '--btn-secondary-bg': 'rgba(255,255,255,0.05)',
  '--btn-secondary-text': '#94a3b8',
  '--btn-secondary-border': 'rgba(255,255,255,0.1)',
  '--btn-ghost-text': '#00d2ff',
  '--btn-ghost-border': 'rgba(0,210,255,0.3)',
  '--btn-ghost-hover-bg': 'rgba(0,210,255,0.08)',

  '--badge-bg': 'rgba(0,210,255,0.1)',
  '--badge-border': 'rgba(0,210,255,0.2)',
  '--badge-text': '#00d2ff',

  '--modal-bg': '#0a1628',
  '--modal-border': 'rgba(255,255,255,0.08)',
  '--modal-overlay': 'rgba(0,0,0,0.7)',

  '--dropdown-bg': '#0f1f35',
  '--dropdown-border': 'rgba(255,255,255,0.08)',
  '--dropdown-item-hover': 'rgba(0,210,255,0.06)',

  '--tooltip-bg': '#1e293b',
  '--tooltip-text': '#f1f5f9',

  '--scrollbar-track': 'transparent',
  '--scrollbar-thumb': 'rgba(0,210,255,0.2)',
  '--scrollbar-hover': 'rgba(0,210,255,0.35)',

  '--divider': 'rgba(255,255,255,0.05)',

  '--stat-card-bg': 'rgba(255,255,255,0.02)',
  '--stat-card-border': 'rgba(255,255,255,0.06)',
  '--stat-value': '#f1f5f9',
  '--stat-label': '#475569',

  '--tag-bg': 'rgba(255,255,255,0.06)',
  '--tag-text': '#94a3b8',
  '--tag-border': 'rgba(255,255,255,0.1)',

  '--balance-bg': 'linear-gradient(135deg,rgba(0,210,255,0.08),rgba(0,112,243,0.08))',
  '--balance-border': 'rgba(0,210,255,0.15)',
  '--balance-value': '#00d2ff',

  // Loyalty tier palette (shared across light/dark)
  '--tier-bronze': '#cd7f32',
  '--tier-bronze-alpha': 'rgba(205,127,50,0.25)',
  '--tier-silver': '#c0c0c0',
  '--tier-silver-alpha': 'rgba(192,192,192,0.25)',
  '--tier-gold': '#ffd700',
  '--tier-gold-alpha': 'rgba(255,215,0,0.25)',
  '--tier-platinum': '#e5e4e2',
  '--tier-platinum-alpha': 'rgba(229,228,226,0.25)',

  // Spin wheel canvas helpers
  '--spinwheel-shadow-300': 'rgba(0,0,0,0.3)',
  '--spinwheel-shadow-350': 'rgba(0,0,0,0.35)',
  '--spinwheel-shadow-700': 'rgba(0,0,0,0.7)',
  '--spinwheel-highlight-200': 'rgba(255,255,255,0.2)',
  '--spinwheel-highlight-250': 'rgba(255,255,255,0.25)',
  '--spinwheel-text-shadow-700': 'rgba(0,0,0,0.7)',
  '--spinwheel-drop-400': 'rgba(0,0,0,0.4)',
  '--spinwheel-drop-350': 'rgba(0,0,0,0.35)',
  '--spinwheel-drop-white-200': 'rgba(255,255,255,0.2)',
  '--spinwheel-shadow-200': 'rgba(0,0,0,0.2)',
};

