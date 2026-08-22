/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./popup.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rsa: {
          navy: '#0c3c60',
          dark: '#08253d',
          gold: '#f59e0b',
        }
      }
    },
  },
  plugins: [],
}
