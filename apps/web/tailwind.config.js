/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#c084fc',
          DEFAULT: '#6b21a8', // Deep purple
          dark: '#4c1d95',
          navy: '#1e1b4b',
        },
        loy: {
          orange: '#f97316', // Medium-value discount
          green: '#22c55e',  // High-value rewards/cashback
          blue: '#3b82f6',   // Free item rewards
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 8px 30px rgb(0 0 0 / 0.12)',
        'premium-hover': '0 20px 40px rgb(0 0 0 / 0.16)',
      }
    },
  },
  plugins: [],
}
