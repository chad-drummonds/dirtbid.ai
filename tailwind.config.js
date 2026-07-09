/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dirt: { 50: '#fdf8f0', 100: '#f5e6c8', 200: '#d4a853', 300: '#b8860b', 400: '#8B6914', 500: '#6B4F12', 600: '#4A3610', 700: '#3A2A0D', 800: '#2A1F0A', 900: '#1A1307' },
      },
    },
  },
  plugins: [],
};
