/**
 * @file print-theme.ts
 * @description Centralized design tokens for the Premium Billing Output System.
 * Ensures consistent branding across Thermal Receipts and A4 Invoices.
 */

export const PRINT_THEME = {
  colors: {
    primary: '#0f172a', // Deep Navy (Bull Brand Primary)
    accent: '#10b981',  // Emerald Green (Success/Bull Accent)
    text: '#1e293b',    // Slate 800
    muted: '#64748b',   // Slate 500
    border: '#e2e8f0',  // Slate 200
    white: '#ffffff'
  },
  fonts: {
    sans: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
    mono: "'Inconsolata', 'IBM Plex Mono', monospace"
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  dimensions: {
    thermalWidth: '80mm',
    a4Width: '210mm',
    a4Height: '297mm'
  }
};
