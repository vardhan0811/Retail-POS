/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
        },
        background: '#F8FAFC',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        accent: '#2563EB',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
        info: '#2563EB',
      },
      textColor: {
        primary: '#0F172A',
        secondary: '#64748B',
        muted: '#6B7280',
      },
      borderRadius: {
        'pos-lg': '12px',
        'pos-md': '8px',
      },
      boxShadow: {
        'pos-subtle': '0 4px 12px rgba(0, 0, 0, 0.05)',
        'pos-strong': '0 10px 25px rgba(0, 0, 0, 0.1)',
        'pos-glow': '0 0 15px -3px rgba(37, 99, 235, 0.1)',
      }
    },
  },
  plugins: [],
}
